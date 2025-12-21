export interface CrawlerConfig {
  cookie: string;
  userAgent: string;
  siliconflowApiKey: string;
}

export function parseZhihuUrl(url: string): {
  type: "paid_column" | "unknown";
  columnId?: string;
  sectionId?: string;
} {
  const paidColumnMatch = url.match(/\/market\/paid_column\/(\d+)\/section\/(\d+)/);
  if (paidColumnMatch) {
    return {
      type: "paid_column",
      columnId: paidColumnMatch[1],
      sectionId: paidColumnMatch[2],
    };
  }
  return { type: "unknown" };
}
