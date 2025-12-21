/**
 * SiliconFlow DeepSeek-OCR 远程接口
 */

export interface OcrOptions {
  /** 自定义提示词 */
  prompt?: string
  /** API 密钥，默认从环境变量 SILICONFLOW_API_KEY 读取 */
  apiKey?: string
  /** 模型名称 */
  model?: string
  /** 并发数量，默认 3 */
  concurrency?: number
}

export interface OcrResult {
  content: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

interface SiliconFlowResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

const DEFAULT_PROMPT = "Convert the document to markdown."
// "<image>\n<|grounding|>Extract all text content from this image. In a markdown format."

/**
 * 调用 SiliconFlow OCR 接口识别图片文字
 * @param imageDataUrl base64 data URL，格式: "data:image/png;base64,..."
 * @param options 可选配置
 */
export async function ocrImage(
  imageDataUrl: string,
  options: OcrOptions = {}
): Promise<OcrResult> {
  const {
    prompt = DEFAULT_PROMPT,
    apiKey = process.env.SILICONFLOW_API_KEY,
    model = "deepseek-ai/DeepSeek-OCR",
  } = options

  if (!apiKey) {
    throw new Error(
      "未提供 API 密钥，请设置环境变量 SILICONFLOW_API_KEY 或传入 apiKey 参数"
    )
  }

  const payload = {
    model,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: imageDataUrl,
            },
          },
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
    stream: false,
    response_format: { type: "text" },
  }

  const response = await fetch(
    "https://api.siliconflow.cn/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OCR 请求失败 (${response.status}): ${errorText}`)
  }

  const result = (await response.json()) as SiliconFlowResponse

  return {
    content: result.choices[0]?.message?.content || "",
    usage: result.usage,
  }
}

/**
 * 批量 OCR 识别多张图片（支持并发窗口控制）
 * @param imageDataUrls base64 data URL 数组
 * @param options 可选配置，concurrency 控制并发数量
 */
export async function ocrImages(
  imageDataUrls: string[],
  options: OcrOptions = {}
): Promise<OcrResult[]> {
  const { concurrency = 3, ...ocrOptions } = options
  const total = imageDataUrls.length

  console.log(`  🔍 OCR 识别 ${total} 张图片（并发数: ${concurrency}）...`)

  // 结果数组，按原顺序存储
  const results: OcrResult[] = new Array(total)
  let completed = 0
  let currentIndex = 0

  // 工作函数：不断从队列取任务执行
  const worker = async (): Promise<void> => {
    while (currentIndex < total) {
      const index = currentIndex++
      const result = await ocrImage(imageDataUrls[index], ocrOptions)
      results[index] = result
      completed++
      console.log(`  ✅ 完成 (${completed}/${total})`)
    }
  }

  // 启动 N 个并发 worker
  const workers = Array.from({ length: Math.min(concurrency, total) }, () =>
    worker()
  )

  await Promise.all(workers)

  return results
}
