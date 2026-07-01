import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonResponse } from "@/lib/api-response";

const STATS_CACHE_TTL_MS = 60_000;
let statsCache:
  | {
      expiresAt: number;
      data: Awaited<ReturnType<typeof loadStats>>;
    }
  | null = null;

async function loadStats() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalArticles,
    weekArticles,
    monthArticles,
    failedTasks,
    recentArticles,
  ] = await Promise.all([
    prisma.crawlTask.count({ where: { status: "COMPLETED" } }),
    prisma.crawlTask.count({
      where: { status: "COMPLETED", createdAt: { gte: weekAgo } },
    }),
    prisma.crawlTask.count({
      where: { status: "COMPLETED", createdAt: { gte: monthAgo } },
    }),
    prisma.crawlTask.count({ where: { status: "FAILED" } }),
    prisma.crawlTask.findMany({
      where: { status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, createdAt: true },
    }),
  ]);

  // 按天统计最近7天 - 使用原生 SQL 在数据库端分组
  const dailyStats = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE("createdAt") as date, COUNT(*) as count
      FROM "CrawlTask"
      WHERE status = 'COMPLETED' AND "createdAt" >= ${weekAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date
    `.then(rows => rows.map(row => ({ date: row.date, count: Number(row.count) })));

  return {
    totalArticles,
    weekArticles,
    monthArticles,
    failedTasks,
    recentArticles,
    dailyStats,
  };
}

async function getCachedStats() {
  if (statsCache && statsCache.expiresAt > Date.now()) {
    return statsCache.data;
  }

  const data = await loadStats();
  statsCache = { data, expiresAt: Date.now() + STATS_CACHE_TTL_MS };
  return data;
}

// GET /api/stats - 获取统计数据
async function getStats() {
  try {
    const stats = await getCachedStats();
    return jsonResponse(stats);
  } catch (error) {
    return handleApiError(error, "获取统计数据失败");
  }
}

export const Route = createFileRoute("/api/stats")({
  server: {
    handlers: {
      GET: async () => getStats(),
    },
  },
});
