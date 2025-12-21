import { json, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { crawlTasks } from "~/db/schema";
import { eq } from "drizzle-orm";
import { crawlZhihu, parseZhihuUrl } from "~/lib/crawler";

// POST /api/crawl - 执行爬取
export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const { taskId } = await request.json() as { taskId: string };

  if (!taskId) {
    return json({ error: "taskId 不能为空" }, { status: 400 });
  }

  const [task] = await context.db
    .select()
    .from(crawlTasks)
    .where(eq(crawlTasks.id, taskId));

  if (!task) {
    return json({ error: "任务不存在" }, { status: 404 });
  }

  const urlInfo = parseZhihuUrl(task.url);
  if (urlInfo.type === "unknown") {
    await context.db
      .update(crawlTasks)
      .set({ status: "FAILED", error: "不支持的 URL 格式", updatedAt: new Date() })
      .where(eq(crawlTasks.id, taskId));
    return json({ error: "不支持的 URL 格式" }, { status: 400 });
  }

  // 更新状态为运行中
  await context.db
    .update(crawlTasks)
    .set({ status: "RUNNING", updatedAt: new Date() })
    .where(eq(crawlTasks.id, taskId));

  try {
    const result = await crawlZhihu(task.url, {
      cookie: context.cloudflare.env.ZHIHU_COOKIE || "",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      siliconflowApiKey: context.cloudflare.env.SILICONFLOW_API_KEY || "",
    });

    const [updated] = await context.db
      .update(crawlTasks)
      .set({
        status: "COMPLETED",
        title: result.title,
        content: result.content,
        html: result.html,
        author: result.author,
        updatedAt: new Date(),
      })
      .where(eq(crawlTasks.id, taskId))
      .returning();

    return json(updated);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "未知错误";

    await context.db
      .update(crawlTasks)
      .set({ status: "FAILED", error: errorMessage, updatedAt: new Date() })
      .where(eq(crawlTasks.id, taskId));

    return json({ error: errorMessage }, { status: 500 });
  }
}
