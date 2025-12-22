import opentype from "opentype.js";
import sharp from "sharp";
import { ocrImage } from "./ocr";

export interface FontMapping {
  [unicode: string]: string;
}

export function extractFontBase64(css: string): string | null {
  const match = css.match(
    /url\("?data:(?:font\/\w+|application\/x-font-\w+)(?:;charset=[\w-]+)?;base64,([^")]+)"?\)/
  );
  return match ? match[1] : null;
}

async function glyphToImage(
  glyph: opentype.Glyph,
  font: opentype.Font,
  size = 64
): Promise<Buffer> {
  const padding = 8;
  const canvas = size + padding * 2;
  const scale = size / font.unitsPerEm;
  const baseline = canvas - padding - font.descender * scale * -1;
  const path = glyph.getPath(padding, baseline, size);
  const pathData = path.toPathData(2);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas}" height="${canvas}">
    <rect width="100%" height="100%" fill="white"/>
    <path d="${pathData}" fill="black"/>
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function decodeFontMapping(
  base64Font: string
): Promise<FontMapping> {
  const fontBuffer = Buffer.from(base64Font, "base64");
  const font = opentype.parse(
    fontBuffer.buffer.slice(
      fontBuffer.byteOffset,
      fontBuffer.byteOffset + fontBuffer.byteLength
    )
  );

  const mapping: FontMapping = {};
  const toProcess: { unicode: number; glyph: opentype.Glyph }[] = [];

  for (let i = 0; i < font.glyphs.length; i++) {
    const glyph = font.glyphs.get(i);
    const unicodes = (glyph as unknown as { unicodes?: number[] }).unicodes;
    if (!unicodes?.length) continue;

    const path = glyph.getPath(0, 0, 100);
    if (path.toPathData(2)?.length > 0) {
      for (const unicode of unicodes) {
        toProcess.push({ unicode, glyph });
      }
    }
  }

  if (toProcess.length === 0) return mapping;

  // 生成图片
  const images: { unicode: number; dataUrl: string }[] = [];
  for (const { unicode, glyph } of toProcess) {
    const imgBuffer = await glyphToImage(glyph, font, 128);
    images.push({
      unicode,
      dataUrl: `data:image/png;base64,${imgBuffer.toString("base64")}`,
    });
  }

  // 打乱顺序
  for (let i = images.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [images[i], images[j]] = [images[j], images[i]];
  }

  // 合并成网格图
  const cols = Math.min(10, images.length);
  const rows = Math.ceil(images.length / cols);
  const cellSize = 80;
  const margin = 20;

  const compositeImages: sharp.OverlayOptions[] = [];
  for (let i = 0; i < images.length; i++) {
    const imgBuffer = Buffer.from(images[i].dataUrl.split(",")[1], "base64");
    const resized = await sharp(imgBuffer)
      .resize(cellSize, cellSize, { fit: "contain", background: "white" })
      .toBuffer();
    compositeImages.push({
      input: resized,
      left: margin + (i % cols) * cellSize,
      top: margin + Math.floor(i / cols) * cellSize,
    });
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
    .toBuffer();

  // OCR 识别
  const gridDataUrl = `data:image/png;base64,${gridImage.toString("base64")}`;
  const result = await ocrImage(gridDataUrl, {
    prompt: "\n<|grounding|>Convert the document to markdown.",
  });

  const content =
    result.content?.replace(/<\|ref\|>.*?<\|\/det\|>/g, "").trim() || "";
  const chars = content.replace(/[\s\n]/g, "").split("");

  for (let i = 0; i < Math.min(chars.length, images.length); i++) {
    const char = chars[i];
    if (char?.trim()) {
      mapping[String.fromCodePoint(images[i].unicode)] = char;
    }
  }

  return mapping;
}

export function decodeText(text: string, mapping: FontMapping): string {
  return [...text].map((char) => mapping[char] ?? char).join("");
}
