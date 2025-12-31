"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  TrendingUp,
  Calendar,
  AlertCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { apiGet } from "@/lib/api-client";

interface Stats {
  totalArticles: number;
  weekArticles: number;
  monthArticles: number;
  failedTasks: number;
  recentArticles: { id: string; title: string; createdAt: string }[];
  dailyStats: { date: string; count: number }[];
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  description?: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            {trend === "up" && <span className="text-green-500">↑ </span>}
            {trend === "down" && <span className="text-red-500">↓ </span>}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SimpleBarChart({ data }: { data: { date: string; count: number }[] }) {
  const days = ["日", "一", "二", "三", "四", "五", "六"];

  // 填充最近7天
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    // API 返回的 date 是 ISO 格式，需要截取日期部分比较
    const found = data.find((d) => d.date.split("T")[0] === dateStr);
    last7Days.push({
      date: dateStr,
      count: found?.count || 0,
      day: days[date.getDay()],
    });
  }

  const maxCount = Math.max(...last7Days.map((d) => d.count), 1);

  return (
    <div className="flex items-end justify-between gap-2 h-32">
      {last7Days.map((item) => (
        <div key={item.date} className="flex-1 flex flex-col items-center gap-2">
          <div className="w-full flex flex-col items-center">
            <span className="text-xs text-[hsl(var(--muted-foreground))] mb-1">
              {item.count}
            </span>
            <div
              className="w-full bg-blue-500 rounded-t transition-all"
              style={{
                height: `${Math.max((item.count / maxCount) * 80, 4)}px`,
              }}
            />
          </div>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            {item.day}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Stats>("/api/stats", false).then((result) => {
      if (result.success) {
        setStats(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <main className="container mx-auto max-w-6xl p-6">
        <h1 className="text-3xl font-bold mb-8">统计</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-[hsl(var(--muted))] rounded w-1/2 mb-4" />
                <div className="h-8 bg-[hsl(var(--muted))] rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto max-w-6xl p-6">
        <h1 className="text-3xl font-bold mb-8">统计</h1>
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <p className="text-lg font-medium mb-2">加载失败</p>
            <p className="text-[hsl(var(--muted-foreground))]">{error}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!stats) return null;

  return (
    <main className="container mx-auto max-w-6xl p-6">
      <h1 className="text-3xl font-bold mb-8">统计</h1>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="文章总数"
          value={stats.totalArticles}
          icon={FileText}
        />
        <StatCard
          title="本周新增"
          value={stats.weekArticles}
          icon={TrendingUp}
          description="最近 7 天"
          trend={stats.weekArticles > 0 ? "up" : "neutral"}
        />
        <StatCard
          title="本月新增"
          value={stats.monthArticles}
          icon={Calendar}
          description="最近 30 天"
        />
        <StatCard
          title="失败任务"
          value={stats.failedTasks}
          icon={AlertCircle}
          description={stats.failedTasks > 0 ? "需要处理" : "一切正常"}
          trend={stats.failedTasks > 0 ? "down" : "neutral"}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 每日趋势 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">每日采集趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart data={stats.dailyStats} />
          </CardContent>
        </Card>

        {/* 最近文章 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-4 w-4" />
              最近采集
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentArticles.length > 0 ? (
              <div className="space-y-3">
                {stats.recentArticles.map((article) => (
                  <Link
                    key={article.id}
                    href={`/tasks/${article.id}`}
                    className="block p-3 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
                  >
                    <p className="font-medium line-clamp-1">
                      {article.title || "无标题"}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                      {new Date(article.createdAt).toLocaleString("zh-CN")}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-[hsl(var(--muted-foreground))] text-center py-8">
                暂无文章
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
