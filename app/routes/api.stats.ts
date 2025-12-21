import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { crawlTasks } from "~/db/schema";
import { eq, and, gte, count, desc } from "drizzle-orm";

// GET /api/stats - 获取统计数据
export async function loader({ context }: LoaderFunctionArgs) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    [{ totalArticles }],
    [{ weekArticles }],
    [{ monthArticles }],
    [{ failedTasks }],
    recentArticles,
    weekArticlesData,
  ] = await Promise.all([
    context.db.select({ totalArticles: count() }).from(crawlTasks).where(eq(crawlTasks.status, "COMPLETED")),
    context.db.select({ weekArticles: count() }).from(crawlTasks).where(and(eq(crawlTasks.status, "COMPLETED"), gte(crawlTasks.createdAt, weekAgo))),
    context.db.select({ monthArticles: count() }).from(crawlTasks).where(and(eq(crawlTasks.status, "COMPLETED"), gte(crawlTasks.createdAt, monthAgo))),
    context.db.select({ failedTasks: count() }).from(crawlTasks).where(eq(crawlTasks.status, "FAILED")),
    context.db.select({ id: crawlTasks.id, title: crawlTasks.title, createdAt: crawlTasks.createdAt }).from(crawlTasks).where(eq(crawlTasks.status, "COMPLETED")).orderBy(desc(crawlTasks.createdAt)).limit(5),
    context.db.select({ createdAt: crawlTasks.createdAt }).from(crawlTasks).where(and(eq(crawlTasks.status, "COMPLETED"), gte(crawlTasks.createdAt, weekAgo))),
  ]);

  // 手动按天分组
  const dailyMap = new Map<string, number>();
  weekArticlesData.forEach((item) => {
    const date = new Date(item.createdAt).toISOString().split("T")[0];
    dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
  });

  const dailyStats = Array.from(dailyMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return json({
    totalArticles,
    weekArticles,
    monthArticles,
    failedTasks,
    recentArticles,
    dailyStats,
  });
}
