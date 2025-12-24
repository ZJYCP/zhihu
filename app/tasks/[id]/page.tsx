import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { ExportButtons } from "./export-buttons";
import { cache } from "react";
import type { Metadata } from "next";

// 启用动态缓存，页面在首次访问后会被缓存 60 秒
export const revalidate = 60;

// 使用 React cache 缓存数据库查询（同一请求内去重）
const getArticle = cache(async (id: string) => {
  return prisma.crawlTask.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      content: true,
      author: true,
      url: true,
      status: true,
      createdAt: true,
      // 不查询 html, content_preview, error 等不需要的字段
    },
  });
});

// 生成页面元数据
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const article = await getArticle(id);

  const title = article?.title || "文章详情";
  const description = article?.content?.slice(0, 150) || "查看文章详情";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      authors: article?.author ? [article.author] : undefined,
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await getArticle(id);

  if (!article || article.status !== "COMPLETED") {
    notFound();
  }

  return (
    <main className="container mx-auto max-w-3xl p-6">
      {/* 导航 */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        返回列表
      </Link>

      {/* 标题 */}
      <h1 className="text-3xl font-bold mb-4 leading-tight">
        {article.title || "无标题"}
      </h1>

      {/* 元信息 */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-[hsl(var(--muted-foreground))] mb-6">
        {article.author && <span>{article.author}</span>}
        {article.author && <span>·</span>}
        <span>{article.createdAt.toLocaleDateString("zh-CN")}</span>
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
