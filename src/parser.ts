import * as cheerio from 'cheerio';
import { CrawlResult } from './crawler.js';

export interface ParsedContent {
  title: string;
  author?: string;
  publishTime?: string;
  paragraphs: string[];
  images: string[];
  html: string;
}

/**
 * 解析爬取的内容
 */
export function parseContent(result: CrawlResult): ParsedContent {
  const $ = cheerio.load(result.html);

  // 移除不需要的元素
  $('script, style, noscript, iframe').remove();
  $('.AdblockBanner, .Reward, .Post-topicsAndReviewer').remove();

  // 提取段落文本
  const paragraphs: string[] = [];
  $('p, h2, h3, h4, h5, h6, li, blockquote').each((_, el) => {
    const text = $(el).text().trim();
    if (text) {
      paragraphs.push(text);
    }
  });

  // 提取图片URL
  const images: string[] = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-original');
    if (src && !src.includes('data:image')) {
      images.push(src);
    }
  });

  return {
    title: result.title,
    author: result.author,
    publishTime: result.publishTime,
    paragraphs,
    images,
    html: $.html(),
  };
}

/**
 * 清理HTML内容
 */
export function cleanHtml(html: string): string {
  const $ = cheerio.load(html);

  // 移除不需要的元素
  $('script, style, noscript, iframe').remove();
  $('.AdblockBanner, .Reward').remove();

  // 移除内联样式
  $('[style]').removeAttr('style');

  // 移除class属性（保持结构但简化）
  // $('[class]').removeAttr('class');

  return $.html();
}

/**
 * 提取所有文本内容
 */
export function extractText(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, noscript').remove();
  return $('body').text().trim();
}
