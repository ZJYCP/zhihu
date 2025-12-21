import { chromium, Browser, BrowserContext } from "playwright"
import { Config, parseCookies } from "./config.js"
import { ocrImages } from "./ocr.js"
import {
  extractFontBase64,
  decodeFontMapping,
  decodeText,
  FontMapping,
} from "./font-decoder.js"
import fs from "fs/promises"
import path from "path"
import sharp from "sharp"

export interface CrawlResult {
  title: string
  content: string
  html: string
  author?: string
  publishTime?: string
  url: string
}

export class ZhihuCrawler {
  private config: Config
  private browser: Browser | null = null
  private context: BrowserContext | null = null
  private fontCache: Map<string, FontMapping> = new Map() // 字体映射缓存

  constructor(config: Config) {
    this.config = config
  }

  async init(): Promise<void> {
    console.log("🚀 正在启动浏览器...")
    this.browser = await chromium.launch({
      headless: true,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
      ],
    })

    // PC 端 userAgent，但使用移动端窗口尺寸
    this.context = await this.browser.newContext({
      userAgent: this.config.userAgent,
      viewport: { width: 1280, height: 1000 },
      locale: "zh-CN",
      javaScriptEnabled: true, // 先启用 JS 加载内容
    })

    // 注入 Cookie
    if (this.config.cookie) {
      const cookies = parseCookies(this.config.cookie, ".zhihu.com")
      await this.context.addCookies(cookies)
    }

