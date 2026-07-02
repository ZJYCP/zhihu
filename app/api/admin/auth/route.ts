import { createFileRoute } from "@tanstack/react-router";
import { createAdminToken } from "@/lib/server/admin-auth";
import { errorResponse, safeParseJson, successResponse } from "@/lib/server/api-response";
import { getAdminPassword, getAppSecret } from "@/lib/server/env";

export async function handleAdminAuthPost(request: Request) {
  const body = await safeParseJson<{ password?: string }>(request);

  if (!body) {
    return errorResponse("请求体格式错误", 400, "JSON_PARSE_ERROR");
  }

  let adminPassword: string;
  let appSecret: string;
  try {
    adminPassword = getAdminPassword();
    appSecret = getAppSecret();
  } catch (e) {
    const message = e instanceof Error ? e.message : "服务配置错误";
    return errorResponse(message, 500, "CONFIG_MISSING");
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
