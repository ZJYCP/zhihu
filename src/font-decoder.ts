/**
 * 知乎字体反爬解码器
 * 解析自定义字体，通过OCR建立字符映射表
 */

import opentype from "opentype.js"
import sharp from "sharp"
import Tesseract from "tesseract.js"
import { ocrImage } from "./ocr.js"

export interface FontMapping {
  [unicode: string]: string // 原unicode -> 真实字符
}

export interface DecodeFontOptions {
  useOnlineOcr?: boolean // 是否使用在线OCR，默认false使用本地tesseract
}

/**
 * 从CSS中提取base64字体数据
 */
export function extractFontBase64(css: string): string | null {
  // 匹配 data:font/xxx;base64,... 或带 charset 的格式
  const match = css.match(
    /url\("?data:(?:font\/\w+|application\/x-font-\w+)(?:;charset=[\w-]+)?;base64,([^")]+)"?\)/
  )
  return match ? match[1] : null
}

/**
 * 将字形绘制为PNG图片
 */
async function glyphToImage(
  glyph: opentype.Glyph,
  font: opentype.Font,
  size = 64
): Promise<Buffer> {
  const padding = 8
  const canvas = size + padding * 2

  // 计算缩放和位置
  const scale = size / font.unitsPerEm
  const baseline = canvas - padding - font.descender * scale * -1

  // 获取路径SVG
  const path = glyph.getPath(padding, baseline, size)
  const pathData = path.toPathData(2)

  // 生成SVG
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas}" height="${canvas}">
    <rect width="100%" height="100%" fill="white"/>
    <path d="${pathData}" fill="black"/>
  </svg>`

  return sharp(Buffer.from(svg)).png().toBuffer()
}

/**
 * 解析字体并建立映射表
 */
export async function decodeFontMapping(
  base64Font: string,
  options: DecodeFontOptions = {}
): Promise<FontMapping> {
  const { useOnlineOcr = false } = options
  const fontBuffer = Buffer.from(base64Font, "base64")
  const font = opentype.parse(
    fontBuffer.buffer.slice(
      fontBuffer.byteOffset,
      fontBuffer.byteOffset + fontBuffer.byteLength
    )
  )

  const mapping: FontMapping = {}
  const toProcess: { unicode: number; glyph: opentype.Glyph }[] = []

  // 直接遍历字体中的 glyphs（比遍历整个 CJK 区快得多）
  for (let i = 0; i < font.glyphs.length; i++) {
    const glyph = font.glyphs.get(i)
    // 使用 unicodes 数组获取所有映射的 unicode
    const unicodes = (glyph as any).unicodes as number[] | undefined
    if (!unicodes || unicodes.length === 0) continue

    const path = glyph.getPath(0, 0, 100)
    const pathData = path.toPathData(2)
    if (pathData && pathData.length > 0) {
      // 每个 unicode 都添加到处理列表
      for (const unicode of unicodes) {
        toProcess.push({ unicode, glyph })
      }
    }
  }

  console.log(`  📝 发现 ${toProcess.length} 个字形需要识别`)

  if (toProcess.length === 0) return mapping

  // 批量绘制图片
  const images: { unicode: number; dataUrl: string }[] = []
  for (const { unicode, glyph } of toProcess) {
    const imgBuffer = await glyphToImage(glyph, font, 128)
    const dataUrl = `data:image/png;base64,${imgBuffer.toString("base64")}`
    images.push({ unicode, dataUrl })
  }

  // Fisher-Yates 洗牌 乱序处理，防止OCR因为字符顺序产生联想
  for (let i = images.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[images[i], images[j]] = [images[j], images[i]]
  }

  // 合并成一张大图进行OCR
  const cols = Math.min(10, images.length)
  const rows = Math.ceil(images.length / cols)
  const cellSize = 80
  const margin = 20
  const compositeImages: sharp.OverlayOptions[] = []

  for (let i = 0; i < images.length; i++) {
    const imgBuffer = Buffer.from(images[i].dataUrl.split(",")[1], "base64")
    const resized = await sharp(imgBuffer)
      .resize(cellSize, cellSize, { fit: "contain", background: "white" })
      .toBuffer()
    compositeImages.push({
      input: resized,
      left: margin + (i % cols) * cellSize,
      top: margin + Math.floor(i / cols) * cellSize,
    })
  }

  const gridImage = await sharp({
    create: {
      width: cols * cellSize + margin * 2,
      height: rows * cellSize + margin * 2,
      channels: 3,
      background: "white",
    },
  })
    .composite(compositeImages)
    .png()
    .toBuffer()

  // 保存调试图片
  const fs = await import("fs")
  const pathModule = await import("path")
  const tmpFile = pathModule.join(process.cwd(), "temp_grid.png")
  fs.writeFileSync(tmpFile, gridImage)
  console.log(`  📷 网格图已保存: ${tmpFile}`)

  let chars: string[]

  if (useOnlineOcr) {
    // 使用在线 OCR API
    console.log("  🔍 正在进行在线 OCR 识别...")
    const gridDataUrl = `data:image/png;base64,${gridImage.toString("base64")}`
    const prompt = `\n<|grounding|>Convert the document to markdown.`
    const result = await ocrImage(gridDataUrl, { prompt })
    // 提取 <|ref|>...<|/det|> 标记后的内容
    const content =
      result.content?.replace(/<\|ref\|>.*?<\|\/det\|>/g, "").trim() || ""
    chars = content.replace(/[\s\n]/g, "").split("")
  } else {
    // 使用 tesseract.js 本地 OCR（中文简体）
    console.log("  🔍 正在进行本地 OCR 识别...")
    const { data } = await Tesseract.recognize(gridImage, "chi_sim", {
      logger: m =>
        m.status === "recognizing text" &&
        console.log(`  ⏳ ${Math.round(m.progress * 100)}%`),
    })
    chars = data.text.replace(/[\s\n]/g, "").split("")
  }

  console.log(`  📝 OCR 识别结果: ${chars.join(" ")}`)

  if (chars.length !== images.length) {
    console.log("  ⚠️ OCR 识别字符数与图片数不一致，可能存在识别错误")
  }

  // 建立映射
  for (let i = 0; i < Math.min(chars.length, images.length); i++) {
    const char = chars[i]
    if (char && char.trim()) {
      const originalChar = String.fromCodePoint(images[i].unicode)
      mapping[originalChar] = char
    }
  }

  console.log(`  ✅ 成功建立 ${Object.keys(mapping).length} 个字符映射`)
  return mapping
}

/**
 * 使用映射表替换文本中的字符
 */
export function decodeText(text: string, mapping: FontMapping): string {
  // 一次性遍历替换，避免链式替换问题
  return [...text].map(char => mapping[char] ?? char).join("")
}

/**
 * 从页面HTML/CSS中提取字体并解码文本
 */
export async function decodeZhihuText(
  css: string,
  text: string
): Promise<string> {
  const base64 = extractFontBase64(css)
  if (!base64) {
    console.log("  ⚠️ 未找到自定义字体，返回原文")
    return text
  }

  console.log("  🔤 检测到自定义字体，开始解码...")
  const mapping = await decodeFontMapping(base64)
  return decodeText(text, mapping)
}
