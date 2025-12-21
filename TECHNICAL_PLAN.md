# 知乎付费专栏爬虫技术方案 v2.0

## 技术方案

### 知乎字体反爬机制

知乎使用自定义字体进行反爬：
```css
@font-face {
  font-family: 'zh_MA25c1f820bd249cf5fc3f53669d202017';
  src: url(data:font/ttf;base64,...);
}
```

- HTML 中存储的是 PUA 编码的假字符
- 通过自定义字体渲染时才显示正确内容
- DOM 读取（innerText/textContent）获取的仍是假字符

### 解决方案：截图 + OCR

使用 Playwright 截图 + Tesseract.js OCR 识别：

```
页面加载 → 元素截图 → OCR识别 → 获取真实文本
```

**优势**：
- 完全绕过字体反爬
- 无需维护字体映射表
- 适应字体动态变化

---

## 项目结构

```
zhihu2/
├── src/
│   ├── index.ts      # 主入口
│   ├── crawler.ts    # 爬虫核心（截图+OCR）
│   ├── parser.ts     # 内容解析
│   ├── exporter.ts   # 多格式导出
│   └── config.ts     # 配置管理
├── output/           # 输出目录
├── .env              # Cookie配置
├── package.json
└── tsconfig.json
```

---

## 技术栈

- **浏览器自动化**: Playwright
- **OCR识别**: Tesseract.js (chi_sim)
- **HTML解析**: cheerio
- **Markdown转换**: turndown

---

## 使用方法

```bash
# 爬取文章
npm run crawl "https://www.zhihu.com/market/paid_column/xxx/section/xxx"

# 调试模式（显示浏览器）
npm run crawl -- "URL" --debug
```

---

## 注意事项

- 仅用于个人学习研究
- OCR 首次运行需下载语言包（约15MB）
- 长文章 OCR 识别较慢
