import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { crawlTasks } from "~/db/schema";
import { desc, eq, and, gte, like, or, sql, count } from "drizzle-orm";

// GET /api/tasks - 获取任务列表
export async function loader({ context }: LoaderFunctionArgs) {
  const tasks = await context.db
    .select()
    .from(crawlTasks)
    .orderBy(desc(crawlTasks.createdAt));
  return json(tasks);
}

// POST /api/tasks - 创建任务
export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const { url } = await request.json() as { url: string };

  if (!url) {
    return json({ error: "URL 不能为空" }, { status: 400 });
  }

  const [task] = await context.db
    .insert(crawlTasks)
    .values({ url })
    .returning();

  return json(task);
}
