import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/articles - 获取已完成的文章列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  const type = searchParams.get("type"); // "url" 表示按 URL 精确匹配

  let where;
  if (type === "url" && search) {
    // URL 精确匹配
    where = {
      status: "COMPLETED" as const,
      url: search,
    };
  } else {
    // 关键词搜索 title 和 content_preview
    where = {
      status: "COMPLETED" as const,
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { content_preview: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };
  }

  const [articles, total] = await Promise.all([
    prisma.crawlTask.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        author: true,
        content_preview: true,
        url: true,
        createdAt: true,
      },
    }),
    prisma.crawlTask.count({ where }),
  ]);

  articles.forEach(article => {
    article.content_preview = article.content_preview?.substring(0, 120) || "";
  });

  return NextResponse.json({
    articles,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
