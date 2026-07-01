"use client";

import { useState, useEffect, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Trash2,
  Edit,
  RefreshCw,
  X,
  Save,
  Settings,
  FileText,
  Lock,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";

interface Article {
  id: string;
  url: string;
  status: string;
  title: string | null;
  author: string | null;
  error: string | null;
  createdAt: string;
}

interface ArticlesResponse {
  articles: Article[];
  totalPages: number;
}

interface CookieStatus {
  latest: {
    success: boolean;
    message: string;
    checkedAt: string;
  } | null;
  successRate: number;
  logs: { success: boolean; checkedAt: string }[];
}

interface ConfigItem {
  key: string;
  value: string;
  maskedValue: string;
  label: string;
  description: string;
  defaultValue: string;
  sensitive: boolean;
  kind: "string" | "number" | "secret";
}

interface FeedbackItem {
  id: string;
  type: FeedbackType;
  content: string;
  status: FeedbackStatus;
  createdAt: string;
  task: {
    id: string;
    title: string | null;
    author: string | null;
    url: string;
  };
}

interface FeedbackResponse {
  feedback: FeedbackItem[];
  totalPages: number;
}

type FeedbackStatus = "OPEN" | "RESOLVED";
type FeedbackType =
  | "INCOMPLETE_CONTENT"
  | "GARBLED_TEXT"
  | "MISSING_IMAGE"
  | "OTHER";

const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  INCOMPLETE_CONTENT: "内容不完整",
  GARBLED_TEXT: "内容乱码",
  MISSING_IMAGE: "图片缺失",
  OTHER: "其他",
};

interface AuthResponse {
  token: string;
}

