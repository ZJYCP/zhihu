# 拾盐记

知乎内容采集与管理系统，支持付费专栏和问答内容的采集、存储和阅读。

## 功能特性

- 支持知乎付费专栏和问答链接的内容采集
- 自动处理知乎字体反爬机制（OCR 字形识别）
- 内容本地化存储，支持全文搜索
- 响应式 Web 界面，支持深色模式
- 支持批量导出为 Markdown 格式

## 技术栈

- **框架**: TanStack Start + React 19
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

复制 `.env.example` 为 `.env`，填写启动配置：

```env
DATABASE_URL="postgresql://user:password@localhost:5432/zhihu"
ADMIN_PASSWORD="your_admin_password"
APP_SECRET="replace_with_a_long_random_secret"
PORT=3000
```

知乎 Cookie、SiliconFlow API Key、User-Agent、请求间隔、限流参数和 Cookie 检查 URL 均在「管理后台 -> 系统设置」中配置，保存后下一次请求立即生效，无需重启服务。

### 3. 初始化数据库

```bash
npm run db:migrate:dev
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 即可使用。

## Docker Compose 部署

本项目的 Compose 只启动 Web 服务，不包含 PostgreSQL。请先准备外部 PostgreSQL，并把连接串填入 `.env` 的 `DATABASE_URL`。生产容器启动时会先执行 `prisma migrate deploy`，自动应用仓库中尚未执行的数据库迁移；迁移失败时服务不会继续启动。

如果 PostgreSQL 跑在宿主机上，`DATABASE_URL` 里的主机名需要使用容器可访问的地址；macOS/Windows Docker Desktop 通常可以用 `host.docker.internal`。

```bash
cp .env.example .env
# 编辑 .env，填写 DATABASE_URL、ADMIN_PASSWORD、APP_SECRET、PORT

docker compose build
docker compose up -d
```

首次启动后访问 `/admin`，使用 `ADMIN_PASSWORD` 登录，然后在系统设置里填写知乎 Cookie、SiliconFlow API Key 等运行时配置。

更新代码或 Prisma schema 后，先在开发环境生成并提交 Prisma migration，再重新执行 `docker compose build && docker compose up -d`。容器启动时会自动同步数据库结构。

### 已有生产库的 Prisma Migrate 基线

如果生产数据库已经用过 `prisma db push` 或历史版本初始化过，但还没有 `_prisma_migrations` 记录，第一次执行 `prisma migrate deploy` 会报 `P3005: The database schema is not empty`。这是 Prisma 的保护机制，需要先把已有结构标记为基线。

只需要对同一个生产库执行一次：

```bash
DATABASE_URL="postgresql://..." npm run db:migrate:baseline
```

基线完成后，再执行部署命令。后续新增表和字段会由 `prisma migrate deploy` 自动应用。

## Vercel 部署

Vercel 不会执行 Dockerfile 的 `CMD`，因此 Build Command 需要显式运行数据库迁移：

```bash
npm run db:migrate:deploy && npm run build
```

如果连接的是已有生产库，第一次部署前先在本地或 Vercel CLI 环境执行一次基线命令：

```bash
DATABASE_URL="postgresql://..." npm run db:migrate:baseline
```

之后 Vercel 的 Build Command 保持 `npm run db:migrate:deploy && npm run build` 即可。不要在 Preview 环境连接同一个生产库执行迁移。

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
npm run start        # 启动生产服务器（需先 npm run build）
npm run start:prod   # 应用生产迁移并启动服务
npm run db:migrate:dev     # 开发环境生成并应用 Prisma migration
npm run db:migrate:deploy  # 生产环境应用已提交的 Prisma migration
npm run db:push      # 原型期快速同步 Schema（不建议用于生产）
npm run db:studio    # 打开 Prisma Studio
npm run crawl <url>  # CLI 爬取单个文章
npm run lint         # 代码检查
```

## 项目结构

```
├── app/                    # TanStack Start 文件路由
│   ├── api/               # API 路由
│   │   ├── articles/      # 文章列表接口
│   │   ├── crawl/         # 爬取执行接口
│   │   ├── stats/         # 统计数据接口
│   │   └── tasks/         # 任务管理接口
│   ├── about/             # 关于页面
│   ├── stats/             # 统计页面
│   └── tasks/$id/         # 文章详情页面
├── components/            # React 组件
├── lib/
│   ├── crawler/           # 爬虫核心
│   │   ├── crawler.ts     # 主爬虫类
│   │   ├── font-decoder.ts# 字体解码器
│   │   ├── ocr.ts         # OCR 服务
│   │   └── config.ts      # 爬虫默认配置与运行时配置读取
│   ├── config/            # 运行时配置中心
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
