/** 反馈类型（与 Prisma FeedbackType 枚举一致） */
export type FeedbackType =
  | "INCOMPLETE_CONTENT"
  | "GARBLED_TEXT"
  | "MISSING_IMAGE"
  | "OTHER";

/** 反馈状态（与 Prisma FeedbackStatus 枚举一致） */
export type FeedbackStatus = "OPEN" | "RESOLVED";

/** 反馈类型中文标签 */
export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  INCOMPLETE_CONTENT: "内容不完整",
  GARBLED_TEXT: "内容乱码",
  MISSING_IMAGE: "图片缺失",
  OTHER: "其他",
};

/** 反馈列表项 — GET /api/admin/feedback 返回的列表元素 */
export interface FeedbackItem {
  id: string;
  type: FeedbackType;
  content: string;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
  task: {
    id: string;
    title: string | null;
    author: string | null;
    url: string;
  };
}

/** GET /api/admin/feedback 响应 */
export interface FeedbackListResponse {
  feedback: FeedbackItem[];
  total: number;
  page: number;
  totalPages: number;
}
