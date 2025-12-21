import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, Link } from "@remix-run/react";
import { crawlTasks } from "~/db/schema";
import { eq } from "drizzle-orm";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { ExportButtons } from "~/components/export-buttons";

export async function loader({ params, context }: LoaderFunctionArgs) {
  const { id } = params;
  if (!id) throw new Response("Not Found", { status: 404 });

  const [article] = await context.db
    .select()
    .from(crawlTasks)
    .where(eq(crawlTasks.id, id));

  if (!article || article.status !== "COMPLETED") {
    throw new Response("Not Found", { status: 404 });
  }

  return json({ article });
}

export default function ArticlePage() {
  const { article } = useLoaderData<typeof loader>();

  return (
    <main className="container mx-auto max-w-3xl p-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        返回列表
      </Link>

      <h1 className="text-3xl font-bold mb-4 leading-tight">
        {article.title || "无标题"}
      </h1>

      <div className="flex flex-wrap items-center gap-3 text-sm text-[hsl(var(--muted-foreground))] mb-6">
        {article.author && <span>{article.author}</span>}
        {article.author && <span>·</span>}
        <span>{new Date(article.createdAt).toLocaleDateString("zh-CN")}</span>
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
      </div>

      <hr className="mb-8" />

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
