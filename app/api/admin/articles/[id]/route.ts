import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, safeParseJson, errorResponse } from "@/lib/api-error";

// GET /api/admin/articles/[id] - 获取单个文章详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const article = await prisma.crawlTask.findUnique({
      where: { id },
    });

    if (!article) {
      return errorResponse("文章不存在", 404, "NOT_FOUND");
    }

    return NextResponse.json(article);
  } catch (error) {
    return handleApiError(error, "获取文章详情失败");
  }
}

// PUT /api/admin/articles/[id] - 更新文章
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await safeParseJson<Record<string, unknown>>(request);

    if (!body) {
      return errorResponse("请求体格式错误", 400, "JSON_PARSE_ERROR");
    }

    // 只允许更新特定字段
    const allowedFields = ["title", "content", "author", "url"];
    const updateData: Record<string, string> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field] as string;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse("没有要更新的字段", 400);
    }

    const article = await prisma.crawlTask.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(article);
  } catch (error) {
    return handleApiError(error, "更新文章失败");
  }
}

// DELETE /api/admin/articles/[id] - 删除单个文章
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.crawlTask.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "删除文章失败");
  }
}
