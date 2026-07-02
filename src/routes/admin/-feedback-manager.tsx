import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPut } from "@/lib/client/api-client";
import { FEEDBACK_TYPE_LABELS } from "@/lib/shared/types";
import type {
  FeedbackItem,
  FeedbackListResponse as FeedbackResponse,
  FeedbackStatus,
} from "@/lib/shared/types";

export function FeedbackManager() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState<FeedbackStatus | "">("OPEN");

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
    });
    if (status) params.set("status", status);

    const result = await apiGet<FeedbackResponse>(
      `/api/admin/feedback?${params}`,
      false
    );
    if (result.success) {
      setFeedback(result.data.feedback);
      setTotalPages(result.data.totalPages);
    }
    setLoading(false);
  }, [page, status]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const markResolved = async (id: string) => {
    const result = await apiPut(`/api/admin/feedback/${id}`, {
      status: "RESOLVED",
    });
    if (result.success) {
      toast.success("反馈已标记为已处理");
      fetchFeedback();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">反馈管理</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as FeedbackStatus | "");
              setPage(1);
            }}
            className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
          >
            <option value="">全部反馈</option>
            <option value="OPEN">待处理</option>
            <option value="RESOLVED">已处理</option>
          </select>
          <Button variant="outline" onClick={fetchFeedback} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="space-y-3">
          {feedback.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-[hsl(var(--border))] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        item.status === "OPEN"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                          : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      }`}
                    >
                      {item.status === "OPEN" ? "待处理" : "已处理"}
                    </span>
                    <span className="rounded bg-[hsl(var(--muted))] px-2 py-0.5 text-xs">
                      {FEEDBACK_TYPE_LABELS[item.type]}
                    </span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      {new Date(item.createdAt).toLocaleString("zh-CN")}
                    </span>
                  </div>
                  <p className="font-medium line-clamp-1">
                    {item.task.title || item.task.url}
                  </p>
                  {item.task.author && (
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {item.task.author}
                    </p>
                  )}
                </div>
                {item.status === "OPEN" && (
                  <Button size="sm" onClick={() => markResolved(item.id)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    标记已处理
                  </Button>
                )}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-[hsl(var(--foreground))]">
                {item.content}
              </p>
            </div>
          ))}
        </div>

        {!loading && feedback.length === 0 && (
          <p className="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
            暂无反馈
          </p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">
            第 {page} / {totalPages} 页
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
