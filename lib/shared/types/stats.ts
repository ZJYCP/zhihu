/** GET /api/stats 响应 — 采集统计数据 */
export interface Stats {
  totalArticles: number;
  weekArticles: number;
  monthArticles: number;
  failedTasks: number;
  recentArticles: { id: string; title: string | null; createdAt: string }[];
  dailyStats: { date: string; count: number }[];
}
