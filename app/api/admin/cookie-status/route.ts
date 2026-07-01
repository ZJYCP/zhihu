import { createFileRoute } from "@tanstack/react-router";
import { handleApiError, jsonResponse } from "@/lib/api-response";
import { getPublicCookieStatus } from "@/lib/service-status";

// GET /api/admin/cookie-status - 获取公开的 Cookie 检查状态
async function getCookieStatus() {
  try {
    return jsonResponse(await getPublicCookieStatus());
  } catch (error) {
    return handleApiError(error, "获取 Cookie 状态失败");
  }
}

export const Route = createFileRoute("/api/admin/cookie-status")({
  server: {
    handlers: {
      GET: async () => getCookieStatus(),
    },
  },
});