    console.log("✅ 浏览器已启动")
  }

  async close(): Promise<void> {
    if (this.context) await this.context.close()
    if (this.browser) await this.browser.close()
    console.log("🔒 浏览器已关闭")
  }

  /**
   * 将截图裁切成多个固定高度的图片
   * 返回包含文件路径和 base64 data URL 的数组
   */
  private async splitScreenshot(
    imageBuffer: Buffer,
    outputDir: string,
    sliceHeight: number = 2000
  ): Promise<{ path: string; dataUrl: string }[]> {
    const image = sharp(imageBuffer)
    const metadata = await image.metadata()

    if (!metadata.width || !metadata.height) {
      throw new Error("无法获取图片尺寸")
    }

    const { width, height } = metadata
    const sliceCount = Math.ceil(height / sliceHeight)
    const results: { path: string; dataUrl: string }[] = []

    // 创建子文件夹
    const slicesDir = path.join(outputDir, "screenshot_slices")
    await fs.mkdir(slicesDir, { recursive: true })

    console.log(
      `  📐 图片尺寸: ${width}x${height}，将裁切为 ${sliceCount} 张图片`
    )

    for (let i = 0; i < sliceCount; i++) {
      const top = i * sliceHeight
      const extractHeight = Math.min(sliceHeight, height - top)

      const slicePath = path.join(
        slicesDir,
        `slice_${String(i + 1).padStart(3, "0")}.png`
      )

      // 裁切并获取 Buffer
      const sliceBuffer = await sharp(imageBuffer)
        .extract({ left: 0, top, width, height: extractHeight })
        .toBuffer()

      // 保存文件
      // await fs.writeFile(slicePath, sliceBuffer)

      // 生成 base64 data URL
      const base64 = sliceBuffer.toString("base64")
      const dataUrl = `data:image/png;base64,${base64}`

      results.push({ path: slicePath, dataUrl })
      // console.log(
      //   `  ✂️ 已保存: slice_${String(i + 1).padStart(
      //     3,
      //     "0"
      //   )}.png (高度: ${extractHeight}px)`
      // )
    }

    return results
  }

  /**
   * 自动模式爬取 - 快速截图防止跳转
   */
  async crawlPaidColumn(url: string): Promise<CrawlResult> {
    if (!this.context) throw new Error("浏览器未初始化")

    const page = await this.context.newPage()

    // 记录是否是首次导航
    let isFirstNavigation = true

    // 在导航前设置路由拦截，阻止后续跳转
    await page.route("**/*", route => {
      const request = route.request()
      if (request.isNavigationRequest()) {
        if (isFirstNavigation) {
          isFirstNavigation = false
          route.continue()
        } else {
          console.log("  🚫 阻止跳转:", request.url())
          route.abort()
        }
      } else {
        route.continue()
      }
    })

    // 注入脚本：页面加载后立即阻止跳转
    await page.addInitScript(() => {
      // 延迟执行，等 DOM 准备好
      setTimeout(() => {
        // 阻止 location 修改
        const originalLocation = window.location
        Object.defineProperty(window, "location", {
          get: () => originalLocation,
          set: () => {},
          configurable: false,
        })
        // 阻止 window.close
        window.close = () => {}
        // 阻止 history 操作
        history.pushState = () => {}
        history.replaceState = () => {}
        // 阻止 setTimeout/setInterval 跳转
        const originalSetTimeout = window.setTimeout
        window.setTimeout = ((
          fn: TimerHandler,
          delay?: number,
          ...args: unknown[]
        ) => {
          if (typeof fn === "string" && fn.includes("location")) {
            return 0 as unknown as ReturnType<typeof setTimeout>
          }
          return originalSetTimeout(fn, delay, ...args)
        }) as typeof setTimeout
      }, 100)
    })

    try {
      console.log(`\n📖 正在打开: ${url}`)
      console.log("  ⏳ 等待页面加载...")

      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 })

      // 等待内容加载（等待文章内容区域出现）
      console.log("  ⏳ 等待内容渲染...")
      try {
        await page.waitForSelector('[class^="ManuscriptIntro-root-"]', {
          timeout: 10000,
        })
        await page.addStyleTag({
          content:
            "p { margin-bottom: 0 !important; padding-bottom: 0 !important; font-size: 32px !important; }",
        })
      } catch {
        console.log("  ⚠️ 未找到标准内容区域")
      }

      // 额外等待确保内容渲染完成
      await this.delay(100)

      console.log("  🛡️ 已阻止页面跳转")

      // 导出 PDF
      console.log("\n📄 正在导出 PDF...")

      // 强制使用屏幕媒体类型（避免 @media print 隐藏内容）
      // await page.emulateMedia({ media: "screen" })

      // 提取title ManuscriptTitle-root-gcmVk
      const titleElement = await page.$('[class^="ManuscriptTitle-root-"]')
      const title =
        (await titleElement?.evaluate(el => el.textContent?.trim() || "")) ||
        `未提取到标题${Math.random().toString(36).substring(2, 6)}`

      // 只保留 #manuscript 元素，隐藏其他内容
      await page.evaluate(() => {
        const manuscript = document.getElementById("manuscript")
        if (manuscript) {
          // 将 manuscript 移到 body 下，隐藏其他所有元素
          document.body.innerHTML = ""
          document.body.appendChild(manuscript)
          // 设置样式确保正常显示
          document.body.style.padding = "20px"
          document.body.style.margin = "0"
          manuscript.style.maxWidth = "100%"
        }
        window.scrollTo(0, 0)
      })
      // 截取完整元素并裁切成多张图片
      console.log("\n📸 正在截取完整内容...")
      const form = await page.$("#manuscript")

      const screenshotBuffer = await form!.screenshot()

      // 裁切成高度为2000的多张图片
      const sliceResults = await this.splitScreenshot(
        screenshotBuffer,
        this.config.outputDir,
        2000
      )
      // console.log(
      //   `  ✅ 已保存 ${sliceResults.length} 张裁切图片到 screenshot_slices 文件夹`
      // )

      // 调用远程 OCR 接口识别所有图片
      console.log("\n🔍 正在进行 OCR 识别...")
      const ocrResults = await ocrImages(sliceResults.map(s => s.dataUrl))
      const content = ocrResults.map(r => r.content).join("\n\n")
      console.log(`  ✅ OCR 识别完成，共识别 ${ocrResults.length} 张图片`)

      // 保存识别结果到文件
      const contentPath = path.join(this.config.outputDir, `${title}.md`)
      // await fs.writeFile(contentPath, `# ${title}\n\n${content}`, "utf-8")
      // console.log(`  📝 已保存内容到: ${contentPath}`)

      return {
        title,
        content,
        html: "",
        author: undefined,
        publishTime: undefined,
        url,
      }
    } finally {
      console.log("\n💡 处理完成")
    }
  }

  async delay(ms?: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms || this.config.requestDelay))
  }

  /**
   * 字体解码模式爬取 - 解析字体映射后替换文本
   */
  async crawlWithFontDecode(url: string): Promise<CrawlResult> {
    if (!this.context) throw new Error("浏览器未初始化")

    const page = await this.context.newPage()
    let isFirstNavigation = true

    await page.route("**/*", route => {
      const request = route.request()
      if (request.isNavigationRequest()) {
        if (isFirstNavigation) {
          isFirstNavigation = false
          route.continue()
        } else {
          route.abort()
        }
      } else {
        route.continue()
      }
    })

    try {
      console.log(`\n📖 正在打开: ${url}`)
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 })

      console.log("  ⏳ 等待内容渲染...")
      await page
        .waitForSelector('[class^="ManuscriptIntro-root-"]', { timeout: 10000 })
        .catch(() => {
          console.log("  ⚠️ 未找到标准内容区域")
        })
      await this.delay(100)

      // 提取字体CSS
      console.log("\n🔤 提取字体信息...")
      const fontCss = await page.evaluate(() => {
        const styles: string[] = []

        Array.from(document.styleSheets).forEach(sheet => {
          try {
            Array.from(sheet.cssRules).forEach(rule => {
              if (rule.cssText.includes("@font-face")) styles.push(rule.cssText)
            })
          } catch {}
        })
        return styles
      })

      // 提取原始文本并解码
      const rawText = await page.evaluate(() => {
        const el = document.getElementById("manuscript")
        return el?.innerText || ""
      })
      // 提取HTML
      const html = await page.evaluate(() => {
        const el = document.getElementById("manuscript")
        return el?.innerHTML || ""
      })
      // 提取标题
      const title = await page
        .$eval(
          '[class^="ManuscriptTitle-root-"]',
          el => el.textContent?.trim() || ""
        )
        .catch(() => `未知标题_${Date.now()}`)

      const base64Font = extractFontBase64(fontCss[2])
      let mapping: FontMapping = {}

      if (base64Font) {
        // 检查缓存
        const cacheKey = base64Font.slice(0, 100)
        if (this.fontCache.has(cacheKey)) {
          mapping = this.fontCache.get(cacheKey)!
          console.log(
            `  ✅ 使用缓存的字体映射 (${Object.keys(mapping).length} 字符)`
          )
        } else {
          console.log(
            `  📦 字体大小: ${Math.round(base64Font.length / 1024)}KB`
          )
          mapping = await decodeFontMapping(base64Font, { useOnlineOcr: true })
          this.fontCache.set(cacheKey, mapping)
        }
      } else {
        console.log("  ⚠️ 未检测到自定义字体")
      }

      const content =
        Object.keys(mapping).length > 0 ? decodeText(rawText, mapping) : rawText

      console.log(`\n✅ 内容提取完成 (${content.length} 字符)`)

      return { title, content, html, url }
    } finally {
      await page.close()
    }
  }
}
