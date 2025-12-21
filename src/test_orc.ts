import fs from "fs/promises"
import path from "path"
import { ocrImage } from "./ocr.js"
import "dotenv/config"

async function main() {
  const imagePath = path.join(
    process.cwd(),
    "output",
    "screenshot_slices",
    "slice_001.png"
  )

  console.log(`📖 读取图片: ${imagePath}`)

  // 读取图片并转换为 base64 data URL
  const imageBuffer = await fs.readFile(imagePath)
  const base64 = imageBuffer.toString("base64")
  const dataUrl = `data:image/png;base64,${base64}`

  console.log(`📐 图片大小: ${(imageBuffer.length / 1024).toFixed(2)} KB`)
  console.log(`🔍 正在调用 OCR 接口...\n`)

  // 调用 OCR
  const result = await ocrImage(dataUrl)

  console.log("=".repeat(50))
  console.log("📝 识别结果:")
  console.log("=".repeat(50))
  console.log(result.content)
  console.log("=".repeat(50))

  if (result.usage) {
    console.log(
      `\n📊 Token 用量: ${result.usage.prompt_tokens} + ${result.usage.completion_tokens} = ${result.usage.total_tokens}`
    )
  }
}

main().catch(console.error)