const AUTH_KEY = "admin_token";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "管理后台 | 拾盐记" },
      { name: "description", content: "拾盐记内容采集管理后台" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"articles" | "feedback" | "settings">("articles");

  // 检查是否已登录
  useEffect(() => {
    const token = localStorage.getItem(AUTH_KEY);
    if (token) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = await apiPost<AuthResponse>("/api/admin/auth", { password }, false);

    if (result.success && result.data.token) {
      localStorage.setItem(AUTH_KEY, result.data.token);
      setIsAuthenticated(true);
    } else {
      setError(result.success ? "登录失败" : result.error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_KEY);
    setIsAuthenticated(false);
    setPassword("");
  };

  // 加载中
  if (loading) {
    return (
      <main className="container mx-auto max-w-6xl p-6">
        <p className="text-[hsl(var(--muted-foreground))]">加载中...</p>
      </main>
    );
  }

  // 未登录，显示登录界面
  if (!isAuthenticated) {
    return (
      <main className="container mx-auto max-w-md p-6 min-h-[60vh] flex items-center">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="h-4 w-4" />
              管理后台
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="请输入管理密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
              <Button type="submit" className="w-full">
                登录
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-6xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">管理后台</h1>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          退出登录
        </Button>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === "articles" ? "default" : "outline"}
          onClick={() => setActiveTab("articles")}
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          文章管理
        </Button>
        <Button
          variant={activeTab === "settings" ? "default" : "outline"}
          onClick={() => setActiveTab("settings")}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          系统设置
        </Button>
        <Button
          variant={activeTab === "feedback" ? "default" : "outline"}
          onClick={() => setActiveTab("feedback")}
          className="gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          反馈管理
        </Button>
      </div>

      {activeTab === "articles" && <ArticleManager />}
      {activeTab === "feedback" && <FeedbackManager />}
      {activeTab === "settings" && <SettingsManager />}
    </main>
  );
}

// 文章管理组件
function ArticleManager() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ title: string; author: string }>({
    title: "",
    author: "",
  });

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "20",
      search,
    });
    const result = await apiGet<ArticlesResponse>(`/api/admin/articles?${params}`, false);
    if (result.success) {
      setArticles(result.data.articles);
      setTotalPages(result.data.totalPages);
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchArticles();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除这篇文章吗？")) return;
    const result = await apiDelete(`/api/admin/articles/${id}`);
    if (result.success) {
      toast.success("文章已删除");
      fetchArticles();
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`确定删除选中的 ${selectedIds.size} 篇文章吗？`)) return;
    const result = await apiDelete<{ deleted: number }>("/api/admin/articles", { ids: Array.from(selectedIds) });
    if (result.success) {
      toast.success(`已删除 ${result.data.deleted} 篇文章`);
      setSelectedIds(new Set());
      fetchArticles();
    }
  };

  const startEdit = (article: Article) => {
    setEditingId(article.id);
    setEditData({
      title: article.title || "",
      author: article.author || "",
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const result = await apiPut(`/api/admin/articles/${editingId}`, editData);
    if (result.success) {
      toast.success("保存成功");
      setEditingId(null);
      fetchArticles();
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === articles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(articles.map((a) => a.id)));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">文章管理</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 搜索和操作栏 */}
        <div className="flex gap-2 flex-wrap">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
            <Input
              placeholder="搜索标题、作者、URL..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="outline">
              <Search className="h-4 w-4" />
            </Button>
          </form>
          <Button
            variant="outline"
            onClick={fetchArticles}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {selectedIds.size > 0 && (
            <Button variant="destructive" onClick={handleBatchDelete}>
              <Trash2 className="h-4 w-4 mr-1" />
              删除 ({selectedIds.size})
            </Button>
          )}
        </div>

        {/* 文章列表 */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[hsl(var(--muted))]">
              <tr>
                <th className="p-2 text-left w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === articles.length && articles.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="p-2 text-left">标题</th>
                <th className="p-2 text-left w-24">作者</th>
                <th className="p-2 text-left w-24">状态</th>
                <th className="p-2 text-left w-32">时间</th>
                <th className="p-2 text-left w-24">操作</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr
                  key={article.id}
                  className="border-t hover:bg-[hsl(var(--muted))]/50"
                >
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(article.id)}
                      onChange={() => toggleSelect(article.id)}
                    />
                  </td>
                  <td className="p-2">
                    {editingId === article.id ? (
                      <Input
                        value={editData.title}
                        onChange={(e) =>
                          setEditData({ ...editData, title: e.target.value })
                        }
                        className="h-8"
                      />
                    ) : (
                      <span
                        className="line-clamp-1 cursor-pointer hover:text-blue-500"
                        title={article.title || article.url}
                      >
                        {article.title || article.url}
                      </span>
                    )}
                  </td>
                  <td className="p-2">
                    {editingId === article.id ? (
                      <Input
                        value={editData.author}
                        onChange={(e) =>
                          setEditData({ ...editData, author: e.target.value })
                        }
                        className="h-8"
                      />
                    ) : (
                      <span className="text-[hsl(var(--muted-foreground))]">
                        {article.author || "-"}
                      </span>
                    )}
                  </td>
                  <td className="p-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        article.status === "COMPLETED"
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          : article.status === "FAILED"
                          ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                      }`}
                    >
                      {article.status}
                    </span>
                  </td>
                  <td className="p-2 text-[hsl(var(--muted-foreground))]">
                    {new Date(article.createdAt).toLocaleDateString("zh-CN")}
                  </td>
                  <td className="p-2">
                    {editingId === article.id ? (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={saveEdit}>
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEdit(article)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(article.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">
            第 {page} / {totalPages} 页
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FeedbackManager() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState<FeedbackStatus | "">("OPEN");

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
    });
    if (status) params.set("status", status);

    const result = await apiGet<FeedbackResponse>(
      `/api/admin/feedback?${params}`,
      false
    );
    if (result.success) {
      setFeedback(result.data.feedback);
      setTotalPages(result.data.totalPages);
    }
    setLoading(false);
  }, [page, status]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const markResolved = async (id: string) => {
    const result = await apiPut(`/api/admin/feedback/${id}`, {
      status: "RESOLVED",
    });
    if (result.success) {
      toast.success("反馈已标记为已处理");
      fetchFeedback();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">反馈管理</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as FeedbackStatus | "");
              setPage(1);
            }}
            className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
          >
            <option value="">全部反馈</option>
            <option value="OPEN">待处理</option>
            <option value="RESOLVED">已处理</option>
          </select>
          <Button variant="outline" onClick={fetchFeedback} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="space-y-3">
          {feedback.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-[hsl(var(--border))] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        item.status === "OPEN"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                          : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      }`}
                    >
                      {item.status === "OPEN" ? "待处理" : "已处理"}
                    </span>
                    <span className="rounded bg-[hsl(var(--muted))] px-2 py-0.5 text-xs">
                      {FEEDBACK_TYPE_LABELS[item.type]}
                    </span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      {new Date(item.createdAt).toLocaleString("zh-CN")}
                    </span>
                  </div>
                  <p className="font-medium line-clamp-1">
                    {item.task.title || item.task.url}
                  </p>
                  {item.task.author && (
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {item.task.author}
                    </p>
                  )}
                </div>
                {item.status === "OPEN" && (
                  <Button size="sm" onClick={() => markResolved(item.id)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    标记已处理
                  </Button>
                )}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-[hsl(var(--foreground))]">
                {item.content}
              </p>
            </div>
          ))}
        </div>

        {!loading && feedback.length === 0 && (
          <p className="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
            暂无反馈
          </p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">
            第 {page} / {totalPages} 页
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 系统设置组件
function SettingsManager() {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [cookieStatus, setCookieStatus] = useState<CookieStatus | null>(null);
  const [checking, setChecking] = useState(false);

  const fetchConfigs = useCallback(async () => {
    const result = await apiGet<ConfigItem[]>("/api/admin/config", false);
    if (result.success) {
      setConfigs(result.data);
      setValues(
        Object.fromEntries(result.data.map((config) => [config.key, config.value]))
      );

      const sensitiveConfigs = result.data.filter((config) => config.sensitive);
      const sensitiveValues = await Promise.all(
        sensitiveConfigs.map(async (config) => {
          const detail = await apiGet<ConfigItem>(
            `/api/admin/config?key=${encodeURIComponent(config.key)}`,
            false
          );
          return [config.key, detail.success ? detail.data.value : ""] as const;
        })
      );

      setValues((current) => ({
        ...current,
        ...Object.fromEntries(sensitiveValues),
      }));
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
    fetchCookieStatus();
  }, [fetchConfigs]);

  const fetchCookieStatus = async () => {
    const result = await apiGet<CookieStatus>("/api/admin/cookie-status", false);
    if (result.success) {
      setCookieStatus(result.data);
    }
  };

  const saveConfig = async (key: string) => {
    setSavingKey(key);
    const result = await apiPost<ConfigItem>("/api/admin/config", {
      key,
      value: values[key] ?? "",
    });
    setSavingKey(null);
    if (result.success) {
      toast.success("配置已保存");
      setConfigs((current) =>
        current.map((config) => (config.key === key ? result.data : config))
      );
      setValues((current) => ({
        ...current,
        [key]: result.data.sensitive ? values[key] ?? "" : result.data.value,
      }));
    }
  };

  const checkCookieNow = async () => {
    setChecking(true);
    const result = await apiGet("/api/admin/check-cookie", false);
    await fetchCookieStatus();
    setChecking(false);
    if (result.success) {
      toast.success("Cookie 检查完成");
    }
  };

  return (
    <div className="space-y-6">
      {/* 运行时配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">运行时配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {configs.map((config) => (
            <div key={config.key} className="border-b pb-5 last:border-b-0 last:pb-0">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <label className="text-sm font-medium">{config.label}</label>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {config.description}
                  </p>
                </div>
                {config.sensitive && config.maskedValue && (
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    当前：{config.maskedValue}
                  </span>
                )}
              </div>
              {config.sensitive || config.key === "crawler_user_agent" ? (
                <textarea
                  value={values[config.key] ?? ""}
                  onChange={(e) =>
                    setValues((current) => ({
                      ...current,
                      [config.key]: e.target.value,
                    }))
                  }
                  className="w-full h-24 p-3 border rounded-lg bg-[hsl(var(--background))] text-sm font-mono resize-none"
                  placeholder={config.defaultValue || config.label}
                />
              ) : (
                <Input
                  type={config.kind === "number" ? "number" : "text"}
                  value={values[config.key] ?? ""}
                  onChange={(e) =>
                    setValues((current) => ({
                      ...current,
                      [config.key]: e.target.value,
                    }))
                  }
                  placeholder={config.defaultValue}
                />
              )}
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  onClick={() => saveConfig(config.key)}
                  disabled={savingKey === config.key}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {savingKey === config.key ? "保存中..." : "保存"}
                </Button>
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <Button variant="outline" onClick={checkCookieNow} disabled={checking}>
              <RefreshCw className={`h-4 w-4 mr-2 ${checking ? "animate-spin" : ""}`} />
              立即检查
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cookie 状态 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            Cookie 可用性
            {cookieStatus?.latest && (
              <span
                className={`px-2 py-0.5 rounded text-xs ${
                  cookieStatus.latest.success
                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                    : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                }`}
              >
                {cookieStatus.latest.success ? "正常" : "异常"}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cookieStatus?.latest && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-[hsl(var(--muted-foreground))]">
                最近检查：
                {new Date(cookieStatus.latest.checkedAt).toLocaleString("zh-CN")}
              </span>
              <span className="text-[hsl(var(--muted-foreground))]">
                24h 成功率：{cookieStatus.successRate}%
              </span>
            </div>
          )}

          {/* 状态时间线 */}
          {cookieStatus?.logs && cookieStatus.logs.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                最近 24 小时状态
              </p>
              <div className="flex gap-1 flex-wrap">
                {cookieStatus.logs
                  .slice()
                  .reverse()
                  .map((log, i) => (
                    <div
                      key={i}
                      className={`w-3 h-8 rounded-sm ${
                        log.success
                          ? "bg-green-500"
                          : "bg-red-500"
                      }`}
                      title={`${new Date(log.checkedAt).toLocaleString("zh-CN")} - ${
                        log.success ? "正常" : "异常"
                      }`}
                    />
                  ))}
              </div>
            </div>
          )}

          {!cookieStatus?.logs?.length && (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              暂无检查记录，点击"立即检查"进行首次检查
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
