"use client";

import { useCallback, useEffect, useState } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { ExternalLink, AlertTriangle, Loader2, MessageSquare, Send, X } from "lucide-react";
import { ExportButtons } from "./-export-buttons";
import { BackButton } from "./-back-button";
import { RecrawlButton } from "./-recrawl-button";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost } from "@/lib/api-client";
import { getArticleForDetail } from "./-article.functions";
import { toast } from "sonner";

interface Article {
  id: string;
  title: string | null;
  content: string | null;
  author: string | null;
  url: string;
  status: string;
  createdAt: string;
  fontDecodeSuccess: boolean | null;
}

const FEEDBACK_TYPE_LABELS = {
  INCOMPLETE_CONTENT: "内容不完整",
  GARBLED_TEXT: "内容乱码",
  MISSING_IMAGE: "图片缺失",
  OTHER: "其他",
} as const;

type FeedbackType = keyof typeof FEEDBACK_TYPE_LABELS;

export const Route = createFileRoute("/tasks/$id/")({
  loader: ({ params }) => getArticleForDetail({ data: { id: params.id } }),
  head: ({ loaderData }) => {
    const title = loaderData?.title || "文章详情";
    const description = loaderData?.content?.slice(0, 150) || "查看文章详情";

    return {
      meta: [
        { title: `${title} | 拾盐记` },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        ...(loaderData?.author
          ? [{ property: "article:author", content: loaderData.author }]
          : []),
      ],
    };
  },
  component: ArticlePage,
});

function ArticlePage() {
  const { id } = Route.useParams();
  const initialArticle = Route.useLoaderData();
  const [article, setArticle] = useState<Article | null>(initialArticle);
  const [loading, setLoading] = useState(false);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("INCOMPLETE_CONTENT");
  const [feedbackContent, setFeedbackContent] = useState("");
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const fetchArticle = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMissing(false);

    try {
      const result = await apiGet<Article>(`/api/tasks/${id}`, false);

      if (!result.success) {
        if (result.status === 404 || result.code === "NOT_FOUND") {
          setMissing(true);
        } else {
          setError(result.error || "加载文章失败");
        }
        return;
      }

      if (result.data.status !== "COMPLETED") {
        setMissing(true);
        return;
      }

      setArticle(result.data);
    } catch (fetchError: unknown) {
      setError(fetchError instanceof Error ? fetchError.message : "加载文章失败");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setArticle(initialArticle);
    setMissing(false);
    setError(null);
    setLoading(false);
  }, [initialArticle]);

  useEffect(() => {
    if (!feedbackOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFeedbackOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [feedbackOpen]);

  if (missing) {
    throw notFound({ data: "文章不存在" });
  }

  if (loading) {
    return (
      <main className="container mx-auto max-w-3xl p-6">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto max-w-3xl p-6">
        <BackButton />
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            加载文章失败
          </div>
          <p className="mt-2 text-sm">{error}</p>
          <button
            type="button"
            onClick={fetchArticle}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            重试
          </button>
        </div>
      </main>
    );
  }

  if (!article) {
    return null;
  }

  return (
    <main className="container mx-auto max-w-3xl p-6">
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between mb-6">
        <BackButton />
        <RecrawlButton taskId={article.id} onRecrawled={fetchArticle} />
      </div>

      {/* 字体解码失败警告 */}
      {article.fontDecodeSuccess === false && (
        <div className="flex items-center gap-2 p-4 mb-6 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>字体解码失败，文章内容可能存在乱码，请查看原文获取完整内容。</span>
        </div>
      )}

      {/* 标题 */}
      <h1 className="text-3xl font-bold mb-4 leading-tight">
        {article.title || "无标题"}
      </h1>

      {/* 元信息 */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-[hsl(var(--muted-foreground))] mb-6">
        {article.author && <span>{article.author}</span>}
        {article.author && <span>·</span>}
        <span>{new Date(article.createdAt).toLocaleDateString("zh-CN")}</span>
        {article.url.startsWith("http") && (
          <>
            <span>·</span>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-500 hover:underline"
            >
              查看原文
              <ExternalLink className="h-3 w-3" />
            </a>
          </>
        )}
      </div>

      {/* 分割线 */}
      <hr className="mb-8" />

      {/* 正文 */}
      <article className="prose prose-neutral max-w-none leading-relaxed">
        {article.content?.split("\n").map((paragraph, i) => {
          const trimmed = paragraph.trim();
          if (!trimmed) return null;
          return (
            <p key={i} className="mb-6 text-base leading-[1.8]">
              {trimmed}
            </p>
          );
        })}
      </article>

      {/* 文章操作 */}
      <div className="mt-12 pt-8 border-t space-y-6">
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          <ExportButtons
            title={article.title || "无标题"}
            author={article.author}
            url={article.url}
            content={article.content || ""}
          />
          <Button
            type="button"
            data-feedback-action
            onClick={() => setFeedbackOpen(true)}
            className="shrink-0 whitespace-nowrap border border-amber-200 bg-amber-50 text-amber-700 shadow-sm hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/70"
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            反馈问题
          </Button>
        </div>
      </div>

      {feedbackOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setFeedbackOpen(false);
            }
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-dialog-title"
            className="w-full max-w-md rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xl"
            onSubmit={async (event) => {
              event.preventDefault();
              const content = feedbackContent.trim();
              if (!content) {
                setFeedbackError("请填写反馈说明");
                return;
              }

              setFeedbackError(null);
              setSubmittingFeedback(true);
              const result = await apiPost(`/api/tasks/${id}/feedback`, {
                type: feedbackType,
                content,
              });
              setSubmittingFeedback(false);

              if (result.success) {
                setFeedbackContent("");
                setFeedbackType("INCOMPLETE_CONTENT");
                setFeedbackOpen(false);
                toast.success("反馈已提交");
              }
            }}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="feedback-dialog-title" className="text-lg font-semibold">
                  反馈文章问题
                </h2>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                  说明这篇文章存在的问题，管理员会在后台查看处理。
                </p>
              </div>
              <button
                type="button"
                aria-label="关闭反馈弹窗"
                onClick={() => setFeedbackOpen(false)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">问题类型</label>
                <select
                  value={feedbackType}
                  onChange={(event) =>
                    setFeedbackType(event.target.value as FeedbackType)
                  }
                  className="mt-2 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                >
                  {Object.entries(FEEDBACK_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">反馈说明</label>
                <textarea
                  value={feedbackContent}
                  onChange={(event) => setFeedbackContent(event.target.value)}
                  maxLength={1000}
                  placeholder="请描述这篇文章存在的问题，方便管理员处理。"
                  className="mt-2 h-28 w-full resize-none rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                />
                {feedbackError && (
                  <p className="mt-2 text-sm text-red-500">{feedbackError}</p>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={submittingFeedback}
                  onClick={() => setFeedbackOpen(false)}
                >
                  取消
                </Button>
                <Button type="submit" disabled={submittingFeedback}>
                  <Send className="mr-2 h-4 w-4" />
                  {submittingFeedback ? "提交中..." : "提交反馈"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
