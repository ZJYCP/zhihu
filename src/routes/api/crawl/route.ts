import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/lib/server/prisma";
import { ZhihuCrawler, getCrawlerConfig, parseZhihuUrl } from "@/lib/crawler";
import { errorResponse, handleApiError, jsonResponse, safeParseJson } from "@/lib/server/api-response";
import { checkRateLimit } from "@/lib/server/rate-limiter";

// POST /api/crawl - 执行爬取
async function crawlTask(request: Request) {
  // IP 限流检查
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ||
             request.headers.get("x-real-ip") ||
             "unknown";
  const { allowed, remaining } = await checkRateLimit(ip);

  if (!allowed) {
    return errorResponse("请求过于频繁，请稍后再试", 429, "RATE_LIMIT_EXCEEDED");
  }

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
          fontDecodeSuccess: result.fontDecodeSuccess,
        },
      });

      return jsonResponse(updated);
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

export const Route = createFileRoute("/api/crawl")({
  server: {
    handlers: {
      POST: async ({ request }) => crawlTask(request),
    },
  },
});
