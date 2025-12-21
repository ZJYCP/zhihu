import { getConfig, parseZhihuUrl } from "./config.js"
import { ZhihuCrawler } from "./crawler.js"
import { parseContent } from "./parser.js"
import { Exporter } from "./exporter.js"

/**
 * 知乎爬虫主程序
 */
async function main() {
  // 获取命令行参数
  const args = process.argv.slice(2)

  // 调试：显示接收到的参数
  console.log("📥 接收到的参数:", args)

  // 检查是否启用调试模式
  const debugIndex = args.indexOf("--debug")
  const debug = debugIndex !== -1
  if (debug) {
    args.splice(debugIndex, 1)
  }

  console.log(`🔍 Debug模式: ${debug ? "开启" : "关闭"}`)

  if (args.length === 0) {
    printUsage()
    // 使用示例URL进行测试
    console.log("\n📌 使用示例URL进行测试...\n")
    args.push(
      "https://www.zhihu.com/market/paid_column/1702723501155422208/section/1788920608135983104"
      // "https://www.zhihu.com/market/paid_column/1762134823798050816/section/1763886015264251905"
    )
  }

  const url = args[0]
  const urlInfo = parseZhihuUrl(url)

  if (urlInfo.type === "unknown") {
    console.error("❌ 不支持的URL格式")
    printUsage()
    process.exit(1)
  }

  console.log("╔════════════════════════════════════════════════════════════╗")
  console.log("║           知乎付费专栏爬虫 v2.0                            ║")
  console.log("║           基于Playwright + 读屏技术                        ║")
  console.log("╚════════════════════════════════════════════════════════════╝")
  console.log("")

  if (debug) {
    console.log("🔧 调试模式已启用")
  }

  const config = getConfig()
  const crawler = new ZhihuCrawler(config)
  const exporter = new Exporter(config.outputDir)

  try {
    // 初始化浏览器
    await crawler.init()

    // 爬取内容
    console.log(`\n🎯 URL类型: ${urlInfo.type}`)
    console.log(`📁 输出目录: ${config.outputDir}\n`)

    let result
    switch (urlInfo.type) {
      case "paid_column":
        result = await crawler.crawlWithFontDecode(url)
        break
      default:
        console.log("⚠️ 当前版本仅支持付费专栏，其他类型待实现")
        result = await crawler.crawlPaidColumn(url) // 尝试通用方法
    }

    // 解析内容
    const parsed = parseContent(result)

    // 导出所有格式
    console.log("\n📦 正在导出文件...\n")
    const outputs = await exporter.exportText(result)

    // 打印结果
    console.log("\n" + "═".repeat(60))
    console.log("✅ 爬取完成！")
    // console.log("═".repeat(60))
    // console.log(`📌 标题: ${result.title}`)
    // console.log(`👤 作者: ${result.author || "未知"}`)
    // console.log(`📅 时间: ${result.publishTime || "未知"}`)
    // console.log(`📝 段落数: ${parsed.paragraphs.length}`)
    // console.log(`🖼️ 图片数: ${parsed.images.length}`)
    // console.log("")
    // console.log("📂 输出文件:")
    // console.log(`   - Markdown: ${outputs.markdown}`)
    // console.log(`   - HTML: ${outputs.html}`)
    // console.log(`   - Text: ${outputs.text}`)
    // console.log(`   - JSON: ${outputs.json}`)
    console.log("═".repeat(60))
  } catch (error) {
    console.error("\n❌ 爬取失败:", error)
    process.exit(1)
  } finally {
    await crawler.close()
  }
}

function printUsage() {
  console.log(`
使用方法:
  npm run crawl <知乎URL> [--debug]

支持的URL格式:
  - 付费专栏: https://www.zhihu.com/market/paid_column/xxx/section/xxx
  - 问答(待实现): https://www.zhihu.com/question/xxx/answer/xxx
  - 专栏文章(待实现): https://zhuanlan.zhihu.com/p/xxx

选项:
  --debug    启用调试模式，显示浏览器窗口并保存调试信息

示例:
  npm run crawl "https://www.zhihu.com/market/paid_column/1702723501155422208/section/1788920608135983104"
  npm run crawl "https://www.zhihu.com/market/paid_column/1702723501155422208/section/1788920608135983104" --debug
`)
}

// 运行主程序
main().catch(console.error)
