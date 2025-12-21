import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function TaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const task = await prisma.crawlTask.findUnique({ where: { id } });

  if (!task) {
    notFound();
  }

  return (
    <main className="container mx-auto max-w-4xl p-6">
      <Link
        href="/"
        className="text-sm text-[hsl(var(--muted-foreground))] hover:underline mb-4 inline-block"
      >
        ← 返回列表
      </Link>

      <h1 className="text-3xl font-bold mb-4">{task.title || "无标题"}</h1>

      <div className="flex gap-4 text-sm text-[hsl(var(--muted-foreground))] mb-6">
        {task.author && <span>作者: {task.author}</span>}
        <span>创建时间: {task.createdAt.toLocaleString("zh-CN")}</span>
      </div>

      <a
        href={task.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-500 hover:underline mb-8 block"
      >
        原文链接 ↗
      </a>

      <article className="prose prose-neutral max-w-none">
        {task.content?.split("\n").map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </article>
    </main>
  );
}
