import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

/**
 * API 错误响应的统一格式
 */
export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: string;
}

/**
 * Prisma 错误码映射到友好提示
 */
const PRISMA_ERROR_MESSAGES: Record<string, string> = {
  P2000: "输入值过长",
  P2001: "查询条件不匹配任何记录",
  P2002: "数据已存在（唯一约束冲突）",
  P2003: "外键约束失败",
  P2025: "记录不存在",
};

/**
 * 处理 Prisma 错误，返回友好的错误信息
 */
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

/**
 * 统一的 API 错误处理函数
 *
 * @param error - 捕获的错误
 * @param defaultMessage - 默认错误提示（用于未知错误）
 * @returns NextResponse 对象
 *
 * @example
 * ```ts
 * try {
 *   const data = await prisma.user.findMany();
 *   return NextResponse.json(data);
 * } catch (error) {
 *   return handleApiError(error, "获取用户列表失败");
 * }
 * ```
 */
export function handleApiError(
  error: unknown,
  defaultMessage: string = "操作失败"
): NextResponse<ApiErrorResponse> {
  // 开发环境下打印错误日志
  if (process.env.NODE_ENV === "development") {
    console.error("[API Error]", error);
  }

  // Prisma 已知错误（如约束冲突、记录不存在等）
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const { message, status, code } = handlePrismaError(error);
    return NextResponse.json({ error: message, code }, { status });
  }

  // Prisma 初始化错误（数据库连接失败）
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return NextResponse.json(
      { error: "数据库连接失败，请稍后重试", code: "DB_CONNECTION_ERROR" },
      { status: 503 }
    );
  }

  // Prisma 验证错误（参数类型错误等）
  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json(
      { error: "请求参数格式错误", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  // Prisma 超时或连接被拒绝
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return NextResponse.json(
      { error: "数据库服务异常，请稍后重试", code: "DB_PANIC_ERROR" },
      { status: 503 }
    );
  }

  // 标准 Error 对象
  if (error instanceof Error) {
    // 检查是否是 JSON 解析错误
    if (error.name === "SyntaxError" && error.message.includes("JSON")) {
      return NextResponse.json(
        { error: "请求体格式错误，请检查 JSON 格式", code: "JSON_PARSE_ERROR" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || defaultMessage, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }

  // 未知错误
  return NextResponse.json(
    { error: defaultMessage, code: "UNKNOWN_ERROR" },
    { status: 500 }
  );
}

/**
 * 安全解析 JSON 请求体
 *
 * @param request - NextRequest 对象
 * @returns 解析后的对象，如果解析失败返回 null
 *
 * @example
 * ```ts
 * const body = await safeParseJson(request);
 * if (!body) {
 *   return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
 * }
 * ```
 */
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
 * 创建成功响应
 */
export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}

/**
 * 创建错误响应
 */
export function errorResponse(
  message: string,
  status: number = 400,
  code?: string
) {
  const response: ApiErrorResponse = { error: message };
  if (code) response.code = code;
  return NextResponse.json(response, { status });
}
