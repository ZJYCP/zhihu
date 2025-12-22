export interface OcrResult {
  content: string;
}

const DEFAULT_PROMPT = "Convert the document to markdown.";

export async function ocrImage(
  imageDataUrl: string,
  options: { prompt?: string; apiKey?: string } = {}
): Promise<OcrResult> {
  const {
    prompt = DEFAULT_PROMPT,
    apiKey = process.env.SILICONFLOW_API_KEY,
  } = options;

  if (!apiKey) {
    throw new Error("未提供 SILICONFLOW_API_KEY");
  }

  const response = await fetch(
    "https://api.siliconflow.cn/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-ai/DeepSeek-OCR",
        messages: [
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: imageDataUrl } },
              { type: "text", text: prompt },
            ],
          },
        ],
        temperature: 0,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`OCR 请求失败 (${response.status})`);
  }

  const result = await response.json();
  return { content: result.choices[0]?.message?.content || "" };
}
