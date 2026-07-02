import { notFound } from "@tanstack/react-router";
import { prisma } from "@/lib/server/prisma";

export async function findCompletedArticleForDetail(id: string) {
  const article = await prisma.crawlTask.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      content: true,
      author: true,
      url: true,
      status: true,
      createdAt: true,
      fontDecodeSuccess: true,
    },
  });

  if (!article || article.status !== "COMPLETED") {
    throw notFound({ data: "文章不存在" });
  }

  return {
    ...article,
    createdAt: article.createdAt.toISOString(),
  };
}
