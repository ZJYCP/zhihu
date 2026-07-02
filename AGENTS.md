# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

知乎付费专栏内容采集与管理系统。使用 cheerio + 自定义字体解码器绕过知乎的字体反爬机制。

## Development Commands

```bash
# 开发
npm run dev              # 启动开发服务器 (Vite)

# 构建与部署
npm run build            # 生成 Prisma 客户端并构建 (prisma generate && vite build)
npm run start            # 启动生产服务器 (node .output/server/index.mjs)
npm run start:prod       # 应用生产迁移并启动 (prisma migrate deploy && node .output/server/index.mjs)

# 数据库
npm run db:push          # 推送 Prisma schema 到数据库（原型期，不建议用于生产）
npm run db:migrate:dev   # 开发环境生成并应用 migration
npm run db:migrate:deploy # 生产环境应用已提交的 migration
npm run db:studio        # 打开 Prisma Studio

# 工具
npm run import           # 导入文章脚本
npm run lint             # ESLint 检查
```

## Tech Stack

- **Framework**: TanStack Start (Vite + Nitro) + React 19
- **Routing**: @tanstack/react-router（文件路由，目录 `app/`，indexToken `page`）
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL + Prisma ORM
- **Crawler**: cheerio (HTML 解析) + opentype.js (字体解析) + sharp (图像处理)
- **OCR**: SiliconFlow API (DeepSeek-OCR)

## Architecture

### 页面路由 (`src/routes/`)
文件路由，`page.tsx` 为目录的 index 路由，`-` 前缀文件为路由私有模块（不生成路由）。
- `__root.tsx` - 根布局（Navbar / ThemeProvider / Toaster）
- `page.tsx` - 首页（内容库）
- `about/` - 关于页
- `admin/` - 管理后台
- `stats/` - 统计页
- `tasks/$id/` - 文章详情页

### API 路由 (`src/routes/api/`)
TanStack Start API 路由，用 `createFileRoute(...)({ server: { handlers: { METHOD } } })` 定义，返回 `Response`。
- `articles/` - 已完成文章列表（搜索分页）
- `crawl/` - 执行爬取任务
- `stats/` - 统计数据
- `tasks/` - 任务 CRUD
- `tasks/$id/` - 单个任务操作 / `tasks/$id/feedback/` - 反馈
- `tasks/clear-failed/` - 清理失败任务
- `admin/` - 管理接口（每个 handler 调 `requireAdminRequest` 鉴权）
  - `auth/` `config/` `articles/` `articles/$id/` `feedback/` `feedback/$id/` `check-cookie/` `cookie-status/`
- `cron/check-cookie/` - 定时 Cookie 健康检查

### Crawler Core (`src/lib/crawler/`)
- `crawler.ts` - 主爬虫类 `ZhihuCrawler`，调度问答/付费专栏爬取
- `font-decoder.ts` - 知乎字体反爬：opentype.js 解析字体 → sharp 渲染字形网格图 → OCR 识别
- `ocr.ts` - SiliconFlow OCR API 集成
- `config.ts` - 爬虫配置（从 DB 运行时配置读取 cookie/userAgent 等）
- `index.ts` - 桶文件

### Server Lib (`src/lib/server/`)
- `prisma.ts` - Prisma 客户端单例
- `admin-auth.ts` - HMAC token 鉴权（APP_SECRET 签名，24h TTL）
- `api-response.ts` - 服务端 Response 构造与错误映射
- `rate-limiter.ts` - DB 驱动的 IP 限流
- `cookie-checker.ts` - Cookie 健康检查
- `service-status.ts` - 公开服务状态
- `config/runtime-config.ts` - DB `SystemConfig` 运行时配置读写

### Client Lib (`src/lib/client/`)
- `api-client.ts` - 浏览器 fetch 封装（自动注入 admin token，错误 toast）

### Database Schema
模型：`CrawlTask`（url/status/title/content/author/column...，已完成任务即文章）、`ArticleFeedback`、`SystemConfig`、`CookieCheckLog`、`RateLimitLog`。

## Environment Variables

启动密钥（`.env`，参考 `.env.example`）：
- `DATABASE_URL` - PostgreSQL 连接字符串
- `ADMIN_PASSWORD` - 管理后台登录密码
- `APP_SECRET` - admin token 签名密钥
- `PORT` - 服务端口（默认 3000）

运行时配置（存 DB `SystemConfig` 表，经管理后台 `/admin` 修改，不在文件中）：
- `zhihu_cookie` `siliconflow_api_key` `crawler_user_agent` `request_delay_ms` `rate_limit_window_ms` `rate_limit_max_requests` `cookie_check_url`

## Key Implementation Details

1. **字体反爬处理流程**：知乎使用自定义字体混淆文字，本项目通过 opentype.js 解析字体文件，用 sharp 将字形渲染为图像，再通过 OCR 识别真实字符。

2. **配置体系**：启动密钥（数据库/管理密码/签名密钥）走 `.env`；爬虫所需的 Cookie、API Key、User-Agent 等可变配置走 DB `SystemConfig` 运行时配置，无需手动改文件。`src/lib/crawler/config.ts` 的 `getCrawlerConfig()` 从 DB 读取。

3. **Admin 鉴权**：`/api/admin/auth` 校验 `ADMIN_PASSWORD` 后签发 HMAC token（`APP_SECRET`），客户端存 `localStorage`，`api-client` 对 `/api/admin/*` 请求自动带 `Authorization: Bearer`。
