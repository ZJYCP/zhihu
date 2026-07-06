import { createHmac, timingSafeEqual } from "node:crypto";
import { errorResponse } from "./api-response";
import { getAppSecret, getExternalApiSecret } from "./env";

const TOKEN_TTL_SECONDS = 60 * 60 * 24;

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    // 长度不等时仍执行恒定时间比较，避免时序侧信道泄露长度信息
    const dummy = Buffer.alloc(rightBuffer.length);
    timingSafeEqual(dummy, rightBuffer);
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function createAdminToken(
  secret: string,
  issuedAt: number = Math.floor(Date.now() / 1000)
) {
  const payload = base64UrlEncode(
    JSON.stringify({
      sub: "admin",
      iat: issuedAt,
    })
  );
  const signature = sign(payload, secret);

  return `${payload}.${signature}`;
}

export function verifyAdminToken(
  token: string | null | undefined,
  secret: string,
  now: number = Math.floor(Date.now() / 1000)
) {
  if (!token || !secret) return false;

  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return false;

  if (!safeEqual(signature, sign(payload, secret))) {
    return false;
  }

  try {
    const data = JSON.parse(base64UrlDecode(payload)) as {
      sub?: string;
      iat?: number;
    };

    if (data.sub !== "admin" || typeof data.iat !== "number") {
      return false;
    }

    return data.iat <= now && now - data.iat <= TOKEN_TTL_SECONDS;
  } catch {
    return false;
  }
}

export function getBearerToken(request: Request) {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim();
}

export function getRequiredAppSecret() {
  return getAppSecret();
}

export function verifyAdminRequest(request: Request) {
  return verifyAdminToken(getBearerToken(request), getRequiredAppSecret());
}

export function requireAdminRequest(request: Request) {
  let secret: string;

  try {
    secret = getRequiredAppSecret();
  } catch {
    return errorResponse("APP_SECRET 未配置", 500, "APP_SECRET_MISSING");
  }

  if (!verifyAdminToken(getBearerToken(request), secret)) {
    return errorResponse("未授权", 401, "UNAUTHORIZED");
  }

  return null;
}

/**
 * 高阶函数：为 admin API handler 统一做鉴权，免去每个 handler 重复
 * `requireAdminRequest(request); if (authError) return authError;` 样板。
 *
 * @example
 * ```ts
 * export const Route = createFileRoute("/api/admin/foo")({
 *   server: {
 *     handlers: {
 *       GET: withAdmin(({ request }) => getFoo(request)),
 *     },
 *   },
 * });
 * ```
 */
export function withAdmin<TParams extends Record<string, string>>(
  handler: (ctx: { request: Request; params: TParams }) => Promise<Response>,
): (ctx: { request: Request; params: TParams }) => Promise<Response> {
  return async (ctx) => {
    const authError = requireAdminRequest(ctx.request);
    if (authError) return authError;
    return handler(ctx);
  };
}

/**
 * 外部系统通道鉴权：用独立静态 secret（EXTERNAL_API_SECRET）校验，
 * 不走 admin token 登录流程，适合机器对机器的低频调用。
 * secret 未配置时返回 503（该通道视为关闭），不让进程崩溃。
 */
export function requireExternalSecret(request: Request) {
  const secret = getExternalApiSecret();
  if (!secret) {
    return errorResponse("外部接口未启用", 503, "EXTERNAL_API_DISABLED");
  }

  if (!safeEqual(getBearerToken(request) ?? "", secret)) {
    return errorResponse("未授权", 401, "UNAUTHORIZED");
  }

  return null;
}

/**
 * 高阶函数：为外部系统 API handler 统一做 secret 鉴权，形态与 withAdmin 对称。
 */
export function withExternalSecret<TParams extends Record<string, string>>(
  handler: (ctx: { request: Request; params: TParams }) => Promise<Response>,
): (ctx: { request: Request; params: TParams }) => Promise<Response> {
  return async (ctx) => {
    const authError = requireExternalSecret(ctx.request);
    if (authError) return authError;
    return handler(ctx);
  };
}
