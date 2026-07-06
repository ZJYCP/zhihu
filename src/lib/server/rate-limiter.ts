import { prisma } from "@/lib/server/prisma";
import { coerceConfigValue, getRuntimeConfig } from "@/lib/server/runtime-config";

export async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  const config = await getRuntimeConfig();
  const windowMs = coerceConfigValue("rate_limit_window_ms", config.rate_limit_window_ms) as number;
  const maxRequests = coerceConfigValue(
    "rate_limit_max_requests",
    config.rate_limit_max_requests
  ) as number;
  const windowStart = new Date(Date.now() - windowMs);

  // 清理过期记录，防止表无限增长
  await prisma.rateLimitLog.deleteMany({
    where: { createdAt: { lt: windowStart } },
  });

  // 统计时间窗口内的请求数
  const count = await prisma.rateLimitLog.count({
    where: { ip, createdAt: { gte: windowStart } },
  });

  if (count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  // 记录本次请求
  await prisma.rateLimitLog.create({ data: { ip } });

  return { allowed: true, remaining: maxRequests - count - 1 };
}
