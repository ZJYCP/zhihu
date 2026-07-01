import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonResponse } from "@/lib/api-response";

// DELETE /api/tasks/clear-failed - 清理所有失败任务
async function clearFailedTasks() {
  try {
    const result = await prisma.crawlTask.deleteMany({
      where: { status: "FAILED" },
    });
    return jsonResponse({ success: true, deleted: result.count });
  } catch (error) {
    return handleApiError(error, "清理失败任务失败");
  }
}

export const Route = createFileRoute("/api/tasks/clear-failed")({
  server: {
    handlers: {
      DELETE: async () => clearFailedTasks(),
    },
  },
});
