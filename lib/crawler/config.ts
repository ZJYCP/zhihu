import dotenv from "dotenv";

dotenv.config();

export interface CrawlerConfig {
  cookie: string;
  requestDelay: number;
  userAgent: string;
  browserlessToken?: string;
}

export function getCrawlerConfig(): CrawlerConfig {
  return {
    cookie: process.env.ZHIHU_COOKIE || "",
    requestDelay: parseInt(process.env.REQUEST_DELAY || "3000", 10),
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    browserlessToken: process.env.BROWSERLESS_TOKEN,
  };
}

export function parseCookies(
  cookieString: string,
  domain: string
): Array<{ name: string; value: string; domain: string; path: string }> {
  return cookieString
    .split(";")
    .map((item) => {
      const [name, ...valueParts] = item.trim().split("=");
      return {
        name: name.trim(),
        value: valueParts.join("=").trim(),
        domain,
        path: "/",
      };
    })
    .filter((c) => c.name && c.value);
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
