import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/lib/server/prisma";
import { errorResponse, handleApiError, jsonResponse } from "@/lib/server/api-response";
import { checkRateLimit } from "@/lib/server/rate-limiter";

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
async function deleteTask(id: string, request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ||
               request.headers.get("x-real-ip") ||
               "unknown";
    const { allowed } = await checkRateLimit(ip);
    if (!allowed) {
      return errorResponse("请求过于频繁，请稍后再试", 429, "RATE_LIMIT_EXCEEDED");
    }

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
      DELETE: async ({ params, request }) => deleteTask(params.id, request),
    },
  },
});
