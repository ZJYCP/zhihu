import { FeedbackStatus } from "@prisma/client";
import { createFileRoute } from "@tanstack/react-router";
import { requireAdminRequest } from "@/lib/admin-auth";
import { errorResponse, handleApiError, jsonResponse, safeParseJson } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

const FEEDBACK_STATUSES = Object.values(FeedbackStatus);

async function updateAdminFeedback(request: Request, id: string) {
  try {
    const authError = requireAdminRequest(request);
    if (authError) return authError;

    const body = await safeParseJson<{ status?: string }>(request);

    if (!body) {
      return errorResponse("请求体格式错误", 400, "JSON_PARSE_ERROR");
    }

    const status = body.status?.trim();

    if (!status || !FEEDBACK_STATUSES.includes(status as FeedbackStatus)) {
      return errorResponse("请选择有效的反馈状态", 400, "INVALID_FEEDBACK_STATUS");
    }

    const feedback = await prisma.articleFeedback.update({
      where: { id },
      data: { status: status as FeedbackStatus },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    });

    return jsonResponse(feedback);
  } catch (error) {
    return handleApiError(error, "更新反馈状态失败");
  }
}

export const Route = createFileRoute("/api/admin/feedback/$id")({
  server: {
    handlers: {
      PUT: async ({ request, params }) => updateAdminFeedback(request, params.id),
      PATCH: async ({ request, params }) => updateAdminFeedback(request, params.id),
    },
  },
});
