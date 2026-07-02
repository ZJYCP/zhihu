import { createServerFn } from "@tanstack/react-start";
import { findCompletedArticleForDetail } from "./-article.server";

export const getArticleForDetail = createServerFn({ method: "GET" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => findCompletedArticleForDetail(data.id));
