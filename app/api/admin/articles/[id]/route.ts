import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/admin/articles/[id] - 获取单个文章详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const article = await prisma.crawlTask.findUnique({
    where: { id },
  });

  if (!article) {
    return NextResponse.json({ error: "文章不存在" }, { status: 404 });
  }

  return NextResponse.json(article);
}

// PUT /api/admin/articles/[id] - 更新文章
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await request.json();

  // 只允许更新特定字段
  const allowedFields = ["title", "content", "author", "url"];
  const updateData: Record<string, string> = {};

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "没有要更新的字段" }, { status: 400 });
  }

  try {
    const article = await prisma.crawlTask.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(article);
  } catch {
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// DELETE /api/admin/articles/[id] - 删除单个文章
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.crawlTask.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
