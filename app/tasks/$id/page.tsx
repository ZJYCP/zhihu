"use client";

import { useCallback, useEffect, useState } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { ExternalLink, AlertTriangle, Loader2 } from "lucide-react";
import { ExportButtons } from "./-export-buttons";
import { BackButton } from "./-back-button";
import { RecrawlButton } from "./-recrawl-button";
import { apiGet } from "@/lib/api-client";

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

export const Route = createFileRoute("/tasks/$id/")({
  component: ArticlePage,
});

function ArticlePage() {
  const { id } = Route.useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchArticle = useCallback(async (cancelled?: () => boolean) => {
    setLoading(true);
    setError(null);
    setMissing(false);

    try {
      const result = await apiGet<Article>(`/api/tasks/${id}`, false);
      if (cancelled?.()) return;

      if (!result.success) {
        setMissing(true);
        setError(result.error);
        return;
      }

      if (result.data.status !== "COMPLETED") {
        setMissing(true);
        return;
      }

      setArticle(result.data);
    } catch (fetchError: unknown) {
      if (cancelled?.()) return;
      setMissing(true);
      setError(fetchError instanceof Error ? fetchError.message : "加载文章失败");
    } finally {
      if (!cancelled?.()) {
        setLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    fetchArticle(() => cancelled);

    return () => {
      cancelled = true;
    };
  }, [fetchArticle]);

  if (missing) {
    throw notFound({ data: error || "文章不存在" });
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

      {/* 导出按钮 */}
      <div className="mt-12 pt-8 border-t">
        <ExportButtons
          title={article.title || "无标题"}
          author={article.author}
          url={article.url}
          content={article.content || ""}
        />
      </div>
    </main>
  );
}
