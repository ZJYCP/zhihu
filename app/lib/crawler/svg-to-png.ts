// SVG 转 PNG 工具 - 自动检测运行环境
// 本地开发使用 sharp，Cloudflare Workers 使用 @cf-wasm/resvg

export async function svgToPng(svgString: string): Promise<Uint8Array> {
  // 检测是否在 Cloudflare Workers 环境
  const isCloudflareWorker =
    typeof globalThis.caches !== "undefined" &&
    typeof (globalThis as Record<string, unknown>).Deno === "undefined" &&
    typeof process === "undefined";

  if (isCloudflareWorker) {
    // Cloudflare Workers 环境 - 使用 @cf-wasm/resvg
    const { Resvg } = await import("@cf-wasm/resvg");
    const resvg = new Resvg(svgString);
    const pngData = resvg.render();
    return pngData.asPng();
  } else {
    // Node.js 环境 - 使用 sharp
    const sharp = (await import("sharp")).default;
    const pngBuffer = await sharp(Buffer.from(svgString)).png().toBuffer();
    return new Uint8Array(pngBuffer);
  }
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
