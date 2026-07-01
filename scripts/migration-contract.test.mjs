import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

/* global console */

const aboutPage = readFileSync("app/about/page.tsx", "utf8");
const articleDetailPage = readFileSync("app/tasks/$id/page.tsx", "utf8");
const adminPage = readFileSync("app/admin/page.tsx", "utf8");
const rootRoute = readFileSync("app/__root.tsx", "utf8");
const router = readFileSync("router.tsx", "utf8");
const prismaSchema = readFileSync("prisma/schema.prisma", "utf8");
const viteConfig = readFileSync("vite.config.ts", "utf8");

assert.equal(
  aboutPage.includes("/api/admin/"),
  false,
  "public pages must not call protected admin APIs",
);
assert.match(
  aboutPage,
  /getServiceStatusForAbout|ServiceStatusSummary/,
  "about page should expose public service status",
);
assert.equal(
  aboutPage.includes("仅管理员登录后可见"),
  false,
  "service status should be visible to public visitors",
);
assert.equal(
  aboutPage.includes("访问 /admin 查看服务状态"),
  false,
  "public service status should render on the about page instead of sending visitors to admin",
);
assert.match(
  aboutPage,
  /最近 24 小时状态/,
  "about page should show the same availability timeline style as the admin panel",
);
assert.equal(
  aboutPage.includes('label="知乎 Cookie"'),
  false,
  "about page should not show extra configuration summary cards",
);
assert.equal(
  aboutPage.includes('label="24 小时成功率"'),
  false,
  "about page should keep service status compact instead of adding summary cards",
);
assert.ok(
  rootRoute.includes("notFoundComponent") ||
    router.includes("defaultNotFoundComponent"),
  "TanStack Router should have a root or default notFound component to avoid generic __root__ warnings",
);
assert.match(
  prismaSchema,
  /model ArticleFeedback/,
  "Prisma schema should store article feedback in an ArticleFeedback model",
);
assert.match(
  prismaSchema,
  /enum FeedbackStatus/,
  "Prisma schema should track feedback processing status",
);
assert.match(
  articleDetailPage,
  /反馈问题/,
  "article detail page should expose a feedback action",
);
assert.match(
  articleDetailPage,
  /overflow-x-auto[\s\S]*<ExportButtons[\s\S]*data-feedback-action/,
  "article feedback action should sit on the same action row instead of wrapping onto its own line",
);
assert.match(
  articleDetailPage,
  /data-feedback-action/,
  "article feedback action should have a distinct style hook from ordinary outline buttons",
);
assert.match(
  articleDetailPage,
  /data-feedback-action[\s\S]*className="[^"]*whitespace-nowrap[^"]*border-amber-200[^"]*bg-amber-50/,
  "article feedback button should stay on one line and use a distinct amber style",
);
assert.match(
  articleDetailPage,
  /fixed inset-0[\s\S]*role="dialog"[\s\S]*aria-modal="true"[\s\S]*反馈说明/,
  "article feedback form should open in a modal dialog instead of expanding inline",
);
assert.match(
  articleDetailPage,
  /\/api\/tasks\/\$\{id\}\/feedback/,
  "article detail page should submit feedback to the public task feedback endpoint",
);
assert.match(
  adminPage,
  /反馈管理/,
  "admin panel should include a feedback management tab",
);
assert.match(
  adminPage,
  /\/api\/admin\/feedback/,
  "admin panel should read feedback from the protected admin feedback API",
);

assert.match(
  viteConfig,
  /external:\s*\[[\s\S]*@prisma\\\/client/,
  "Nitro must externalize @prisma/client because Prisma Client uses CommonJS runtime globals",
);

assert.equal(
  existsSync(".output/server/_libs/@prisma/client.mjs"),
  false,
  "production build must not inline @prisma/client into the ESM server bundle",
);
assert.equal(
  existsSync(".output/server/_libs/sharp.mjs"),
  false,
  "production build must not inline sharp native bindings into the ESM server bundle",
);

console.log("migration contract ok");
