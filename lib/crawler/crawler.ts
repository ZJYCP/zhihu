import * as cheerio from "cheerio"
import { CrawlerConfig, parseZhihuUrl } from "./config"
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
    const parsed = parseZhihuUrl(url)

    if (parsed.type === "question") {
      return this.crawlQuestion(url)
    }

    return this.crawlPaidColumn(url)
  }

  // 爬取问答页面
  private async crawlQuestion(url: string): Promise<CrawlResult> {
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

    // 提取字体 CSS - 问答页面字体在第一个 @font-face
    let fontMapping: FontMapping = {}
    const styleContent = $("style").text()
    const fontFaceMatches = styleContent.match(/@font-face\s*\{[^}]+\}/g) || []

    if (fontFaceMatches.length >= 1) {
      const base64Font = extractFontBase64(fontFaceMatches[0]!)
      if (base64Font) {
        try {
          fontMapping = await decodeFontMapping(base64Font)
        } catch (e) {
          console.error("字体解码失败:", e)
        }
      }
    }

    // 提取标题 - 在 .QuestionHeader-title
    const title =
      $(".QuestionHeader-title").first().text().trim() ||
      $("title").text().trim() ||
      `未知标题_${Date.now()}`

    // 提取作者 - 在 .AuthorInfo-name 里的 a 标签
    const author =
      $(".AuthorInfo-name a").first().text().trim() || undefined

    // 提取内容 - 在 .RichContent-inner 里面的 p 标签
    const contentEl = $(".RichContent-inner").first()
    const rawHtml = contentEl.html() || ""

    // 提取文本内容 - 移除不需要的元素
    const contentClone = contentEl.clone()
    // 移除 style、script、noscript 等非内容元素
    contentClone.find("style, script, noscript, svg, button").remove()
    // 为块级元素添加换行
    contentClone
      .find("p, div, br, h1, h2, h3, h4, h5, h6, li, blockquote")
      .each((_, el) => {
        $(el).append("\n")
      })
    // 提取文本并清理 CSS 类名残留（形如 .css-xxx）
    const rawText = contentClone
      .text()
      .replace(/\.css-[\w-]+\{[^}]*\}/g, "") // 移除内联 CSS 规则
      .replace(/\.css-[\w-]+/g, "") // 移除 CSS 类名引用
      .replace(/\n{3,}/g, "\n\n")
      .trim()

    // 字体解码
    const content =
      Object.keys(fontMapping).length > 0
        ? decodeText(rawText, fontMapping)
        : rawText

    return { title, content, html: rawHtml, author, url }
  }

  // 爬取付费专栏页面（原有逻辑）
  private async crawlPaidColumn(url: string): Promise<CrawlResult> {
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
