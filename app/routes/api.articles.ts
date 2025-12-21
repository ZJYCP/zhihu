import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { crawlTasks } from "~/db/schema";
import { desc, eq, and, gte, like, or, sql, count } from "drizzle-orm";

// GET /api/articles - 获取已完成的文章列表
export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const search = url.searchParams.get("search") || "";

  const baseWhere = eq(crawlTasks.status, "COMPLETED");

  const where = search
    ? and(
        baseWhere,
        or(
          like(crawlTasks.title, `%${search}%`),
          like(crawlTasks.content, `%${search}%`)
        )
      )
    : baseWhere;

  const [articles, [{ total }]] = await Promise.all([
    context.db
      .select({
        id: crawlTasks.id,
        title: crawlTasks.title,
        author: crawlTasks.author,
        content: crawlTasks.content,
        url: crawlTasks.url,
        createdAt: crawlTasks.createdAt,
      })
      .from(crawlTasks)
      .where(where)
      .orderBy(desc(crawlTasks.createdAt))
      .offset((page - 1) * limit)
      .limit(limit),
    context.db
      .select({ total: count() })
      .from(crawlTasks)
      .where(where),
  ]);

  return json({
    articles,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
