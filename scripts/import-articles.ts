import fs from "fs/promises"
import path from "path"
import iconv from "iconv-lite"
import jschardet from "jschardet"
import "dotenv/config"

// Cloudflare D1 REST API 客户端
class D1Client {
  private accountId: string
  private databaseId: string
  private token: string

  constructor(accountId: string, databaseId: string, token: string) {
    this.accountId = accountId
    this.databaseId = databaseId
    this.token = token
  }

  async execute(sql: string, params: unknown[] = []): Promise<unknown> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}/query`

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params }),
    })

    const result = (await response.json()) as {
      success: boolean
      errors?: Array<{ message: string }>
    }
    if (!result.success) {
      throw new Error(`D1 API 错误: ${JSON.stringify(result.errors)}`)
    }
    return result
  }
}

let db: D1Client

// 从文件名提取标题（去除开头序号）
function extractTitle(filename: string): string {
  // 去除 .txt 后缀
  const name = filename.replace(/\.txt$/, "")
  // 去除开头的数字序号（如 "1"、"01"、"10" 等）有时序号后还有. 也要去除
  return name.replace(/^[\d.]+\s*/, "").trim()
}

// 清洗文章内容
function cleanContent(content: string, title: string): string {
  let cleaned = content

  // 1. 如果存在"无障碍"，移除"无障碍"及之前的内容
  const barrierFreeIndex = cleaned.slice(0, 100).indexOf("无障碍")
  if (barrierFreeIndex !== -1) {
    cleaned = cleaned.slice(barrierFreeIndex + 3).trim()
  }

  // 2. 如果有"====="分割线，移除分割线及之前的内容
  const separatorMatch = cleaned.slice(0, 150).match(/={10,}/)
  if (separatorMatch) {
    const separatorIndex = cleaned.indexOf(separatorMatch[0])
    cleaned = cleaned.slice(separatorIndex + separatorMatch[0].length).trim()
  }

  // 移除开头的盗版说明
  const fanwei = cleaned.slice(0, 350)
  if (fanwei.indexOf(title) !== -1) {
    cleaned = cleaned.slice(fanwei.indexOf(title) + title.length).trim()
  }

  // 3. 移除"备案号:"及之后的内容
  const recordIndex = cleaned
    .slice(cleaned.length - 200)
    .indexOf("点击查看下一节")
  if (recordIndex !== -1) {
    const recordIndexInContent = cleaned.lastIndexOf("点击查看下一节")
    cleaned = cleaned.slice(0, recordIndexInContent).trim()
  }

  return cleaned
}

// 递归获取所有 txt 文件
async function getAllTxtFiles(dir: string): Promise<string[]> {
  const files: string[] = []
  const entries = await fs.readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await getAllTxtFiles(fullPath)))
    } else if (entry.name.endsWith(".txt")) {
      files.push(fullPath)
    }
  }

  return files
}

async function main() {
  // 检查环境变量
  if (
    !process.env.CLOUDFLARE_ACCOUNT_ID ||
    !process.env.CLOUDFLARE_DATABASE_ID ||
    !process.env.CLOUDFLARE_D1_TOKEN
  ) {
    console.error("❌ 缺少环境变量！请配置:")
    console.error("   CLOUDFLARE_ACCOUNT_ID")
    console.error("   CLOUDFLARE_DATABASE_ID")
    console.error("   CLOUDFLARE_D1_TOKEN")
    process.exit(1)
  }

  // 初始化 D1 客户端
  db = new D1Client(
    process.env.CLOUDFLARE_ACCOUNT_ID,
    process.env.CLOUDFLARE_DATABASE_ID,
    process.env.CLOUDFLARE_D1_TOKEN
  )

  const resourceDir = path.join(
    process.cwd(),
    "resource/知乎盐选付费文章BCEFGHJKZ开头合集"
  )

  console.log("🔍 扫描资源目录...")
  const txtFiles = await getAllTxtFiles(resourceDir)
  console.log(`📁 找到 ${txtFiles.length} 个 txt 文件\n`)

  let imported = 0
  let skipped = 0
  let failed = 0

  for (const filePath of txtFiles) {
    const filename = path.basename(filePath)
    const title = extractTitle(filename)
    const column = path.basename(path.dirname(filePath)) // 父文件夹名作为专栏

    try {
      const buffer = await fs.readFile(filePath)
      const detected = jschardet.detect(buffer)

      let content = ""
      if (
        detected.encoding &&
        detected.encoding !== "utf-8" &&
        detected.encoding !== "ascii"
      ) {
        // 如果检测到是 GB2312 或 GBK，统一用 gbk 解码
        if (["GB2312", "GBK"].includes(detected.encoding.toUpperCase())) {
          content = iconv.decode(buffer, "gbk")
        } else {
          // 其他编码尝试直接解码，如果不支持则回退到 utf-8
          try {
            content = iconv.decode(buffer, detected.encoding)
          } catch (e) {
            console.warn(
              `⚠️  无法解码 ${detected.encoding}，尝试使用 utf-8: ${title}`
            )
            content = buffer.toString("utf-8")
          }
        }
      } else {
        content = buffer.toString("utf-8")
      }

      content = cleanContent(content, title)

      if (!content || content.length < 50) {
        console.log(`⚠️  跳过（内容太短）: ${title}`)
        skipped++
        continue
      }

      const now = Math.floor(Date.now() / 1000) // Unix timestamp for SQLite
      const id = crypto.randomUUID()
      const url = `file://${filePath}`

      await db.execute(
        `INSERT INTO crawl_tasks (id, url, status, title, content, "column", created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, url, "COMPLETED", title, content, column, now, now]
      )

      console.log(`✅ 导入成功: ${title}`)
      imported++
    } catch (error) {
      console.error(`❌ 导入失败: ${title}`, error)
      failed++
    }
  }

  console.log("\n" + "=".repeat(50))
  console.log(`📊 导入完成！`)
  console.log(`   ✅ 成功: ${imported}`)
  console.log(`   ⏭️  跳过: ${skipped}`)
  console.log(`   ❌ 失败: ${failed}`)
  console.log("=".repeat(50))
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
