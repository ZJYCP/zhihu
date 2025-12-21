import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const crawlTasks = sqliteTable("crawl_tasks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  url: text("url").notNull(),
  status: text("status", { enum: ["PENDING", "RUNNING", "COMPLETED", "FAILED"] }).default("PENDING").notNull(),
  title: text("title"),
  content: text("content"),
  html: text("html"),
  author: text("author"),
  column: text("column"),
  error: text("error"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export type CrawlTask = typeof crawlTasks.$inferSelect;
export type NewCrawlTask = typeof crawlTasks.$inferInsert;
