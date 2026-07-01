import { createFileRoute } from "@tanstack/react-router";
import { handleApiError, jsonResponse } from "@/lib/api-response";
import { runCookieCheck } from "@/lib/cookie-checker";

// GET /api/cron/check-cookie - 检查 Cookie 可用性
async function checkCookie() {
  try {
    const result = await runCookieCheck();
    return jsonResponse(result);
  } catch (dbError) {
    // 数据库操作失败时，返回错误但仍包含检查结果
    return handleApiError(dbError, "保存检查结果失败");
  }
}

export const Route = createFileRoute("/api/cron/check-cookie")({
  server: {
    handlers: {
      GET: async () => checkCookie(),
    },
  },
});
