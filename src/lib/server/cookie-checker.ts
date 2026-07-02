import { prisma } from "@/lib/server/prisma";
import { getRuntimeConfig } from "@/lib/server/runtime-config";

export async function runCookieCheck() {
  let success = false;
  let message = "";

  try {
    const config = await getRuntimeConfig();
    const cookie = config.zhihu_cookie;

    if (!cookie) {
      message = "未配置 Cookie";
    } else {
      const response = await fetch(config.cookie_check_url, {
        headers: {
          "User-Agent": config.crawler_user_agent,
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

  await prisma.cookieCheckLog.create({
    data: { success, message },
  });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  await prisma.cookieCheckLog.deleteMany({
    where: { checkedAt: { lt: sevenDaysAgo } },
  });

  return { success, message, checkedAt: new Date() };
}
