import { FeedbackType } from "@prisma/client";
import { createFileRoute } from "@tanstack/react-router";
import { errorResponse, handleApiError, jsonResponse, safeParseJson } from "@/lib/server/api-response";
import { prisma } from "@/lib/server/prisma";

const FEEDBACK_TYPES = Object.values(FeedbackType);

async function createArticleFeedback(request: Request, taskId: string) {
  try {
    const body = await safeParseJson<{ type?: string; content?: string }>(request);

    if (!body) {
      return errorResponse("请求体格式错误", 400, "JSON_PARSE_ERROR");
    }

    const type = body.type?.trim();
    const content = body.content?.trim();

    if (!type || !FEEDBACK_TYPES.includes(type as FeedbackType)) {
      return errorResponse("请选择有效的问题类型", 400, "INVALID_FEEDBACK_TYPE");
    }

    if (!content) {
      return errorResponse("请填写反馈说明", 400, "FEEDBACK_CONTENT_REQUIRED");
    }

    if (content.length > 1000) {
      return errorResponse("反馈说明不能超过 1000 字", 400, "FEEDBACK_CONTENT_TOO_LONG");
    }

    const task = await prisma.crawlTask.findFirst({
      where: { id: taskId, status: "COMPLETED" },
      select: { id: true },
    });

    if (!task) {
      return errorResponse("文章不存在", 404, "NOT_FOUND");
    }

    const feedback = await prisma.articleFeedback.create({
      data: {
        taskId,
        type: type as FeedbackType,
        content,
      },
      select: {
        id: true,
        type: true,
        content: true,
        status: true,
        createdAt: true,
      },
    });

    return jsonResponse(feedback, { status: 201 });
  } catch (error) {
    return handleApiError(error, "提交反馈失败");
  }
}

export const Route = createFileRoute("/api/tasks/$id/feedback")({
  server: {
    handlers: {
      POST: async ({ request, params }) =>
        createArticleFeedback(request, params.id),
    },
  },
});
