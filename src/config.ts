import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export interface Config {
  cookie: string;
  requestDelay: number;
  outputDir: string;
  userAgent: string;
  chromeUserDataDir?: string;
  playwrightUserDataDir?: string; // Playwright 独立用户数据目录
}

export function getConfig(): Config {
  const cookie = process.env.ZHIHU_COOKIE || '';
  const chromeUserDataDir = process.env.CHROME_USER_DATA_DIR;
  const playwrightUserDataDir = process.env.PLAYWRIGHT_USER_DATA_DIR;

  return {
    cookie,
    requestDelay: parseInt(process.env.REQUEST_DELAY || '3000', 10),
    outputDir: process.env.OUTPUT_DIR || './output',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    chromeUserDataDir,
    playwrightUserDataDir,
  };
}

/**
 * 解析Cookie字符串为Cookie对象数组
 */
export function parseCookies(cookieString: string, domain: string): Array<{
  name: string;
  value: string;
  domain: string;
  path: string;
}> {
  return cookieString.split(';').map(item => {
    const [name, ...valueParts] = item.trim().split('=');
    return {
      name: name.trim(),
      value: valueParts.join('=').trim(),
      domain,
      path: '/',
    };
  }).filter(c => c.name && c.value);
}

/**
 * 解析知乎URL，提取专栏ID和章节ID
 */
export function parseZhihuUrl(url: string): {
  type: 'paid_column' | 'question' | 'article' | 'unknown';
  columnId?: string;
  sectionId?: string;
  questionId?: string;
  answerId?: string;
  articleId?: string;
} {
  // 付费专栏: https://www.zhihu.com/market/paid_column/1702723501155422208/section/1788920608135983104
  const paidColumnMatch = url.match(/\/market\/paid_column\/(\d+)\/section\/(\d+)/);
  if (paidColumnMatch) {
    return {
      type: 'paid_column',
      columnId: paidColumnMatch[1],
      sectionId: paidColumnMatch[2],
    };
  }

  // 问答: https://www.zhihu.com/question/xxx/answer/xxx
  const questionMatch = url.match(/\/question\/(\d+)(?:\/answer\/(\d+))?/);
  if (questionMatch) {
    return {
      type: 'question',
      questionId: questionMatch[1],
      answerId: questionMatch[2],
    };
  }

  // 专栏文章: https://zhuanlan.zhihu.com/p/xxx
  const articleMatch = url.match(/zhuanlan\.zhihu\.com\/p\/(\d+)/);
  if (articleMatch) {
    return {
      type: 'article',
      articleId: articleMatch[1],
    };
  }

  return { type: 'unknown' };
}

/**
 * 生成输出文件路径
 */
export function getOutputPath(config: Config, filename: string): string {
  return path.join(config.outputDir, filename);
}
