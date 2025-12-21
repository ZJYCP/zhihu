import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/tasks - 获取任务列表
export async function GET() {
  const tasks = await prisma.crawlTask.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(tasks);
}

// POST /api/tasks - 创建任务
export async function POST(request: NextRequest) {
  const { url } = await request.json();

  if (!url) {
    return NextResponse.json({ error: "URL 不能为空" }, { status: 400 });
  }

  const task = await prisma.crawlTask.create({
    data: { url },
  });

  return NextResponse.json(task);
}
