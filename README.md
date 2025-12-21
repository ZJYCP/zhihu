# 知乎内容库

基于 Remix + Cloudflare D1 的知乎付费专栏内容采集与管理工具。

## 技术栈

- Remix 2.x + React 18
- Cloudflare Pages + D1 (SQLite)
- Drizzle ORM
- Tailwind CSS 4
- SiliconFlow DeepSeek-OCR (字体反爬解码)

## 本地开发

### 1. 安装依赖
```bash
npm install
```

### 2. 创建 D1 数据库
```bash
# 登录 Cloudflare
wrangler login

# 创建数据库
wrangler d1 create zhihu-crawler
```

执行后会返回：
```
✅ Successfully created DB 'zhihu-crawler'
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 3. 更新 wrangler.toml
将返回的 `database_id` 填入 `wrangler.toml`：
```toml
[[d1_databases]]
binding = "DB"
database_name = "zhihu-crawler"
database_id = "你的数据库ID"
```

### 4. 初始化数据库
```bash
# 本地开发数据库
wrangler d1 execute zhihu-crawler --local --file=./drizzle/0001_initial.sql

# 生产数据库
wrangler d1 execute zhihu-crawler --remote --file=./drizzle/0001_initial.sql
```

### 5. 配置环境变量
在 Cloudflare Dashboard > Pages > 你的项目 > Settings > Environment variables 中配置：
- `ZHIHU_COOKIE` - 知乎盐选会员 Cookie
- `SILICONFLOW_API_KEY` - OCR API 密钥

### 6. 启动开发服务器
```bash
npm run dev
```

## 部署

### 部署到 Cloudflare Pages
```bash
npm run build
npm run deploy
```

或连接 GitHub 仓库自动部署。

## 常用命令

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run deploy       # 部署到 Cloudflare Pages
npm run typecheck    # TypeScript 类型检查
npm run db:studio    # 打开 Drizzle Studio
```

## 项目结构

```
app/
├── routes/           # Remix 路由
│   ├── _index.tsx    # 首页（文章列表 + 爬取）
│   ├── articles.$id.tsx  # 文章详情
│   ├── stats.tsx     # 统计页面
│   ├── settings.tsx  # 设置页面
│   └── api.*.ts      # API 路由
├── components/       # React 组件
├── db/               # 数据库 schema
├── lib/
│   └── crawler/      # 爬虫核心逻辑
└── styles/           # CSS 样式
```

## 注意事项

- 仅用于个人学习研究
- 需要有效的知乎盐选会员 Cookie
