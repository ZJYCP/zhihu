import { prisma } from "@/lib/prisma";

const WINDOW_MS = 60 * 60 * 1000; // 1 小时
const MAX_REQUESTS = 10;

export async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(Date.now() - WINDOW_MS);

  // 统计时间窗口内的请求数
  const count = await prisma.rateLimitLog.count({
    where: { ip, createdAt: { gte: windowStart } },
  });

  if (count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  // 记录本次请求
  await prisma.rateLimitLog.create({ data: { ip } });

  return { allowed: true, remaining: MAX_REQUESTS - count - 1 };
}
