import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

/* global console */

const aboutPage = readFileSync("app/about/page.tsx", "utf8");
const viteConfig = readFileSync("vite.config.ts", "utf8");

assert.equal(
  aboutPage.includes("/api/admin/"),
  false,
  "public pages must not call protected admin APIs",
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
