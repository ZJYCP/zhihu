/**
 * 字体解码测试脚本
 * 用法: npx tsx src/test-font.ts <知乎文章URL>
 */

import { chromium } from "playwright"
import { Config, getConfig, parseCookies } from "./config.js"
import {
  extractFontBase64,
  decodeFontMapping,
  decodeText,
} from "./font-decoder.js"

async function testFontDecode(url: string) {
  const config = getConfig()

  console.log("🚀 启动浏览器...")
  const browser = await chromium.launch({ headless: true }) // 显示浏览器便于调试
  const context = await browser.newContext({
    userAgent: config.userAgent,
    viewport: { width: 1280, height: 1000 },
  })

  if (config.cookie) {
    await context.addCookies(parseCookies(config.cookie, ".zhihu.com"))
  }

  const page = await context.newPage()

  // 阻止后续跳转
  let isFirst = true
  await page.route("**/*", route => {
    if (route.request().isNavigationRequest()) {
      if (isFirst) {
        isFirst = false
        route.continue()
      } else {
        route.abort()
      }
    } else {
      route.continue()
    }
  })

  try {
    console.log(`\n📖 打开: ${url}`)
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 })
    await page
      .waitForSelector('[class^="ManuscriptIntro-root-"]', { timeout: 10000 })
      .catch(() => {})
    await new Promise(r => setTimeout(r, 100))

    // 提取所有style标签和内联样式中的字体定义
    console.log("\n🔍 提取字体信息...")
    const fontCss = await page.evaluate(() => {
      debugger
      const styles: string[] = []
      // style标签
      // document
      //   .querySelectorAll("style")
      //   .forEach(s => styles.push(s.textContent || ""))
      // link样式表（同源）
      Array.from(document.styleSheets).forEach(sheet => {
        try {
          Array.from(sheet.cssRules).forEach(rule => {
            if (rule.cssText.includes("@font-face")) styles.push(rule.cssText)
          })
        } catch {}
      })
      return styles
    })

    // 提取原始文本
    const rawText = await page.evaluate(() => {
      const el = document.getElementById("manuscript")
      return el?.innerText || ""
    })

    console.log("\n📄 提取到的字体CSS:")
    const base64 = extractFontBase64(fontCss[2])
    if (!base64) {
      console.log("❌ 未找到自定义字体")
      await browser.close()
      return
    }

    console.log(`✅ 找到字体数据 (${Math.round(base64.length / 1024)}KB)`)

    // 解码字体映射
    console.log("\n🔤 解析字体映射...")
    const mapping = await decodeFontMapping(base64, { useOnlineOcr: true })
    console.log("映射表:", mapping)

    console.log("\n📝 原始文本 (前500字):")
    console.log(rawText.slice(0, 100))

    // 解码文本
    const decoded = decodeText(rawText, mapping)
    console.log("\n✅ 解码后文本 (前500字):")
    console.log(decoded.slice(0, 100))
  } finally {
    await browser.close()
  }
}

const url = process.argv[2]
if (!url) {
  console.log("用法: npx tsx src/test-font.ts <知乎文章URL>")
  process.exit(1)
}

testFontDecode(url).catch(console.error)
