import { createFileRoute } from "@tanstack/react-router";
import { withAdmin } from "@/lib/server/admin-auth";
import { handleApiError, jsonResponse } from "@/lib/server/api-response";
import { runCookieCheck } from "@/lib/server/cookie-checker";

async function checkCookie() {
  try {
    const result = await runCookieCheck();
    return jsonResponse(result);
  } catch (error) {
    return handleApiError(error, "保存检查结果失败");
  }
}

export const Route = createFileRoute("/api/admin/check-cookie")({
  server: {
    handlers: {
      GET: withAdmin(() => checkCookie()),
    },
  },
});
