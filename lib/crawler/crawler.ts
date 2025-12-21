import { chromium, Browser, BrowserContext } from "playwright";
import { CrawlerConfig, parseCookies } from "./config";
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
}

export class ZhihuCrawler {
  private config: CrawlerConfig;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private fontCache: Map<string, FontMapping> = new Map();

  constructor(config: CrawlerConfig) {
    this.config = config;
  }

  async init(): Promise<void> {
    if (this.config.browserlessToken) {
      // Vercel 部署使用远程浏览器
      this.browser = await chromium.connect(
        `wss://chrome.browserless.io?token=${this.config.browserlessToken}`
      );
    } else {
      // 本地开发使用本地浏览器
      this.browser = await chromium.launch({
        headless: true,
        args: ["--disable-blink-features=AutomationControlled"],
      });
    }

    this.context = await this.browser.newContext({
      userAgent: this.config.userAgent,
      viewport: { width: 1280, height: 1000 },
      locale: "zh-CN",
    });

    if (this.config.cookie) {
      const cookies = parseCookies(this.config.cookie, ".zhihu.com");
      await this.context.addCookies(cookies);
    }
  }

  async close(): Promise<void> {
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
  }

  async crawl(url: string): Promise<CrawlResult> {
    if (!this.context) throw new Error("浏览器未初始化");

    const page = await this.context.newPage();
    let isFirstNavigation = true;

    await page.route("**/*", (route) => {
      const request = route.request();
      if (request.isNavigationRequest()) {
        if (isFirstNavigation) {
          isFirstNavigation = false;
          route.continue();
        } else {
          route.abort();
        }
      } else {
        route.continue();
      }
    });

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

      await page
        .waitForSelector('[class^="ManuscriptIntro-root-"]', { timeout: 10000 })
        .catch(() => {});

      await new Promise((r) => setTimeout(r, 100));

      // 提取字体CSS
      const fontCss = await page.evaluate(() => {
        const styles: string[] = [];
        Array.from(document.styleSheets).forEach((sheet) => {
          try {
            Array.from(sheet.cssRules).forEach((rule) => {
              if (rule.cssText.includes("@font-face"))
                styles.push(rule.cssText);
            });
          } catch {}
        });
        return styles;
      });

      const rawText = await page.evaluate(() => {
        return document.getElementById("manuscript")?.innerText || "";
      });

      const html = await page.evaluate(() => {
        return document.getElementById("manuscript")?.innerHTML || "";
      });

      const title = await page
        .$eval(
          '[class^="ManuscriptTitle-root-"]',
          (el) => el.textContent?.trim() || ""
        )
        .catch(() => `未知标题_${Date.now()}`);

      // 字体解码
      const base64Font = fontCss[2] ? extractFontBase64(fontCss[2]) : null;
      let mapping: FontMapping = {};

      if (base64Font) {
        const cacheKey = base64Font.slice(0, 100);
        if (this.fontCache.has(cacheKey)) {
          mapping = this.fontCache.get(cacheKey)!;
        } else {
          mapping = await decodeFontMapping(base64Font);
          this.fontCache.set(cacheKey, mapping);
        }
      }

      const content =
        Object.keys(mapping).length > 0 ? decodeText(rawText, mapping) : rawText;

      return { title, content, html, url };
    } finally {
      await page.close();
    }
  }
}
