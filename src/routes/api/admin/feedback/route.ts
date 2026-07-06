import { FeedbackStatus } from "@prisma/client";
import { createFileRoute } from "@tanstack/react-router";
import { withAdmin } from "@/lib/server/admin-auth";
import { handleApiError, jsonResponse, parsePagination } from "@/lib/server/api-response";
import { prisma } from "@/lib/server/prisma";

const FEEDBACK_STATUSES = Object.values(FeedbackStatus);

async function getAdminFeedback(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePagination(searchParams);
    const status = searchParams.get("status") || "";
    const where =
      status && FEEDBACK_STATUSES.includes(status as FeedbackStatus)
        ? { status: status as FeedbackStatus }
        : {};

    const [feedback, total] = await Promise.all([
      prisma.articleFeedback.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          type: true,
          content: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          task: {
            select: {
              id: true,
              title: true,
              author: true,
              url: true,
            },
          },
        },
      }),
      prisma.articleFeedback.count({ where }),
    ]);

    return jsonResponse({
      feedback,
      total,
      page,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    });
  } catch (error) {
    return handleApiError(error, "获取反馈列表失败");
  }
}

export const Route = createFileRoute("/api/admin/feedback")({
  server: {
    handlers: {
      GET: withAdmin(({ request }) => getAdminFeedback(request)),
    },
  },
});
