import { createFileRoute } from "@tanstack/react-router";
import { requireAdminRequest } from "@/lib/admin-auth";
import { handleApiError, jsonResponse } from "@/lib/api-response";
import { runCookieCheck } from "@/lib/cookie-checker";

async function checkCookie(request: Request) {
  try {
    const authError = requireAdminRequest(request);
    if (authError) return authError;

    const result = await runCookieCheck();
    return jsonResponse(result);
  } catch (error) {
    return handleApiError(error, "保存检查结果失败");
  }
}

export const Route = createFileRoute("/api/admin/check-cookie")({
  server: {
    handlers: {
      GET: async ({ request }) => checkCookie(request),
    },
  },
});
