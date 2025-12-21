export interface OcrResult {
  content: string;
}

export async function ocrImage(
  imageDataUrl: string,
  apiKey: string,
  prompt = "Convert the document to markdown."
): Promise<OcrResult> {
  if (!apiKey) {
    throw new Error("未提供 SILICONFLOW_API_KEY");
  }

  const response = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
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
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OCR API 错误响应:", errorText);
    throw new Error(`OCR 请求失败 (${response.status}): ${errorText}`);
  }

  const result = await response.json() as { choices: Array<{ message: { content: string } }> };
  return { content: result.choices[0]?.message?.content || "" };
}
