import { Prisma } from "@prisma/client";

/**
 * API 错误响应的统一格式
 */
export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: string;
}

const PRISMA_ERROR_MESSAGES: Record<string, string> = {
  P2000: "输入值过长",
  P2001: "查询条件不匹配任何记录",
  P2002: "数据已存在（唯一约束冲突）",
  P2003: "外键约束失败",
  P2025: "记录不存在",
};

function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): {
  message: string;
  status: number;
  code: string;
} {
  const friendlyMessage = PRISMA_ERROR_MESSAGES[error.code];

  switch (error.code) {
    case "P2025":
      return {
        message: friendlyMessage || "记录不存在",
        status: 404,
        code: error.code,
      };
    case "P2002":
      return {
        message: friendlyMessage || "数据已存在",
        status: 409,
        code: error.code,
      };
    case "P2003":
      return {
        message: friendlyMessage || "关联数据约束失败",
        status: 400,
        code: error.code,
      };
    default:
      return {
        message: friendlyMessage || "数据库操作失败",
        status: 500,
        code: error.code,
      };
  }
}

export function jsonResponse<T>(data: T, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json; charset=utf-8");
  }

  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}

export function successResponse<T>(data: T, status: number = 200) {
  return jsonResponse(data, { status });
}

export function errorResponse(
  message: string,
  status: number = 400,
  code?: string
) {
  const response: ApiErrorResponse = { error: message };
  if (code) response.code = code;
  return jsonResponse(response, { status });
}

export function handleApiError(
  error: unknown,
  defaultMessage: string = "操作失败"
): Response {
  // 所有环境都记录错误日志，便于线上排查问题
  console.error("[API Error]", error);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const { message, status, code } = handlePrismaError(error);
    return errorResponse(message, status, code);
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return errorResponse("数据库连接失败，请稍后重试", 503, "DB_CONNECTION_ERROR");
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return errorResponse("请求参数格式错误", 400, "VALIDATION_ERROR");
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return errorResponse("数据库服务异常，请稍后重试", 503, "DB_PANIC_ERROR");
  }

  if (error instanceof Error) {
    if (error.name === "SyntaxError" && error.message.includes("JSON")) {
      return errorResponse("请求体格式错误，请检查 JSON 格式", 400, "JSON_PARSE_ERROR");
    }

    // 生产环境不暴露内部错误信息，避免泄露敏感数据
    const message = process.env.NODE_ENV === "development"
      ? (error.message || defaultMessage)
      : defaultMessage;
    return errorResponse(message, 500, "INTERNAL_ERROR");
  }

  return errorResponse(defaultMessage, 500, "UNKNOWN_ERROR");
}

export async function safeParseJson<T = Record<string, unknown>>(
  request: Request
): Promise<T | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/**
 * 校验并规范化分页参数，防止 NaN / 负数 / 超大值
 */
export function parsePagination(searchParams: URLSearchParams, defaults = { page: 1, limit: 20 }) {
  const page = Math.max(Number.parseInt(searchParams.get("page") || String(defaults.page), 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(searchParams.get("limit") || String(defaults.limit), 10) || defaults.limit, 1), 100);
  return { page, limit };
}
