import { json, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { crawlTasks } from "~/db/schema";
import { eq } from "drizzle-orm";

// DELETE /api/tasks/clear-failed - 清理失败任务
export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== "DELETE") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  await context.db.delete(crawlTasks).where(eq(crawlTasks.status, "FAILED"));
  return json({ success: true });
}
