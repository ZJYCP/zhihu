import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/navbar";
import NextTopLoader from "nextjs-toploader";

export const metadata: Metadata = {
  title: "知乎内容库",
  description: "知乎付费专栏内容采集与管理工具",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen bg-[hsl(var(--background))] antialiased">
        <NextTopLoader color="#3b82f6" showSpinner={false} />
        <ThemeProvider>
          <Navbar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
