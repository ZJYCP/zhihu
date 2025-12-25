import { prisma } from "@/lib/prisma";

export interface CrawlerConfig {
  cookie: string;
  requestDelay: number;
  userAgent: string;
}

// 从数据库获取 Cookie，fallback 到环境变量
async function getCookieFromDb(): Promise<string> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: "zhihu_cookie" },
    });
    if (config?.value) {
      return config.value;
    }
  } catch {
    // 数据库未初始化时忽略错误
  }
  return process.env.ZHIHU_COOKIE || "";
}

// 异步获取爬虫配置
export async function getCrawlerConfig(): Promise<CrawlerConfig> {
  const cookie = await getCookieFromDb();
  return {
    cookie,
    requestDelay: parseInt(process.env.REQUEST_DELAY || "3000", 10),
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  };
}

export interface ParsedUrl {
  type: "paid_column" | "question" | "unknown";
  columnId?: string;
  sectionId?: string;
  questionId?: string;
  answerId?: string;
}

export function parseZhihuUrl(url: string): ParsedUrl {
  // 付费专栏格式
  const paidColumnMatch = url.match(
    /\/market\/paid_column\/(\d+)\/section\/(\d+)/
  );
  if (paidColumnMatch) {
    return {
      type: "paid_column",
      columnId: paidColumnMatch[1],
      sectionId: paidColumnMatch[2],
    };
  }

  // 问答格式: /question/433939659/answer/3424751266
  const questionMatch = url.match(
    /\/question\/(\d+)\/answer\/(\d+)/
  );
  if (questionMatch) {
    return {
      type: "question",
      questionId: questionMatch[1],
      answerId: questionMatch[2],
    };
  }

  return { type: "unknown" };
}

// 清理 URL，去除查询参数
export function cleanZhihuUrl(url: string): string | null {
  const parsed = parseZhihuUrl(url);

  if (parsed.type === "paid_column") {
    return `https://www.zhihu.com/market/paid_column/${parsed.columnId}/section/${parsed.sectionId}`;
  }

  if (parsed.type === "question") {
    return `https://www.zhihu.com/question/${parsed.questionId}/answer/${parsed.answerId}`;
  }

  return null;
}
