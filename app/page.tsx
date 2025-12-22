"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  Trash2,
  Search,
  FileText,
  RefreshCw,
  X,
  TrendingUp,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Article {
  id: string;
  title: string | null;
  author: string | null;
  content_preview: string | null;
  url: string;
  createdAt: string;
}

interface Task {
  id: string;
  url: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  error: string | null;
  createdAt: string;
}

interface Stats {
  totalArticles: number;
  weekArticles: number;
}

function isZhihuUrl(text: string): boolean {
  return /zhihu\.com\/market\/paid_column\/\d+\/section\/\d+/.test(text);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Home() {
  const [input, setInput] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const isUrl = isZhihuUrl(input);

  // 获取统计数据
  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/stats");
    const data = await res.json();
    setStats({ totalArticles: data.totalArticles, weekArticles: data.weekArticles });
  }, []);

  // 获取文章列表
  const fetchArticles = useCallback(async (p: number, search: string) => {
    setSearching(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "20" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/articles?${params}`);
      const data = await res.json();
      setArticles(data.articles);
      setTotalPages(data.totalPages);
      setTotal(data.total);
      setPage(p);
    } finally {
      setSearching(false);
    }
  }, []);

  // 获取进行中的任务
  const fetchTasks = useCallback(async () => {
    const res = await fetch("/api/tasks?status=active");
    const data = await res.json();
    setTasks(data.filter((t: Task) => t.status === "RUNNING" || t.status === "FAILED"));
  }, []);

  useEffect(() => {
    fetchArticles(1, "");
    fetchTasks();
    fetchStats();
  }, [fetchArticles, fetchTasks, fetchStats]);

  // 搜索防抖
  useEffect(() => {
    if (!isUrl && input && input === searchQuery) return;
    if (isUrl) return;

    const timer = setTimeout(() => {
      if (!isUrl && input !== searchQuery) {
        setSearchQuery(input);
        fetchArticles(1, input);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [input, isUrl, searchQuery, fetchArticles]);

  // 提交操作
  const handleSubmit = async () => {
    if (!input.trim()) return;

    if (isUrl) {
      setLoading(true);
      try {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: input }),
        });
        const task = await res.json();
        setInput("");
        setTasks((prev) => [{ ...task, status: "RUNNING" }, ...prev]);
        const crawlRes = await fetch("/api/crawl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId: task.id }),
        });
        if (crawlRes.ok) {
          fetchArticles(1, searchQuery);
          fetchStats();
          setTasks((prev) => prev.filter((t) => t.id !== task.id));
        } else {
          const err = await crawlRes.json();
          setTasks((prev) =>
            prev.map((t) =>
              t.id === task.id ? { ...t, status: "FAILED", error: err.error } : t
            )
          );
        }
      } finally {
        setLoading(false);
      }
    } else {
      setSearchQuery(input);
      fetchArticles(1, input);
    }
  };

  const retryTask = async (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: "RUNNING", error: null } : t))
    );
    const res = await fetch("/api/crawl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId }),
    });
    if (res.ok) {
      fetchArticles(1, searchQuery);
      fetchStats();
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } else {
      const err = await res.json();
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: "FAILED", error: err.error } : t
        )
      );
    }
  };

  const deleteTask = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const deleteArticle = async (id: string) => {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    setArticles((prev) => prev.filter((a) => a.id !== id));
    setTotal((prev) => prev - 1);
    if (stats) setStats({ ...stats, totalArticles: stats.totalArticles - 1 });
  };

  return (
    <main className="container mx-auto max-w-6xl px-4 py-6">
      {/* 统计摘要 */}
      {stats && !searchQuery && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">文章总数</p>
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{stats.totalArticles}</p>
                </div>
                <FileText className="h-10 w-10 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">本周新增</p>
                  <p className="text-3xl font-bold text-green-700 dark:text-green-300">{stats.weekArticles}</p>
                </div>
                <TrendingUp className="h-10 w-10 text-green-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 智能搜索框 */}
      <Card className="mb-6 shadow-sm">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <Input
                className="pl-10 h-11"
                placeholder="输入知乎 URL 爬取，或输入关键词搜索..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={loading || !input.trim()}
              className={`h-11 px-6 ${isUrl ? "bg-blue-600 hover:bg-blue-700" : ""}`}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isUrl ? (
                "爬取"
              ) : (
                "搜索"
              )}
            </Button>
          </div>
          {isUrl && (
            <p className="text-xs text-blue-600 mt-2">
              检测到知乎 URL，点击"爬取"开始采集内容
            </p>
          )}
        </CardContent>
      </Card>

      {/* 进行中的任务 */}
      {tasks.length > 0 && (
        <div className="mb-6 space-y-3">
          {tasks.map((task) => (
            <Card
              key={task.id}
              className={task.status === "FAILED" ? "border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800" : "border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800"}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {task.status === "RUNNING" ? (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      ) : (
                        <span className="text-red-600 text-sm">失败</span>
                      )}
                      <span className="text-sm truncate">{task.url}</span>
                    </div>
                    {task.error && (
                      <p className="text-sm text-red-600">{task.error}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {task.status === "FAILED" && (
                      <Button size="sm" variant="outline" onClick={() => retryTask(task.id)}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => deleteTask(task.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 搜索结果提示 */}
      {searchQuery && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            搜索 &quot;{searchQuery}&quot; 找到 {total} 篇文章
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setInput("");
              setSearchQuery("");
              fetchArticles(1, "");
            }}
          >
            清除搜索
          </Button>
        </div>
      )}

      {/* 列表标题 */}
      {!searchQuery && articles.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <h2 className="text-sm font-medium text-[hsl(var(--muted-foreground))]">最近采集</h2>
        </div>
      )}

      {/* 文章列表 */}
      {searching ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
        </div>
      ) : articles.length > 0 ? (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {articles.map((article) => (
              <Link key={article.id} href={`/tasks/${article.id}`}>
                <Card className="h-full group cursor-pointer overflow-hidden border-transparent bg-[hsl(var(--muted))]/30 hover:bg-[hsl(var(--muted))]/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="p-5 flex flex-col h-full">
                    {/* 顶部装饰条 */}
                    <div className="h-1 w-12 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 mb-4 group-hover:w-20 transition-all duration-300" />

                    <h3 className="font-semibold line-clamp-2 mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-relaxed">
                      {article.title || "无标题"}
                    </h3>

                    <p className="text-sm text-[hsl(var(--muted-foreground))] line-clamp-3 flex-1 mb-4 leading-relaxed">
                      {article.content_preview?.slice(0, 120)}...
                    </p>

                    <div className="flex items-center gap-3 pt-3 border-t border-[hsl(var(--border))]/50">
                      {article.author && (
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                            <span className="text-xs text-white font-medium">
                              {article.author.charAt(0)}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-[hsl(var(--foreground))]/80">
                            {article.author}
                          </span>
                        </div>
                      )}
                      <span className="text-xs text-[hsl(var(--muted-foreground))] ml-auto">
                        {formatDate(article.createdAt)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 pt-8">
              <Button
                variant="ghost"
                size="sm"
                disabled={page === 1}
                onClick={() => fetchArticles(page - 1, searchQuery)}
                className="rounded-full px-4"
              >
                上一页
              </Button>
              <div className="flex items-center gap-1 mx-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => fetchArticles(pageNum, searchQuery)}
                      className={cn(
                        "h-8 w-8 rounded-full text-sm font-medium transition-all",
                        page === pageNum
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                          : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={page === totalPages}
                onClick={() => fetchArticles(page + 1, searchQuery)}
                className="rounded-full px-4"
              >
                下一页
              </Button>
            </div>
          )}

          <p className="text-center text-sm text-[hsl(var(--muted-foreground))] pt-4">
            共 {total} 篇文章
          </p>
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center">
            <FileText className="h-10 w-10 text-[hsl(var(--muted-foreground))]" />
          </div>
          <p className="text-lg font-medium mb-2">
            {searchQuery ? "未找到匹配的文章" : "暂无保存的文章"}
          </p>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
            {searchQuery ? "尝试其他关键词" : "输入知乎 URL 开始采集内容"}
          </p>
          {!searchQuery && (
            <div className="text-xs text-[hsl(var(--muted-foreground))] max-w-md mx-auto p-4 rounded-lg bg-[hsl(var(--muted))]">
              <p className="font-medium mb-2">支持的 URL 格式：</p>
              <code className="text-blue-600 dark:text-blue-400">
                https://www.zhihu.com/market/paid_column/xxx/section/xxx
              </code>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
