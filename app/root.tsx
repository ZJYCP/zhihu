import type { LinksFunction } from "@remix-run/cloudflare";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { ThemeProvider } from "~/components/theme-provider";
import { Navbar } from "~/components/navbar";
import stylesheet from "~/styles/globals.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
];

export default function App() {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen bg-[hsl(var(--background))] antialiased">
        <ThemeProvider>
          <Navbar />
          <Outlet />
        </ThemeProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen bg-[hsl(var(--background))] antialiased flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">出错了</h1>
          <p className="text-[hsl(var(--muted-foreground))]">页面加载失败，请刷新重试</p>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
