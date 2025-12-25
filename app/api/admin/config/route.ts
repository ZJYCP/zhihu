import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/admin/config - 获取配置
export async function GET(request: NextRequest) {
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
}

// POST /api/admin/config - 更新配置
export async function POST(request: NextRequest) {
  const { key, value } = await request.json();

  if (!key || value === undefined) {
    return NextResponse.json({ error: "key 和 value 不能为空" }, { status: 400 });
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
}

// 隐藏 Cookie 中间部分
function maskCookie(cookie: string): string {
  if (cookie.length <= 20) return "***";
  return cookie.slice(0, 10) + "..." + cookie.slice(-10);
}
