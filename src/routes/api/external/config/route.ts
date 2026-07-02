import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/lib/server/prisma";
import {
  errorResponse,
  handleApiError,
  jsonResponse,
  safeParseJson,
} from "@/lib/server/api-response";
import { withExternalSecret } from "@/lib/server/admin-auth";
import {
  serializeConfig,
  validateConfigValue,
} from "@/lib/server/runtime-config";

// 外部通道仅允许更新知乎 Cookie，不接受外部传入 key
const COOKIE_KEY = "zhihu_cookie" as const;

// POST /api/external/config - 外部系统用 secret 直接更新知乎 Cookie（无需登录）
async function updateExternalCookie(request: Request) {
  try {
    const body = await safeParseJson<{ value?: string }>(request);

    if (!body) {
      return errorResponse("请求体格式错误", 400, "JSON_PARSE_ERROR");
    }

    const { value } = body;

    if (!value) {
      return errorResponse("value 不能为空", 400);
    }

    const validationError = validateConfigValue(COOKIE_KEY, value);
    if (validationError) {
      return errorResponse(validationError, 400, "INVALID_CONFIG_VALUE");
    }

    const config = await prisma.systemConfig.upsert({
      where: { key: COOKIE_KEY },
      update: { value },
      create: { key: COOKIE_KEY, value },
    });

    return jsonResponse(serializeConfig(COOKIE_KEY, config.value));
  } catch (error) {
    return handleApiError(error, "更新 Cookie 失败");
  }
}

export const Route = createFileRoute("/api/external/config")({
  server: {
    handlers: {
      POST: withExternalSecret(({ request }) => updateExternalCookie(request)),
    },
  },
});
