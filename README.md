# 知乎付费专栏爬虫

基于 Playwright + 读屏技术的知乎付费专栏内容爬取工具。

## 技术方案

使用浏览器 Accessibility API 获取渲染后的真实文本，完全绕过字体反爬机制。

详见 [TECHNICAL_PLAN.md](./TECHNICAL_PLAN.md)

## 使用方法

1. 配置 Cookie 到 `.env` 文件
2. 运行爬虫：
   ```bash
   npm run crawl "https://www.zhihu.com/market/paid_column/xxx/section/xxx"
   ```
3. 输出文件在 `output/` 目录

## 项目结构

```
src/
├── index.ts      # 主入口
├── crawler.ts    # 爬虫核心
├── parser.ts     # 内容解析
├── exporter.ts   # 多格式导出
└── config.ts     # 配置管理
```

## 注意事项

- 仅用于个人学习研究
- 需要有效的知乎盐选会员 Cookie
