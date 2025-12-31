import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error";

// DELETE /api/tasks/clear-failed - 清理所有失败任务
export async function DELETE() {
  try {
    const result = await prisma.crawlTask.deleteMany({
      where: { status: "FAILED" },
    });
    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error) {
    return handleApiError(error, "清理失败任务失败");
  }
}
