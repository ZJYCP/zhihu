"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, Trash2, ExternalLink } from "lucide-react";

interface Task {
  id: string;
  url: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  title: string | null;
  content: string | null;
  error: string | null;
  createdAt: string;
}

const statusMap = {
  PENDING: { label: "等待中", color: "bg-gray-500" },
  RUNNING: { label: "运行中", color: "bg-blue-500" },
  COMPLETED: { label: "完成", color: "bg-green-500" },
  FAILED: { label: "失败", color: "bg-red-500" },
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [crawling, setCrawling] = useState<string | null>(null);

  const fetchTasks = async () => {
    const res = await fetch("/api/tasks");
    const data = await res.json();
    setTasks(data);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const createTask = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const task = await res.json();
      setTasks((prev) => [task, ...prev]);
      setUrl("");
    } finally {
      setLoading(false);
    }
  };

  const startCrawl = async (taskId: string) => {
    setCrawling(taskId);
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: "RUNNING" } : t))
    );
    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      const updated = await res.json();
      if (res.ok) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      } else {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, status: "FAILED", error: updated.error } : t
          )
        );
      }
    } finally {
      setCrawling(null);
    }
  };

  const deleteTask = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  return (
    <main className="container mx-auto max-w-4xl p-6">
      <h1 className="text-3xl font-bold mb-8">知乎爬虫</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">新建任务</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="输入知乎付费专栏 URL..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createTask()}
            />
            <Button onClick={createTask} disabled={loading || !url.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "添加"}
            </Button>
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2">
            支持格式: https://www.zhihu.com/market/paid_column/xxx/section/xxx
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {tasks.map((task) => (
          <Card key={task.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${statusMap[task.status].color}`}
                    />
                    <span className="text-sm text-[hsl(var(--muted-foreground))]">
                      {statusMap[task.status].label}
                    </span>
                  </div>
                  <h3 className="font-medium truncate">
                    {task.title || task.url}
                  </h3>
                  {task.error && (
                    <p className="text-sm text-red-500 mt-1">{task.error}</p>
                  )}
                  {task.content && (
                    <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2 line-clamp-2">
                      {task.content.slice(0, 200)}...
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {task.status === "PENDING" && (
                    <Button
                      size="sm"
                      onClick={() => startCrawl(task.id)}
                      disabled={crawling === task.id}
                    >
                      {crawling === task.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "开始爬取"
                      )}
                    </Button>
                  )}
                  {task.status === "COMPLETED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/tasks/${task.id}`, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteTask(task.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {tasks.length === 0 && (
          <p className="text-center text-[hsl(var(--muted-foreground))] py-8">
            暂无任务，请添加知乎 URL 开始爬取
          </p>
        )}
      </div>
    </main>
  );
}
