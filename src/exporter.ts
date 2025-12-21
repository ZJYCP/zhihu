import fs from 'fs/promises';
import path from 'path';
import TurndownService from 'turndown';
import { CrawlResult } from './crawler.js';
import { ParsedContent, cleanHtml } from './parser.js';

/**
 * 导出器 - 将爬取内容导出为各种格式
 */
export class Exporter {
  private outputDir: string;
  private turndown: TurndownService;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
    this.turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
    });

    // 配置turndown规则
    this.configureTurndown();
  }

  private configureTurndown(): void {
    // 处理图片
    this.turndown.addRule('images', {
      filter: 'img',
      replacement: (content, node) => {
        const img = node as HTMLImageElement;
        const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
        const alt = img.getAttribute('alt') || '图片';
        return `![${alt}](${src})`;
      },
    });

    // 处理代码块
    this.turndown.addRule('codeBlocks', {
      filter: (node) => {
        return node.nodeName === 'PRE' && node.querySelector('code') !== null;
      },
      replacement: (content, node) => {
        const code = (node as HTMLElement).querySelector('code');
        const lang = code?.className?.match(/language-(\w+)/)?.[1] || '';
        const text = code?.textContent || content;
        return `\n\`\`\`${lang}\n${text}\n\`\`\`\n`;
      },
    });

    // 移除不需要的元素
    this.turndown.remove(['script', 'style', 'noscript', 'iframe']);
  }

  /**
   * 确保输出目录存在
   */
  async ensureOutputDir(): Promise<void> {
    await fs.mkdir(this.outputDir, { recursive: true });
  }

  /**
   * 导出为Markdown格式
   */
  async exportMarkdown(result: CrawlResult, filename?: string): Promise<string> {
    await this.ensureOutputDir();

    const cleanedHtml = cleanHtml(result.html);
    const markdown = this.turndown.turndown(cleanedHtml);

    // 构建Markdown内容
    const content = [
      `# ${result.title}`,
      '',
      result.author ? `**作者**: ${result.author}` : '',
      result.publishTime ? `**发布时间**: ${result.publishTime}` : '',
      `**原文链接**: ${result.url}`,
      '',
      '---',
      '',
      markdown,
    ].filter(Boolean).join('\n');

    // 生成文件名
    const safeName = this.sanitizeFilename(filename || result.title);
    const outputPath = path.join(this.outputDir, `${safeName}.md`);

    await fs.writeFile(outputPath, content, 'utf-8');
    console.log(`📝 Markdown已保存: ${outputPath}`);

    return outputPath;
  }

  /**
   * 导出为HTML格式
   */
  async exportHtml(result: CrawlResult, filename?: string): Promise<string> {
    await this.ensureOutputDir();

    const cleanedHtml = cleanHtml(result.html);

    // 构建完整HTML页面
    const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${result.title}</title>
  <style>
    body {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.8;
      color: #333;
    }
    h1 { border-bottom: 1px solid #eee; padding-bottom: 10px; }
    .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
    img { max-width: 100%; height: auto; }
    pre { background: #f5f5f5; padding: 15px; overflow-x: auto; border-radius: 5px; }
    code { background: #f5f5f5; padding: 2px 5px; border-radius: 3px; }
    blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 20px; color: #666; }
  </style>
</head>
<body>
  <h1>${result.title}</h1>
  <div class="meta">
    ${result.author ? `<span>作者: ${result.author}</span> | ` : ''}
    ${result.publishTime ? `<span>发布时间: ${result.publishTime}</span> | ` : ''}
    <a href="${result.url}" target="_blank">原文链接</a>
  </div>
  <hr>
  <div class="content">
    ${cleanedHtml}
  </div>
</body>
</html>`;

    const safeName = this.sanitizeFilename(filename || result.title);
    const outputPath = path.join(this.outputDir, `${safeName}.html`);

    await fs.writeFile(outputPath, htmlContent, 'utf-8');
    console.log(`🌐 HTML已保存: ${outputPath}`);

    return outputPath;
  }

  /**
   * 导出为纯文本格式
   */
  async exportText(result: CrawlResult, filename?: string): Promise<string> {
    await this.ensureOutputDir();

    const content = [
      result.title,
      '='.repeat(result.title.length),
      '',
      result.author ? `作者: ${result.author}` : '',
      result.publishTime ? `发布时间: ${result.publishTime}` : '',
      `原文链接: ${result.url}`,
      '',
      '-'.repeat(50),
      '',
      result.content,
    ].filter(Boolean).join('\n');

    const safeName = this.sanitizeFilename(filename || result.title);
    const outputPath = path.join(this.outputDir, `${safeName}.txt`);

    await fs.writeFile(outputPath, content, 'utf-8');
    console.log(`📄 文本已保存: ${outputPath}`);

    return outputPath;
  }

  /**
   * 导出为JSON格式
   */
  async exportJson(result: CrawlResult, parsed: ParsedContent, filename?: string): Promise<string> {
    await this.ensureOutputDir();

    const data = {
      title: result.title,
      author: result.author,
      publishTime: result.publishTime,
      url: result.url,
      content: result.content,
      paragraphs: parsed.paragraphs,
      images: parsed.images,
      crawledAt: new Date().toISOString(),
    };

    const safeName = this.sanitizeFilename(filename || result.title);
    const outputPath = path.join(this.outputDir, `${safeName}.json`);

    await fs.writeFile(outputPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`📊 JSON已保存: ${outputPath}`);

    return outputPath;
  }

  /**
   * 批量导出所有格式
   */
  async exportAll(result: CrawlResult, parsed: ParsedContent, filename?: string): Promise<{
    markdown: string;
    html: string;
    text: string;
    json: string;
  }> {
    const [markdown, html, text, json] = await Promise.all([
      this.exportMarkdown(result, filename),
      this.exportHtml(result, filename),
      this.exportText(result, filename),
      this.exportJson(result, parsed, filename),
    ]);

    return { markdown, html, text, json };
  }

  /**
   * 清理文件名，移除非法字符
   */
  private sanitizeFilename(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 100);
  }
}
