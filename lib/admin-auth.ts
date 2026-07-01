import { createHmac, timingSafeEqual } from "node:crypto";
import { errorResponse } from "./api-response";

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
  const secret = process.env.APP_SECRET;
  if (!secret) {
    throw new Error("APP_SECRET 未配置");
  }

  return secret;
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
