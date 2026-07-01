import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/* global console */

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const packageLock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const dockerfile = readFileSync("Dockerfile", "utf8");
const compose = readFileSync("docker-compose.yml", "utf8");
const dockerignore = readFileSync(".dockerignore", "utf8");

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
  "prisma CLI must be a production dependency so docker compose run web npm run db:push works",
);
assert.equal(
  packageJson.devDependencies?.prisma,
  undefined,
  "prisma CLI should not be dev-only",
);

for (const packagePath of collectDependencyClosure("prisma")) {
  assertProductionPackage(packagePath.replace(/^node_modules\//, ""));
}

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
  "runtime image should include Prisma schema for explicit db:push",
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
