import opentype from "opentype.js"

import { ocrImage } from "./ocr"
import { svgToPng, uint8ArrayToBase64 } from "./svg-to-png"

export interface FontMapping {
  [unicode: string]: string
}

export function extractFontBase64(css: string): string | null {
  const match = css.match(
    /url\("?data:(?:font\/\w+|application\/x-font-\w+)(?:;charset=[\w-]+)?;base64,([^")]+)"?\)/
  )
  return match ? match[1] : null
}

// 生成单个字形的 SVG
function glyphToSvg(
  glyph: opentype.Glyph,
  font: opentype.Font,
  size = 64
): string {
  const padding = 8
  const canvas = size + padding * 2
  const scale = size / font.unitsPerEm
  const baseline = canvas - padding - (font.descender || 0) * scale * -1
  const path = glyph.getPath(padding, baseline, size)
  const pathData = path.toPathData(2)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas}" height="${canvas}">
    <rect width="100%" height="100%" fill="white"/>
    <path d="${pathData}" fill="black"/>
  </svg>`
}

// 合并多个 SVG 为网格图
function createGridSvg(svgs: string[], cellSize = 80, margin = 20): string {
  const cols = Math.min(10, svgs.length)
  const rows = Math.ceil(svgs.length / cols)
  const width = cols * cellSize + margin * 2
  const height = rows * cellSize + margin * 2

  let content = ""
  for (let i = 0; i < svgs.length; i++) {
    const x = margin + (i % cols) * cellSize
    const y = margin + Math.floor(i / cols) * cellSize
    // 提取 path 数据并重新定位
    const pathMatch = svgs[i].match(/<path d="([^"]+)"/)
    if (pathMatch) {
      content += `<g transform="translate(${x}, ${y}) scale(${
        cellSize / 80
      })"><rect width="80" height="80" fill="white"/><path d="${
        pathMatch[1]
      }" fill="black"/></g>`
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="white"/>
    ${content}
  </svg>`
}

export async function decodeFontMapping(
  base64Font: string,
  apiKey: string
): Promise<FontMapping> {
  const fontBuffer = Uint8Array.from(atob(base64Font), c => c.charCodeAt(0))
  const font = opentype.parse(fontBuffer.buffer)

  const mapping: FontMapping = {}
  const toProcess: { unicode: number; svg: string }[] = []

  for (let i = 0; i < font.glyphs.length; i++) {
    const glyph = font.glyphs.get(i)
    const unicodes = (glyph as unknown as { unicodes?: number[] }).unicodes
    if (!unicodes?.length) continue

    const path = glyph.getPath(0, 0, 100)
    if (path.toPathData(2)?.length > 0) {
      for (const unicode of unicodes) {
        const svg = glyphToSvg(glyph, font, 64)
        toProcess.push({ unicode, svg })
      }
    }
  }

  if (toProcess.length === 0) return mapping

  // 打乱顺序
  for (let i = toProcess.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[toProcess[i], toProcess[j]] = [toProcess[j], toProcess[i]]
  }

  // 生成网格 SVG 并转换为 PNG
  const gridSvg = createGridSvg(toProcess.map(p => p.svg))
  const pngBuffer = await svgToPng(gridSvg)
  const pngBase64 = uint8ArrayToBase64(pngBuffer)
  const pngDataUrl = `data:image/png;base64,${pngBase64}`

  // OCR 识别
  const result = await ocrImage(
    pngDataUrl,
    apiKey,
    "\n<|grounding|>Convert the document to markdown."
  )
  const content =
    result.content?.replace(/<\|ref\|>.*?<\|\/det\|>/g, "").trim() || ""
  const chars = content.replace(/[\s\n]/g, "").split("")

  for (let i = 0; i < Math.min(chars.length, toProcess.length); i++) {
    const char = chars[i]
    if (char?.trim()) {
      mapping[String.fromCodePoint(toProcess[i].unicode)] = char
    }
  }

  return mapping
}

export function decodeText(text: string, mapping: FontMapping): string {
  return [...text].map(char => mapping[char] ?? char).join("")
}
