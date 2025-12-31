import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, safeParseJson, errorResponse } from "@/lib/api-error";

// GET /api/admin/config - 获取配置
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (key) {
      const config = await prisma.systemConfig.findUnique({
        where: { key },
      });
      return NextResponse.json(config);
    }

    // 返回所有配置（隐藏敏感值）
    const configs = await prisma.systemConfig.findMany();
    return NextResponse.json(
      configs.map((c) => ({
        ...c,
        value: c.key === "zhihu_cookie" ? maskCookie(c.value) : c.value,
      }))
    );
  } catch (error) {
    return handleApiError(error, "获取配置失败");
  }
}

// POST /api/admin/config - 更新配置
export async function POST(request: NextRequest) {
  try {
    const body = await safeParseJson<{ key?: string; value?: string }>(request);

    if (!body) {
      return errorResponse("请求体格式错误", 400, "JSON_PARSE_ERROR");
    }

    const { key, value } = body;

    if (!key || value === undefined) {
      return errorResponse("key 和 value 不能为空", 400);
    }

    const config = await prisma.systemConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    return NextResponse.json({
      ...config,
      value: key === "zhihu_cookie" ? maskCookie(config.value) : config.value,
    });
  } catch (error) {
    return handleApiError(error, "更新配置失败");
  }
}

// 隐藏 Cookie 中间部分
function maskCookie(cookie: string): string {
  if (cookie.length <= 20) return "***";
  return cookie.slice(0, 10) + "..." + cookie.slice(-10);
}
