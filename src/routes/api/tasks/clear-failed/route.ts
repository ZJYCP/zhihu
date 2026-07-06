import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/lib/server/prisma";
import { errorResponse, handleApiError, jsonResponse } from "@/lib/server/api-response";
import { checkRateLimit } from "@/lib/server/rate-limiter";

// DELETE /api/tasks/clear-failed - 清理所有失败的任务
async function clearFailedTasks(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ||
               request.headers.get("x-real-ip") ||
               "unknown";
    const { allowed } = await checkRateLimit(ip);
    if (!allowed) {
      return errorResponse("请求过于频繁，请稍后再试", 429, "RATE_LIMIT_EXCEEDED");
    }

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
      DELETE: async ({ request }) => clearFailedTasks(request),
    },
  },
});
