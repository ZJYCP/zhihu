import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

/* global console */

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const packageLock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const dockerfile = readFileSync("Dockerfile", "utf8");
const compose = readFileSync("docker-compose.yml", "utf8");
const dockerignore = readFileSync(".dockerignore", "utf8");
const migrationLock = readFileSync("prisma/migrations/migration_lock.toml", "utf8");
const currentSchemaMigration = readFileSync(
  "prisma/migrations/20260701000000_init_current_schema/migration.sql",
  "utf8",
);

function assertProductionPackage(packageName) {
  const packagePath = `node_modules/${packageName}`;
  const metadata = packageLock.packages?.[packagePath];

  assert.ok(metadata, `${packagePath} is present in package-lock.json`);
  assert.equal(metadata.dev, undefined, `${packagePath} must not be dev-only`);
  assert.equal(
    metadata.devOptional,
    undefined,
    `${packagePath} must not be pruned from the production Docker image`,
  );
}

function collectDependencyClosure(packageName, seen = new Set()) {
  const packagePath = `node_modules/${packageName}`;
  if (seen.has(packagePath)) {
    return seen;
  }

  const metadata = packageLock.packages?.[packagePath];
  assert.ok(metadata, `${packagePath} is present in package-lock.json`);

  seen.add(packagePath);
  for (const dependencyName of Object.keys(metadata.dependencies ?? {})) {
    collectDependencyClosure(dependencyName, seen);
  }

  return seen;
}

assert.ok(
  packageJson.dependencies?.prisma,
  "prisma CLI must be a production dependency so production startup can run migrations",
);
assert.equal(
  packageJson.devDependencies?.prisma,
  undefined,
  "prisma CLI should not be dev-only",
);

for (const packagePath of collectDependencyClosure("prisma")) {
  assertProductionPackage(packagePath.replace(/^node_modules\//, ""));
}

assert.equal(
  packageJson.scripts?.["db:migrate:deploy"],
  "prisma migrate deploy",
  "package scripts should expose Prisma production migration deployment",
);
assert.match(
  packageJson.scripts?.["start:prod"] ?? "",
  /prisma migrate deploy[\s\S]*node \.output\/server\/index\.mjs/,
  "production startup should apply pending Prisma migrations before starting the server",
);

assert.match(
  dockerfile,
  /RUN npm prune --omit=dev/,
  "Dockerfile should prune dev dependencies in the runtime image",
);
assert.doesNotMatch(
  dockerfile,
  /prisma db push/,
  "Dockerfile must not mutate the database schema during image build",
);
assert.match(
  dockerfile,
  /COPY --from=builder \/app\/prisma \.\/prisma/,
  "runtime image should include Prisma schema and migrations for production migrate deploy",
);
assert.ok(
  existsSync("prisma/migrations/20260701000000_init_current_schema/migration.sql"),
  "repository should include a committed Prisma migration for the current schema",
);
assert.match(
  currentSchemaMigration,
  /"content_preview" TEXT/,
  "initial migration should create content_preview as a regular text column",
);
assert.doesNotMatch(
  currentSchemaMigration,
  /"content_preview" TEXT DEFAULT .*content/,
  "initial migration must not use an invalid PostgreSQL default expression that references another column",
);
assert.match(
  currentSchemaMigration,
  /CREATE OR REPLACE FUNCTION "set_crawl_task_content_preview"/,
  "initial migration should maintain content_preview through a database trigger",
);
assert.match(
  migrationLock,
  /provider = "postgresql"/,
  "Prisma migrations should be locked to the PostgreSQL provider",
);
assert.match(
  dockerfile,
  /CMD \["npm", "run", "start:prod"\]/,
  "runtime container should run the migration-aware production startup script",
);
assert.match(
  dockerfile,
  /COPY --from=builder \/app\/prisma \.\/prisma/,
  "runtime image should include Prisma migrations",
);
assert.doesNotMatch(
  compose,
  /db:push/,
  "Compose deployment should not require manual db:push",
);

assert.match(
  compose,
  /^services:\n {2}web:/m,
  "Compose should define the web service",
);
assert.doesNotMatch(
  compose,
  /^\s+(postgres|db):/m,
  "Compose should not include a bundled PostgreSQL service",
);
assert.match(
  compose,
  /DATABASE_URL: \${DATABASE_URL:\?DATABASE_URL is required}/,
  "Compose should require the external DATABASE_URL from .env",
);
assert.match(
  compose,
  /ADMIN_PASSWORD: \${ADMIN_PASSWORD:\?ADMIN_PASSWORD is required}/,
  "Compose should fail fast when ADMIN_PASSWORD is missing",
);
assert.match(
  compose,
  /APP_SECRET: \${APP_SECRET:\?APP_SECRET is required}/,
  "Compose should fail fast when APP_SECRET is missing",
);

assert.doesNotMatch(
  dockerignore,
  /^Dockerfile$/m,
  ".dockerignore should not exclude Dockerfile from the build context",
);
assert.doesNotMatch(
  dockerignore,
  /^docker-compose\.yml$/m,
  ".dockerignore should not exclude docker-compose.yml from the build context",
);

console.log("deploy contract ok");
