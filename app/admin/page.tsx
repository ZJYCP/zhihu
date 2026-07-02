import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, FileText, Lock, MessageSquare } from "lucide-react";
import { apiPost } from "@/lib/client/api-client";
import { ArticleManager } from "./-article-manager";
import { FeedbackManager } from "./-feedback-manager";
import { SettingsManager } from "./-settings-manager";

interface AuthResponse {
  token: string;
}

const AUTH_KEY = "admin_token";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "管理后台 | 拾盐记" },
      { name: "description", content: "拾盐记内容采集管理后台" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"articles" | "feedback" | "settings">("articles");

  // 检查是否已登录
  useEffect(() => {
    const token = localStorage.getItem(AUTH_KEY);
    if (token) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = await apiPost<AuthResponse>("/api/admin/auth", { password }, false);

    if (result.success && result.data.token) {
      localStorage.setItem(AUTH_KEY, result.data.token);
      setIsAuthenticated(true);
    } else {
      setError(result.success ? "登录失败" : result.error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_KEY);
    setIsAuthenticated(false);
    setPassword("");
  };

  // 加载中
  if (loading) {
    return (
      <main className="container mx-auto max-w-6xl p-6">
        <p className="text-[hsl(var(--muted-foreground))]">加载中...</p>
      </main>
    );
  }

  // 未登录，显示登录界面
  if (!isAuthenticated) {
    return (
      <main className="container mx-auto max-w-md p-6 min-h-[60vh] flex items-center">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="h-4 w-4" />
              管理后台
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="请输入管理密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
              <Button type="submit" className="w-full">
                登录
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-6xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">管理后台</h1>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          退出登录
        </Button>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === "articles" ? "default" : "outline"}
          onClick={() => setActiveTab("articles")}
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          文章管理
        </Button>
        <Button
          variant={activeTab === "settings" ? "default" : "outline"}
          onClick={() => setActiveTab("settings")}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          系统设置
        </Button>
        <Button
          variant={activeTab === "feedback" ? "default" : "outline"}
          onClick={() => setActiveTab("feedback")}
          className="gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          反馈管理
        </Button>
      </div>

      {activeTab === "articles" && <ArticleManager />}
      {activeTab === "feedback" && <FeedbackManager />}
      {activeTab === "settings" && <SettingsManager />}
    </main>
  );
}
