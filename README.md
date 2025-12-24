# 拾盐记

知乎内容采集与管理系统，支持付费专栏和问答内容的采集、存储和阅读。

## 功能特性

- 支持知乎付费专栏和问答链接的内容采集
- 自动处理知乎字体反爬机制（OCR 字形识别）
- 内容本地化存储，支持全文搜索
- 响应式 Web 界面，支持深色模式
- 支持批量导出为 Markdown 格式

## 技术栈

- **框架**: Next.js 15 (App Router) + React 19
- **样式**: Tailwind CSS 4
- **数据库**: PostgreSQL + Prisma ORM
- **爬虫**: cheerio (HTML 解析) + opentype.js (字体解析) + sharp (图像处理)
- **OCR**: SiliconFlow API (DeepSeek-OCR)

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，填写以下配置：

```env
DATABASE_URL="postgresql://user:password@localhost:5432/zhihu"
SILICONFLOW_API_KEY="your_api_key"
ZHIHU_COOKIE="your_zhihu_cookie"
```

### 3. 初始化数据库

```bash
npm run db:push
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 即可使用。

## 支持的链接格式

- **问答链接**: `https://www.zhihu.com/question/xxx/answer/xxx`
- **付费专栏**: `https://www.zhihu.com/market/paid_column/xxx/section/xxx`

## 如何获取链接

### 手机端（知乎 App）

**方法一：通过浏览器获取**
1. 在知乎 App 中打开文章，点击右上角「分享」按钮
2. 选择「更多」，然后选择一个浏览器打开
3. 在浏览器地址栏中复制完整链接

**方法二：通过微信获取**
1. 在知乎 App 中打开文章，点击右上角「分享」按钮
2. 选择「微信好友」
3. 在微信中打开分享的链接
4. 点击微信浏览器右上角「...」，选择「复制链接」

> 注意：知乎 App 分享功能中的「复制链接」得到的网址无法提取内容

### 电脑端

直接在浏览器地址栏复制当前页面的链接即可。

## 常用命令

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run start        # 启动生产服务器
npm run db:push      # 推送数据库 Schema
npm run db:studio    # 打开 Prisma Studio
npm run crawl <url>  # CLI 爬取单个文章
npm run lint         # 代码检查
```

## 项目结构

```
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   │   ├── articles/      # 文章列表接口
│   │   ├── crawl/         # 爬取执行接口
│   │   ├── stats/         # 统计数据接口
│   │   └── tasks/         # 任务管理接口
│   ├── about/             # 关于页面
│   ├── stats/             # 统计页面
│   └── tasks/[id]/        # 文章详情页面
├── components/            # React 组件
├── lib/
│   ├── crawler/           # 爬虫核心
│   │   ├── crawler.ts     # 主爬虫类
│   │   ├── font-decoder.ts# 字体解码器
│   │   ├── ocr.ts         # OCR 服务
│   │   └── config.ts      # 爬虫配置
│   └── prisma.ts          # Prisma 客户端
├── prisma/
│   └── schema.prisma      # 数据库模型
└── public/                # 静态资源
```

## 免责声明

- 本工具仅供个人学习和研究使用，请勿用于任何商业用途
- 用户在使用本工具时应遵守相关法律法规，尊重原创作者的知识产权
- 所采集的内容版权归原作者所有
- 本工具不对用户的任何行为承担责任，因使用本工具产生的任何法律纠纷由用户自行承担
- 如有侵权，请联系删除

## License

MIT
