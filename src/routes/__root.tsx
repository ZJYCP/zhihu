import {
  createRootRoute,
  Link,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import { Navbar } from "@/components/navbar";
import { ThemeProvider } from "@/components/theme-provider";
import appCss from "./globals.css?url";

const siteConfig = {
  name: "拾盐记",
  description: "知乎内容采集与管理系统，支持付费专栏和问答内容的采集、存储和阅读",
  url: "https://zhihu.artimind.top",
};

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: siteConfig.name },
      { name: "description", content: siteConfig.description },
      { name: "keywords", content: "知乎,盐选,付费专栏,内容采集,阅读器,拾盐记" },
      { name: "author", content: "拾盐记" },
      { name: "creator", content: "拾盐记" },
      { name: "robots", content: "index, follow" },
      { name: "theme-color", media: "(prefers-color-scheme: light)", content: "white" },
      { name: "theme-color", media: "(prefers-color-scheme: dark)", content: "#0a0a0a" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "zh_CN" },
      { property: "og:url", content: siteConfig.url },
      { property: "og:title", content: siteConfig.name },
      { property: "og:description", content: siteConfig.description },
      { property: "og:site_name", content: siteConfig.name },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: siteConfig.name },
      { name: "twitter:description", content: siteConfig.description },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootLayout,
  notFoundComponent: NotFoundPage,
});

function RootLayout() {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-[hsl(var(--background))] antialiased">
        <ThemeProvider>
          <Navbar />
          <Outlet />
          <Toaster richColors position="top-center" />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}

function NotFoundPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-16 text-center">
      <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
        404
      </p>
      <h1 className="mt-3 text-3xl font-bold">页面不存在</h1>
      <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
        你访问的内容可能已被移动、删除，或者链接填写有误。
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center justify-center rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] transition-colors hover:bg-[hsl(var(--primary))]/90"
      >
        返回内容库
      </Link>
    </main>
  );
}
