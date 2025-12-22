import * as cheerio from "cheerio"
import { CrawlerConfig } from "./config"
import {
  extractFontBase64,
  decodeFontMapping,
  decodeText,
  FontMapping,
} from "./font-decoder"

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

export interface CrawlResult {
  title: string
  content: string
  html: string
  author?: string
  url: string
}

export class ZhihuCrawler {
  private config: CrawlerConfig
  private fontCache: Map<string, FontMapping> = new Map()

  constructor(config: CrawlerConfig) {
    this.config = config
  }

  // 保持接口兼容，但现在不需要做任何事
  async init(): Promise<void> {}
  async close(): Promise<void> {}

  async crawl(url: string): Promise<CrawlResult> {
    // 直接请求页面
    const response = await fetch(url, {
      headers: {
        "User-Agent": this.config.userAgent || USER_AGENT,
        Cookie: this.config.cookie,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        Referer: "https://www.zhihu.com/",
      },
    })

    if (!response.ok) {
      throw new Error(`请求失败: ${response.status} ${response.statusText}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // 提取字体 CSS
    let fontMapping: FontMapping = {}
    const styleContent = $("style").text()
    const fontFaceMatches = styleContent.match(/@font-face\s*\{[^}]+\}/g) || []

    // 提取内容
    const manuscriptEl = $("#manuscript")
    const rawHtml = manuscriptEl.html() || ""
    // 模拟 innerText：块级元素转换为换行符
    const manuscriptClone = manuscriptEl.clone()
    manuscriptClone
      .find("p, div, br, h1, h2, h3, h4, h5, h6, li")
      .each((_, el) => {
        $(el).append("\n")
      })
    const rawText = manuscriptClone
      .text()
      .replace(/\n{3,}/g, "\n\n")
      .trim()

    // 提取标题
    const title =
      $('[class^="ManuscriptTitle-root-"]').first().text().trim() ||
      $("title").text().trim() ||
      `未知标题_${Date.now()}`

    // 提取作者（如果有）
    const author =
      $('[class^="AuthorInfo-name-"]').first().text().trim() || undefined

    // 字体解码 - 通常是第三个 @font-face（索引2）包含加密字体
    // 但为了健壮性，我们尝试找到包含 base64 的那个
    if (fontFaceMatches.length >= 3) {
      const base64Font = extractFontBase64(fontFaceMatches[2])
      if (base64Font) {
        try {
          fontMapping = await decodeFontMapping(base64Font)
        } catch (e) {
          console.error("字体解码失败:", e)
        }
      }
    }

    const content =
      Object.keys(fontMapping).length > 0
        ? decodeText(rawText, fontMapping)
        : rawText

    return { title, content, html: rawHtml, author, url }
  }
}
