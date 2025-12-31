import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, errorResponse } from "@/lib/api-error";

// GET /api/tasks/[id] - 获取单个任务
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const task = await prisma.crawlTask.findUnique({ where: { id } });

    if (!task) {
      return errorResponse("任务不存在", 404, "NOT_FOUND");
    }

    return NextResponse.json(task);
  } catch (error) {
    return handleApiError(error, "获取任务详情失败");
  }
}

// DELETE /api/tasks/[id] - 删除任务
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.crawlTask.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "删除任务失败");
  }
}
