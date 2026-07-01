"use client";

import { useCallback, useEffect, useState } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { ExternalLink, AlertTriangle, Loader2 } from "lucide-react";
import { ExportButtons } from "./-export-buttons";
import { BackButton } from "./-back-button";
import { RecrawlButton } from "./-recrawl-button";
import { apiGet } from "@/lib/api-client";
import { getArticleForDetail } from "./-article.functions";

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
