import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cleanZhihuUrl } from "@/lib/crawler";
import { handleApiError, safeParseJson, errorResponse } from "@/lib/api-error";

// GET /api/tasks - 获取任务列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    // status=active 只查询 RUNNING 和 FAILED 状态的任务
    if (status === "active") {
      const tasks = await prisma.crawlTask.findMany({
        where: {
          status: { in: ["RUNNING", "FAILED"] },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          url: true,
          status: true,
          error: true,
          createdAt: true,
        },
      });
      return NextResponse.json(tasks);
    }

    // 默认查询所有任务（如果真的需要的话，可以加分页）
    const tasks = await prisma.crawlTask.findMany({
      orderBy: { createdAt: "desc" },
      take: 100, // 限制最多返回 100 条
      select: {
        id: true,
        url: true,
        status: true,
        title: true,
        error: true,
        createdAt: true,
      },
    });
    return NextResponse.json(tasks);
  } catch (error) {
    return handleApiError(error, "获取任务列表失败");
  }
}

// POST /api/tasks - 创建任务
export async function POST(request: NextRequest) {
  try {
    const body = await safeParseJson<{ url?: string }>(request);

    if (!body) {
      return errorResponse("请求体格式错误", 400, "JSON_PARSE_ERROR");
    }

    const { url } = body;

    if (!url) {
      return errorResponse("URL 不能为空", 400);
    }

    // 清理 URL，去除查询参数
    const cleanUrl = cleanZhihuUrl(url);
    if (!cleanUrl) {
      return errorResponse("无效的知乎 URL 格式", 400);
    }

    // 检查是否已存在已完成的文章
    const existing = await prisma.crawlTask.findFirst({
      where: {
        url: cleanUrl,
        status: "COMPLETED",
      },
      select: {
        id: true,
        title: true,
        author: true,
        content_preview: true,
        url: true,
        createdAt: true,
      },
    });

    if (existing) {
      return NextResponse.json({ existing: true, article: existing });
    }

    // 创建新任务
    const task = await prisma.crawlTask.create({
      data: { url: cleanUrl },
    });

    return NextResponse.json(task);
  } catch (error) {
    return handleApiError(error, "创建任务失败");
  }
}
