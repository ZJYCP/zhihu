/** CrawlTask 状态：PENDING/RUNNING/COMPLETED/FAILED（与 Prisma Status 枚举一致） */
export type CrawlTaskStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

/**
 * 公开文章列表项 — GET /api/articles 返回的列表元素。
 * content_preview 已被服务端截断到 120 字。
 */
export interface ArticleListItem {
  id: string;
  title: string | null;
  author: string | null;
  content_preview: string | null;
  url: string;
  createdAt: string;
}

/** GET /api/articles 响应 */
export interface ArticlesListResponse {
  articles: ArticleListItem[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * 管理后台文章列表项 — GET /api/admin/articles 返回的列表元素。
 * 管理的是 CrawlTask（已完成任务即文章），故含 status/error/updatedAt。
 */
export interface AdminArticleListItem {
  id: string;
  url: string;
  status: CrawlTaskStatus;
  title: string | null;
  author: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

/** GET /api/admin/articles 响应 */
export interface AdminArticlesResponse {
  articles: AdminArticleListItem[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * 文章详情 — GET /api/tasks/$id loader 返回。
 * 来源 findCompletedArticleForDetail，仅 status===COMPLETED。
 */
export interface ArticleDetail {
  id: string;
  title: string | null;
  content: string | null;
  author: string | null;
  url: string;
  status: CrawlTaskStatus;
  createdAt: string;
  fontDecodeSuccess: boolean;
}
