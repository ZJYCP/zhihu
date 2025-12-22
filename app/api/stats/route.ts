import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/stats - 获取统计数据
export async function GET() {
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

  // 按天统计最近7天 - 使用 Prisma 查询代替原生 SQL
  const weekArticlesData = await prisma.crawlTask.findMany({
    where: { status: "COMPLETED", createdAt: { gte: weekAgo } },
    select: { createdAt: true },
  });

  // 手动按天分组
  const dailyMap = new Map<string, number>();
  weekArticlesData.forEach((item) => {
    const date = item.createdAt.toISOString().split("T")[0];
    dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
  });

  const dailyStats = Array.from(dailyMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    totalArticles,
    weekArticles,
    monthArticles,
    failedTasks,
    recentArticles,
    dailyStats,
  });
}
