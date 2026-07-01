import { createFileRoute } from "@tanstack/react-router";
import { createAdminToken } from "@/lib/admin-auth";
import { errorResponse, safeParseJson, successResponse } from "@/lib/api-response";

export async function handleAdminAuthPost(request: Request) {
  const body = await safeParseJson<{ password?: string }>(request);

  if (!body) {
    return errorResponse("请求体格式错误", 400, "JSON_PARSE_ERROR");
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return errorResponse("管理密码未配置", 500, "ADMIN_PASSWORD_MISSING");
  }

  const appSecret = process.env.APP_SECRET;
  if (!appSecret) {
    return errorResponse("APP_SECRET 未配置", 500, "APP_SECRET_MISSING");
  }

  if (body.password !== adminPassword) {
    return errorResponse("密码错误", 401, "INVALID_PASSWORD");
  }

  return successResponse({
    success: true,
    token: createAdminToken(appSecret),
  });
}

export const Route = createFileRoute("/api/admin/auth")({
  server: {
    handlers: {
      POST: async ({ request }) => handleAdminAuthPost(request),
    },
  },
});
