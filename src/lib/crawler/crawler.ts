import type { AnyNode } from "domhandler";
import * as cheerio from "cheerio";
import { CrawlerConfig, parseZhihuUrl } from "./config";
import {
  extractFontBase64,
  decodeFontMapping,
  decodeText,
  FontMapping,
} from "./font-decoder";

export interface CrawlResult {
  title: string;
  content: string;
  html: string;
  author?: string;
  url: string;
  fontDecodeSuccess: boolean; // 字体解码是否成功
}

/** 知乎页面通用请求头 */
function zhihuHeaders(config: CrawlerConfig): Record<string, string> {
  return {
    "User-Agent": config.userAgent,
    Cookie: config.cookie,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    Referer: "https://www.zhihu.com/",
  };
}

/** 抓取知乎页面 HTML，失败抛错 */
async function fetchZhihuHtml(url: string, config: CrawlerConfig): Promise<string> {
  const response = await fetch(url, {
    headers: zhihuHeaders(config),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`请求失败: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

/** 从页面的 @font-face 中按索引提取字体并解码，返回 {映射, 是否成功} */
async function extractFontMapping(
  $: cheerio.CheerioAPI,
  fontIndex: number,
): Promise<{ mapping: FontMapping; success: boolean }> {
  const styleContent = $("style").text();
  const fontFaceMatches = styleContent.match(/@font-face\s*\{[^}]+\}/g) || [];
  if (fontFaceMatches.length <= fontIndex) {
    return { mapping: {}, success: true }; // 无自定义字体视为成功
  }

  const base64Font = extractFontBase64(fontFaceMatches[fontIndex]!);
  if (!base64Font) {
    return { mapping: {}, success: true };
  }

  try {
    return { mapping: await decodeFontMapping(base64Font), success: true };
  } catch (e) {
    console.error("字体解码失败:", e);
    return { mapping: {}, success: false };
  }
}

/** 模拟 innerText：为块级元素追加换行，再提取纯文本 */
function htmlToText(
  el: cheerio.Cheerio<AnyNode>,
  blockTags = "p, div, br, h1, h2, h3, h4, h5, h6, li, blockquote",
): string {
  const clone = el.clone();
  clone.find(blockTags).append("\n");
  return clone
    .text()
    .replace(/\.css-[\w-]+\{[^}]*\}/g, "") // 移除内联 CSS 规则
    .replace(/\.css-[\w-]+/g, "") // 移除 CSS 类名引用
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** 解码后的文本（无映射时原样返回） */
function applyFontMapping(rawText: string, mapping: FontMapping): string {
  return Object.keys(mapping).length > 0
    ? decodeText(rawText, mapping)
    : rawText;
}

export class ZhihuCrawler {
  private config: CrawlerConfig;

  constructor(config: CrawlerConfig) {
    this.config = config;
  }

  // 保持接口兼容，但现在不需要做任何事
  async init(): Promise<void> {}
  async close(): Promise<void> {}

  async crawl(url: string): Promise<CrawlResult> {
    const parsed = parseZhihuUrl(url);

    if (parsed.type === "question") {
      return this.crawlQuestion(url);
    }
    if (parsed.type === "paid_column") {
      return this.crawlPaidColumn(url);
    }
    throw new Error(`不支持的 URL 格式: ${url}`);
  }

  // 爬取问答页面（字体在第一个 @font-face，索引 0）
  private async crawlQuestion(url: string): Promise<CrawlResult> {
    const html = await fetchZhihuHtml(url, this.config);
    const $ = cheerio.load(html);

    const { mapping, success } = await extractFontMapping($, 0);

    const title =
      $(".QuestionHeader-title").first().text().trim() ||
      $("title").text().trim() ||
      `未知标题_${Date.now()}`;
    const author = $(".AuthorInfo-name a").first().text().trim() || undefined;

    const contentEl = $(".RichContent-inner").first();
    const rawHtml = contentEl.html() || "";
    // 移除非内容元素后再取文本
    contentEl.find("style, script, noscript, svg, button").remove();
    const content = applyFontMapping(htmlToText(contentEl), mapping);

    return { title, content, html: rawHtml, author, url, fontDecodeSuccess: success };
  }

  // 爬取付费专栏页面（加密字体通常在第三个 @font-face，索引 2）
  private async crawlPaidColumn(url: string): Promise<CrawlResult> {
    const html = await fetchZhihuHtml(url, this.config);
    const $ = cheerio.load(html);

    const { mapping, success } = await extractFontMapping($, 2);

    const manuscriptEl = $("#manuscript");
    const rawHtml = manuscriptEl.html() || "";
    const content = applyFontMapping(
      htmlToText(manuscriptEl, "p, div, br, h1, h2, h3, h4, h5, h6, li"),
      mapping,
    );

    const title =
      $('[class^="ManuscriptTitle-root-"]').first().text().trim() ||
      $("title").text().trim() ||
      `未知标题_${Date.now()}`;
    const author =
      $('[class^="AuthorInfo-name-"]').first().text().trim() || undefined;

    return { title, content, html: rawHtml, author, url, fontDecodeSuccess: success };
  }
}
