import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "知乎爬虫",
  description: "知乎付费专栏内容爬取工具",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-background antialiased">{children}</body>
    </html>
  );
}
