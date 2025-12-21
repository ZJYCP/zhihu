import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ZhihuCrawler, getCrawlerConfig, parseZhihuUrl } from "@/lib/crawler";

// POST /api/crawl - 执行爬取
export async function POST(request: NextRequest) {
  const { taskId } = await request.json();

  if (!taskId) {
    return NextResponse.json({ error: "taskId 不能为空" }, { status: 400 });
  }

  const task = await prisma.crawlTask.findUnique({ where: { id: taskId } });
  if (!task) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  const urlInfo = parseZhihuUrl(task.url);
  if (urlInfo.type === "unknown") {
    await prisma.crawlTask.update({
      where: { id: taskId },
      data: { status: "FAILED", error: "不支持的 URL 格式" },
    });
    return NextResponse.json({ error: "不支持的 URL 格式" }, { status: 400 });
  }

  // 更新状态为运行中
  await prisma.crawlTask.update({
    where: { id: taskId },
    data: { status: "RUNNING" },
  });

  const config = getCrawlerConfig();
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

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    await crawler.close();
  }
}
