import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { handleAdminAuthPost } from "../app/api/admin/auth/route";
import {
  createAdminToken,
  getBearerToken,
  requireAdminRequest,
  verifyAdminToken,
  verifyAdminRequest,
} from "../lib/admin-auth";
import {
  errorResponse,
  handleApiError,
  safeParseJson,
  successResponse,
} from "../lib/api-response";

const secret = "test-secret-with-enough-entropy";
const token = createAdminToken(secret, 1_700_000_000);

assert.equal(verifyAdminToken(token, secret, 1_700_000_000), true);
assert.equal(verifyAdminToken(token, "different-secret", 1_700_000_000), false);

const tampered = token.replace(/.$/, token.endsWith("a") ? "b" : "a");
assert.equal(verifyAdminToken(tampered, secret, 1_700_000_000), false);

const expired = createAdminToken(secret, 1_700_000_000 - 60 * 60 * 25);
assert.equal(verifyAdminToken(expired, secret, 1_700_000_000), false);

const future = createAdminToken(secret, 1_700_000_010);
assert.equal(verifyAdminToken(future, secret, 1_700_000_000), false);
assert.equal(verifyAdminToken("malformed-token", secret, 1_700_000_000), false);

const currentToken = createAdminToken(secret);
const bearerRequest = new Request("http://localhost/api/admin/config", {
  headers: { Authorization: `Bearer ${currentToken}` },
});
assert.equal(getBearerToken(bearerRequest), currentToken);

const previousSecret = process.env.APP_SECRET;
const previousPassword = process.env.ADMIN_PASSWORD;
process.env.APP_SECRET = secret;
assert.equal(verifyAdminRequest(bearerRequest), true);
assert.equal(requireAdminRequest(bearerRequest), null);
assert.equal(
  requireAdminRequest(new Request("http://localhost/api/admin/config"))?.status,
  401
);

const success = successResponse({ ok: true }, 201);
assert.equal(success.status, 201);
assert.deepEqual(await success.json(), { ok: true });

const error = errorResponse("失败", 401, "UNAUTHORIZED");
assert.equal(error.status, 401);
assert.deepEqual(await error.json(), {
  error: "失败",
  code: "UNAUTHORIZED",
});

assert.equal(
  await safeParseJson(new Request("http://localhost", { method: "POST", body: "{" })),
  null
);

const notFound = handleApiError(
  new Prisma.PrismaClientKnownRequestError("not found", {
    code: "P2025",
    clientVersion: "test",
  })
);
assert.equal(notFound.status, 404);
assert.deepEqual(await notFound.json(), {
  error: "记录不存在",
  code: "P2025",
});

async function postAuth(body: string) {
  return handleAdminAuthPost(
    new Request("http://localhost/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    })
  );
}

process.env.ADMIN_PASSWORD = "admin-password";
process.env.APP_SECRET = secret;

const badJson = await postAuth("{");
assert.equal(badJson.status, 400);
assert.deepEqual(await badJson.json(), {
  error: "请求体格式错误",
  code: "JSON_PARSE_ERROR",
});

delete process.env.ADMIN_PASSWORD;
const missingPassword = await postAuth(JSON.stringify({ password: "wrong" }));
assert.equal(missingPassword.status, 500);
assert.deepEqual(await missingPassword.json(), {
  error: "管理密码未配置",
  code: "ADMIN_PASSWORD_MISSING",
});

process.env.ADMIN_PASSWORD = "admin-password";
delete process.env.APP_SECRET;
const missingSecret = await postAuth(JSON.stringify({ password: "wrong" }));
assert.equal(missingSecret.status, 500);
assert.deepEqual(await missingSecret.json(), {
  error: "APP_SECRET 未配置",
  code: "APP_SECRET_MISSING",
});

process.env.APP_SECRET = secret;
const wrongPassword = await postAuth(JSON.stringify({ password: "wrong" }));
assert.equal(wrongPassword.status, 401);
assert.deepEqual(await wrongPassword.json(), {
  error: "密码错误",
  code: "INVALID_PASSWORD",
});

const login = await postAuth(JSON.stringify({ password: "admin-password" }));
assert.equal(login.status, 200);
const loginBody = (await login.json()) as { success: boolean; token: string };
assert.equal(loginBody.success, true);
assert.equal(verifyAdminToken(loginBody.token, secret), true);

if (previousSecret === undefined) {
  delete process.env.APP_SECRET;
} else {
  process.env.APP_SECRET = previousSecret;
}

if (previousPassword === undefined) {
  delete process.env.ADMIN_PASSWORD;
} else {
  process.env.ADMIN_PASSWORD = previousPassword;
}

console.log("admin-auth contract ok");
