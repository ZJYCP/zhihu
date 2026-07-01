import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/lib/prisma";
import { requireAdminRequest } from "@/lib/admin-auth";
import { errorResponse, handleApiError, jsonResponse, safeParseJson } from "@/lib/api-response";

// GET /api/admin/articles/$id - 获取单个文章详情
async function getAdminArticle(request: Request, id: string) {
  try {
    const authError = requireAdminRequest(request);
    if (authError) return authError;

    const article = await prisma.crawlTask.findUnique({
      where: { id },
    });

    if (!article) {
      return errorResponse("文章不存在", 404, "NOT_FOUND");
    }

    return jsonResponse(article);
  } catch (error) {
    return handleApiError(error, "获取文章详情失败");
  }
}

// PUT /api/admin/articles/$id - 更新文章
async function updateAdminArticle(request: Request, id: string) {
  try {
    const authError = requireAdminRequest(request);
    if (authError) return authError;

    const body = await safeParseJson<Record<string, unknown>>(request);

    if (!body) {
      return errorResponse("请求体格式错误", 400, "JSON_PARSE_ERROR");
    }

    // 只允许更新特定字段
    const allowedFields = ["title", "content", "author", "url"];
    const updateData: Record<string, string> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field] as string;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse("没有要更新的字段", 400);
    }

    const article = await prisma.crawlTask.update({
      where: { id },
      data: updateData,
    });

    return jsonResponse(article);
  } catch (error) {
    return handleApiError(error, "更新文章失败");
  }
}

// DELETE /api/admin/articles/$id - 删除单个文章
async function deleteAdminArticle(request: Request, id: string) {
  try {
    const authError = requireAdminRequest(request);
    if (authError) return authError;

    await prisma.crawlTask.delete({ where: { id } });
    return jsonResponse({ success: true });
  } catch (error) {
    return handleApiError(error, "删除文章失败");
  }
}

export const Route = createFileRoute("/api/admin/articles/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => getAdminArticle(request, params.id),
      PUT: async ({ request, params }) => updateAdminArticle(request, params.id),
      DELETE: async ({ request, params }) => deleteAdminArticle(request, params.id),
    },
  },
});
