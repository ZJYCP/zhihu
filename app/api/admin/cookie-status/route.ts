import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error";

// GET /api/admin/cookie-status - 获取 Cookie 检查状态
export async function GET() {
  try {
    // 获取最近 24 小时的检查记录
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const logs = await prisma.cookieCheckLog.findMany({
      where: { checkedAt: { gte: oneDayAgo } },
      orderBy: { checkedAt: "desc" },
      take: 48, // 每 30 分钟一次，24 小时最多 48 条
    });

    // 获取最新状态
    const latest = logs[0];

    // 计算成功率
    const successCount = logs.filter((l) => l.success).length;
    const successRate = logs.length > 0 ? (successCount / logs.length) * 100 : 0;

    return NextResponse.json({
      latest: latest
        ? {
            success: latest.success,
            message: latest.message,
            checkedAt: latest.checkedAt,
          }
        : null,
      successRate: Math.round(successRate),
      logs: logs.map((l) => ({
        success: l.success,
        checkedAt: l.checkedAt,
      })),
    });
  } catch (error) {
    return handleApiError(error, "获取 Cookie 状态失败");
  }
}
