import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { crawlTasks } from "~/db/schema";
import { eq } from "drizzle-orm";

// GET /api/tasks/:id
export async function loader({ params, context }: LoaderFunctionArgs) {
  const { id } = params;
  if (!id) return json({ error: "ID 不能为空" }, { status: 400 });

  const [task] = await context.db
    .select()
    .from(crawlTasks)
    .where(eq(crawlTasks.id, id));

  if (!task) {
    return json({ error: "任务不存在" }, { status: 404 });
  }

  return json(task);
}

// DELETE /api/tasks/:id
export async function action({ request, params, context }: ActionFunctionArgs) {
  if (request.method !== "DELETE") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const { id } = params;
  if (!id) return json({ error: "ID 不能为空" }, { status: 400 });

  await context.db.delete(crawlTasks).where(eq(crawlTasks.id, id));
  return json({ success: true });
}
