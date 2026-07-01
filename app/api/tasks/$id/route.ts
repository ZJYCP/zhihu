import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/lib/prisma";
import { errorResponse, handleApiError, jsonResponse } from "@/lib/api-response";

// GET /api/tasks/$id - 获取单个任务
async function getTask(id: string) {
  try {
    const task = await prisma.crawlTask.findUnique({ where: { id } });

    if (!task) {
      return errorResponse("任务不存在", 404, "NOT_FOUND");
    }

    return jsonResponse(task);
  } catch (error) {
    return handleApiError(error, "获取任务详情失败");
  }
}

// DELETE /api/tasks/$id - 删除任务
async function deleteTask(id: string) {
  try {
    await prisma.crawlTask.delete({ where: { id } });
    return jsonResponse({ success: true });
  } catch (error) {
    return handleApiError(error, "删除任务失败");
  }
}

export const Route = createFileRoute("/api/tasks/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => getTask(params.id),
      DELETE: async ({ params }) => deleteTask(params.id),
    },
  },
});
