import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ZhihuCrawler, getCrawlerConfig, parseZhihuUrl } from "@/lib/crawler";
import { handleApiError, safeParseJson, errorResponse } from "@/lib/api-error";

// POST /api/crawl - 执行爬取
export async function POST(request: NextRequest) {
  let taskId: string | undefined;

  try {
    const body = await safeParseJson<{ taskId?: string }>(request);

    if (!body) {
      return errorResponse("请求体格式错误", 400, "JSON_PARSE_ERROR");
    }

    taskId = body.taskId;

    if (!taskId) {
      return errorResponse("taskId 不能为空", 400);
    }

    const task = await prisma.crawlTask.findUnique({ where: { id: taskId } });
    if (!task) {
      return errorResponse("任务不存在", 404, "NOT_FOUND");
    }

    const urlInfo = parseZhihuUrl(task.url);
    if (urlInfo.type === "unknown") {
      await prisma.crawlTask.update({
        where: { id: taskId },
        data: { status: "FAILED", error: "不支持的 URL 格式" },
      });
      return errorResponse("不支持的 URL 格式", 400);
    }

    // 更新状态为运行中
    await prisma.crawlTask.update({
      where: { id: taskId },
      data: { status: "RUNNING" },
    });

    const config = await getCrawlerConfig();
    const crawler = new ZhihuCrawler(config);

    try {
      await crawler.init();
      const result = await crawler.crawl(task.url);

      // 更新任务结果
      const updated = await prisma.crawlTask.update({
        where: { id: taskId },
        data: {
          status: "COMPLETED",
          title: result.title,
          content: result.content,
          html: result.html,
          author: result.author,
        },
      });

      return NextResponse.json(updated);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "未知错误";

      await prisma.crawlTask.update({
        where: { id: taskId },
        data: { status: "FAILED", error: errorMessage },
      });

      return errorResponse(errorMessage, 500, "CRAWL_ERROR");
    } finally {
      await crawler.close();
    }
  } catch (error) {
    // 如果有 taskId，尝试更新任务状态为失败
    if (taskId) {
      try {
        await prisma.crawlTask.update({
          where: { id: taskId },
          data: {
            status: "FAILED",
            error: error instanceof Error ? error.message : "系统错误",
          },
        });
      } catch {
        // 忽略更新失败的错误
      }
    }
    return handleApiError(error, "爬取任务执行失败");
  }
}
