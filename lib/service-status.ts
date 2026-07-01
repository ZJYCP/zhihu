import { prisma } from "@/lib/prisma";
import { getRuntimeConfigValue } from "@/lib/config/runtime-config";

export interface PublicCookieStatus {
  configured: boolean;
  latest: {
    success: boolean;
    message: string | null;
    checkedAt: string;
  } | null;
  successRate: number;
  logs: {
    success: boolean;
    checkedAt: string;
  }[];
}

export async function getPublicCookieStatus(): Promise<PublicCookieStatus> {
  const [cookie, logs] = await Promise.all([
    getRuntimeConfigValue("zhihu_cookie"),
    getRecentCookieCheckLogs(),
  ]);
  const latest = logs[0];
  const successCount = logs.filter((log) => log.success).length;

  return {
    configured: Boolean(cookie.trim()),
    latest: latest
      ? {
          success: latest.success,
          message: latest.message,
          checkedAt: latest.checkedAt.toISOString(),
        }
      : null,
    successRate:
      logs.length > 0 ? Math.round((successCount / logs.length) * 100) : 0,
    logs: logs.map((log) => ({
      success: log.success,
      checkedAt: log.checkedAt.toISOString(),
    })),
  };
}

async function getRecentCookieCheckLogs() {
  const oneDayAgo = new Date();
  oneDayAgo.setHours(oneDayAgo.getHours() - 24);

  return prisma.cookieCheckLog.findMany({
    where: { checkedAt: { gte: oneDayAgo } },
    orderBy: { checkedAt: "desc" },
    take: 48,
  });
}
