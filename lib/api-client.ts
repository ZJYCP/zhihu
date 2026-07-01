import { toast } from "sonner";

const ADMIN_TOKEN_KEY = "admin_token";

/**
 * API 响应结果类型
 */
export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; status?: number; code?: string };

/**
 * API 错误响应格式
 */
interface ApiErrorResponse {
  error: string;
  code?: string;
}

/**
 * 统一的 API 请求封装
 *
 * @param url - 请求地址
 * @param options - fetch 选项
 * @param showError - 是否显示错误 toast（默认 true）
 * @returns ApiResult<T>
 *
 * @example
 * ```ts
 * const result = await api<Article[]>('/api/articles');
 * if (result.success) {
 *   setArticles(result.data);
 * }
 * ```
 */
export async function api<T>(
  url: string,
  options?: RequestInit,
  showError: boolean = true
): Promise<ApiResult<T>> {
  try {
    const headers = new Headers(options?.headers);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    if (url.startsWith("/api/admin/") && typeof window !== "undefined") {
      const token = window.localStorage.getItem(ADMIN_TOKEN_KEY);
      if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }

    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await parseJsonResponse(res);

    if (!res.ok) {
      const errorData = data as ApiErrorResponse | null;
      const errorMessage =
        errorData?.error || `请求失败 (${res.status})`;
      if (showError) {
        toast.error(errorMessage);
      }
      return {
        success: false,
        error: errorMessage,
        status: res.status,
        code: errorData?.code,
      };
    }

    return { success: true, data: data as T };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "网络请求失败";
    if (showError) {
      toast.error(errorMessage);
    }
    return { success: false, error: errorMessage };
  }
}

async function parseJsonResponse(res: Response) {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/**
 * GET 请求快捷方法
 */
export function apiGet<T>(url: string, showError?: boolean) {
  return api<T>(url, { method: "GET" }, showError);
}

/**
 * POST 请求快捷方法
 */
export function apiPost<T>(url: string, body?: unknown, showError?: boolean) {
  return api<T>(
    url,
    {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    },
    showError
  );
}

/**
 * PUT 请求快捷方法
 */
export function apiPut<T>(url: string, body?: unknown, showError?: boolean) {
  return api<T>(
    url,
    {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    },
    showError
  );
}

/**
 * DELETE 请求快捷方法
 */
export function apiDelete<T>(url: string, body?: unknown, showError?: boolean) {
  return api<T>(
    url,
    {
      method: "DELETE",
      body: body ? JSON.stringify(body) : undefined,
    },
    showError
  );
}
