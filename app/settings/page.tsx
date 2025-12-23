"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/components/theme-provider";
import {
  Sun,
  Moon,
  Monitor,
  Trash2,
  Download,
  AlertTriangle,
} from "lucide-react";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [exportLoading, setExportLoading] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [stats, setStats] = useState({ total: 0, failed: 0 });

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        setStats({
          total: data.totalArticles,
          failed: data.failedTasks,
        });
      });
  }, []);

  const exportAllArticles = async () => {
    setExportLoading(true);
    try {
      const res = await fetch("/api/articles?page=1&limit=1000");
      const data = await res.json();

      const content = data.articles
        .map(
          (a: { title: string; url: string; content: string }) =>
            `# ${a.title}\n\n原文: ${a.url}\n\n${a.content}\n\n---\n`
        )
        .join("\n");

      const blob = new Blob([content], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `拾盐记内容导出_${new Date().toISOString().split("T")[0]}.md`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportLoading(false);
    }
  };

  const clearFailedTasks = async () => {
    await fetch("/api/tasks/clear-failed", { method: "DELETE" });
    setStats((prev) => ({ ...prev, failed: 0 }));
    setClearConfirm(false);
  };

  return (
    <main className="container mx-auto max-w-4xl p-6">
      <h1 className="text-3xl font-bold mb-8">设置</h1>

      <div className="space-y-6">
        {/* 外观设置 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">外观</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                选择界面主题
              </p>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  onClick={() => setTheme("light")}
                  className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4"
                >
                  <Sun className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">浅色</span>
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  onClick={() => setTheme("dark")}
                  className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4"
                >
                  <Moon className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">深色</span>
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  onClick={() => setTheme("system")}
                  className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4"
                >
                  <Monitor className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">跟随系统</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 数据管理 */}
        {/* <Card>
          <CardHeader>
            <CardTitle className="text-lg">数据管理</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-[hsl(var(--muted))]">
              <div>
                <p className="font-medium">导出所有文章</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  将 {stats.total} 篇文章导出为 Markdown 文件
                </p>
              </div>
              <Button onClick={exportAllArticles} disabled={exportLoading}>
                <Download className="h-4 w-4 mr-2" />
                {exportLoading ? "导出中..." : "导出"}
              </Button>
            </div>

            {stats.failed > 0 && (
              <div className="flex items-center justify-between p-4 rounded-lg bg-red-50 dark:bg-red-950">
                <div>
                  <p className="font-medium text-red-600">清理失败任务</p>
                  <p className="text-sm text-red-500">
                    有 {stats.failed} 个失败任务可以清理
                  </p>
                </div>
                {clearConfirm ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setClearConfirm(false)}
                    >
                      取消
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={clearFailedTasks}
                    >
                      确认清理
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setClearConfirm(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    清理
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card> */}

        {/* 关于 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">关于</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
              <p>拾盐记 v1.0</p>
              <p>基于 Next.js 15 + Prisma + PostgreSQL 构建</p>
            </div>
          </CardContent>
        </Card>

        {/* 免责声明 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              免责声明
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-[hsl(var(--muted-foreground))]">
              <p>
                本工具仅供个人学习和研究使用，请勿用于任何商业用途。
              </p>
              <p>
                用户在使用本工具时应遵守相关法律法规，尊重原创作者的知识产权。所采集的内容版权归原作者所有。
              </p>
              <p>
                本工具不对用户的任何行为承担责任，因使用本工具产生的任何法律纠纷由用户自行承担。
              </p>
              <p>
                如有侵权，请联系删除。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
