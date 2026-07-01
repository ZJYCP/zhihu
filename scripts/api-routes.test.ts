import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const apiDir = new URL("../app/api", import.meta.url);
const expectedRoutes = new Map([
  ["admin/articles/$id/route.ts", "/api/admin/articles/$id"],
  ["admin/articles/route.ts", "/api/admin/articles"],
  ["admin/auth/route.ts", "/api/admin/auth"],
  ["admin/config/route.ts", "/api/admin/config"],
  ["admin/cookie-status/route.ts", "/api/admin/cookie-status"],
  ["articles/route.ts", "/api/articles"],
  ["crawl/route.ts", "/api/crawl"],
  ["cron/check-cookie/route.ts", "/api/cron/check-cookie"],
  ["stats/route.ts", "/api/stats"],
  ["tasks/$id/route.ts", "/api/tasks/$id"],
  ["tasks/clear-failed/route.ts", "/api/tasks/clear-failed"],
  ["tasks/route.ts", "/api/tasks"],
]);

async function listRouteFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        return listRouteFiles(path);
      }

      return entry.name === "route.ts" ? [path] : [];
    })
  );

  return files.flat();
}

const routeFiles = await listRouteFiles(apiDir.pathname);
assert.deepEqual(
  routeFiles.map((file) => relative(apiDir.pathname, file)).sort(),
  Array.from(expectedRoutes.keys()).sort()
);

for (const file of routeFiles) {
  const relativeFile = relative(apiDir.pathname, file);
  const expectedRoute = expectedRoutes.get(relativeFile);

  assert.equal(file.includes("[id]"), false, `${file} should use $id params`);

  const source = await readFile(file, "utf8");
  assert.equal(source.includes("next/server"), false, `${file} imports next/server`);
  assert.equal(source.includes("NextRequest"), false, `${file} uses NextRequest`);
  assert.equal(source.includes("NextResponse"), false, `${file} uses NextResponse`);
  assert.match(source, /export\s+const\s+Route\s*=\s*createFileRoute/, `${file} must export TanStack Route`);
  assert.match(
    source,
    new RegExp(`createFileRoute\\("${expectedRoute?.replaceAll("$", "\\$")}"\\)`),
    `${file} must route to ${expectedRoute}`
  );
}

console.log("api route migration contract ok");
