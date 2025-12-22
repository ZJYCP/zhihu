export interface CrawlerConfig {
  cookie: string;
  requestDelay: number;
  userAgent: string;
}

export function getCrawlerConfig(): CrawlerConfig {
  return {
    cookie: process.env.ZHIHU_COOKIE || "",
    requestDelay: parseInt(process.env.REQUEST_DELAY || "3000", 10),
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  };
}

export function parseZhihuUrl(url: string): {
  type: "paid_column" | "question" | "article" | "unknown";
  columnId?: string;
  sectionId?: string;
} {
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
  return { type: "unknown" };
}
