import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/lib/prisma";
import { errorResponse, handleApiError, jsonResponse, safeParseJson } from "@/lib/api-response";
import { requireAdminRequest } from "@/lib/admin-auth";
import {
  isRuntimeConfigKey,
  listRuntimeConfig,
  serializeConfig,
  validateConfigValue,
} from "@/lib/config/runtime-config";

// GET /api/admin/config - 获取配置
async function getAdminConfig(request: Request) {
  try {
    const authError = requireAdminRequest(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (key) {
      if (!isRuntimeConfigKey(key)) {
        return errorResponse("未知配置项", 404, "CONFIG_NOT_FOUND");
      }

      const config = await prisma.systemConfig.findUnique({
        where: { key },
      });
      return jsonResponse(
        serializeConfig(key, config?.value ?? "", { revealValue: true })
      );
    }

    return jsonResponse(await listRuntimeConfig());
  } catch (error) {
    return handleApiError(error, "获取配置失败");
  }
}

// POST /api/admin/config - 更新配置
async function updateAdminConfig(request: Request) {
  try {
    const authError = requireAdminRequest(request);
    if (authError) return authError;

    const body = await safeParseJson<{ key?: string; value?: string }>(request);

    if (!body) {
      return errorResponse("请求体格式错误", 400, "JSON_PARSE_ERROR");
    }

    const { key, value } = body;

    if (!key || value === undefined) {
      return errorResponse("key 和 value 不能为空", 400);
    }

    if (!isRuntimeConfigKey(key)) {
      return errorResponse("未知配置项", 400, "CONFIG_NOT_ALLOWED");
    }

    const validationError = validateConfigValue(key, value);
    if (validationError) {
      return errorResponse(validationError, 400, "INVALID_CONFIG_VALUE");
    }

    const config = await prisma.systemConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    return jsonResponse(serializeConfig(key, config.value));
  } catch (error) {
    return handleApiError(error, "更新配置失败");
  }
}

export const Route = createFileRoute("/api/admin/config")({
  server: {
    handlers: {
      GET: async ({ request }) => getAdminConfig(request),
      POST: async ({ request }) => updateAdminConfig(request),
    },
  },
});
