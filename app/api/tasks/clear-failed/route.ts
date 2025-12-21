import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DELETE /api/tasks/clear-failed - 清理所有失败任务
export async function DELETE() {
  await prisma.crawlTask.deleteMany({
    where: { status: "FAILED" },
  });
  return NextResponse.json({ success: true });
}
