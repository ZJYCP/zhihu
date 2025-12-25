import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json(
      { error: "管理密码未配置" },
      { status: 500 }
    );
  }

  if (password === adminPassword) {
    // 密码正确，返回一个简单的 token（基于密码的 hash）
    const token = Buffer.from(adminPassword).toString("base64");
    return NextResponse.json({ success: true, token });
  }

  return NextResponse.json(
    { error: "密码错误" },
    { status: 401 }
  );
}
