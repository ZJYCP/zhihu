import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// GET /api/cron/check-cookie - 检查 Cookie 可用性（供 Vercel Cron 调用）
export async function GET() {
  let success = false;
  let message = "";

  try {
    // 从数据库获取 Cookie
    const config = await prisma.systemConfig.findUnique({
      where: { key: "zhihu_cookie" },
    });

    const cookie = config?.value || process.env.ZHIHU_COOKIE || "";

    if (!cookie) {
      message = "未配置 Cookie";
    } else {
      // 请求知乎 API 检查 Cookie 有效性
      const response = await fetch("https://www.zhihu.com/api/v4/creator/apply", {
        headers: {
          "User-Agent": USER_AGENT,
          Cookie: cookie,
          Accept: "application/json",
          Referer: "https://www.zhihu.com/",
        },
      });

      if (response.ok) {
        success = true;
        message = "Cookie 有效";
      } else {
        message = `请求失败: ${response.status}`;
      }
    }
  } catch (error) {
    message = error instanceof Error ? error.message : "检查失败";
  }

  // 记录检查结果
  await prisma.cookieCheckLog.create({
    data: { success, message },
  });

  // 清理 7 天前的日志
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  await prisma.cookieCheckLog.deleteMany({
    where: { checkedAt: { lt: sevenDaysAgo } },
  });

  return NextResponse.json({ success, message, checkedAt: new Date() });
}
