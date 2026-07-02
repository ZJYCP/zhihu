/** Cookie 可用性状态 — GET /api/admin/cookie-status 与 /about 公开状态共用 */
export interface CookieStatus {
  configured: boolean;
  latest: {
    success: boolean;
    message: string | null;
    checkedAt: string;
  } | null;
  successRate: number;
  logs: {
    success: boolean;
    checkedAt: string;
  }[];
}
