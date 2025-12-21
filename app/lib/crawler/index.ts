import * as cheerio from "cheerio";
import { type CrawlerConfig, parseZhihuUrl } from "./config";
import { extractFontBase64, decodeFontMapping, decodeText, type FontMapping } from "./font-decoder";

export interface CrawlResult {
  title: string;
  content: string;
  html: string;
  author?: string;
  url: string;
}

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export async function crawlZhihu(url: string, config: CrawlerConfig): Promise<CrawlResult> {
  const urlInfo = parseZhihuUrl(url);
  if (urlInfo.type === "unknown") {
    throw new Error("不支持的 URL 格式");
  }

  // 直接请求页面
  const response = await fetch(url, {
    headers: {
      "User-Agent": config.userAgent || USER_AGENT,
      Cookie: config.cookie,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`请求失败: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // 提取标题
  const title = $('[class^="ManuscriptTitle-root-"]').text().trim() || `未知标题_${Date.now()}`;

  // 提取正文
  const manuscript = $("#manuscript");
  const rawText = manuscript.text();
  const rawHtml = manuscript.html() || "";

  // 提取字体 CSS
  let fontMapping: FontMapping = {};
  const styleContent = $("style").text();
  const fontFaceMatches = styleContent.match(/@font-face\s*\{[^}]+\}/g) || [];

  // 通常第三个 @font-face 是内容字体
  if (fontFaceMatches.length >= 3) {
    const base64Font = extractFontBase64(fontFaceMatches[2]);
    if (base64Font && config.siliconflowApiKey) {
      try {
        fontMapping = await decodeFontMapping(base64Font, config.siliconflowApiKey);
      } catch (e) {
        console.error("字体解码失败:", e);
      }
    }
  }

  // 解码文本
  const content = Object.keys(fontMapping).length > 0 ? decodeText(rawText, fontMapping) : rawText;

  return {
    title,
    content,
    html: rawHtml,
    url,
  };
}

export { parseZhihuUrl } from "./config";
