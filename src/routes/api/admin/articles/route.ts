import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/lib/server/prisma";
import { withAdmin } from "@/lib/server/admin-auth";
import { errorResponse, handleApiError, jsonResponse, safeParseJson } from "@/lib/server/api-response";

// GET /api/admin/articles - 获取文章列表（支持搜索和分页）
async function getAdminArticles(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { author: { contains: search, mode: "insensitive" } },
        { url: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [articles, total] = await Promise.all([
      prisma.crawlTask.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          url: true,
          status: true,
          title: true,
          author: true,
          error: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.crawlTask.count({ where }),
    ]);

    return jsonResponse({
      articles,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return handleApiError(error, "获取文章列表失败");
  }
}

// DELETE /api/admin/articles - 批量删除文章
async function deleteAdminArticles(request: Request) {
  try {
    const body = await safeParseJson<{ ids?: string[] }>(request);

    if (!body) {
      return errorResponse("请求体格式错误", 400, "JSON_PARSE_ERROR");
    }

    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return errorResponse("请提供要删除的文章 ID", 400);
    }

    const result = await prisma.crawlTask.deleteMany({
      where: { id: { in: ids } },
    });

    return jsonResponse({ success: true, deleted: result.count });
  } catch (error) {
    return handleApiError(error, "批量删除文章失败");
  }
}

export const Route = createFileRoute("/api/admin/articles")({
  server: {
    handlers: {
      GET: withAdmin(({ request }) => getAdminArticles(request)),
      DELETE: withAdmin(({ request }) => deleteAdminArticles(request)),
    },
  },
});
