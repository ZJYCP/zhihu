"use client";

import { useState, useEffect, useCallback } from "react";
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

interface ConfigResponse {
  key: string;
  value: string;
}

interface AuthResponse {
  token: string;
}

const AUTH_KEY = "admin_token";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"articles" | "settings">("articles");

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
      </div>

      {activeTab === "articles" ? <ArticleManager /> : <SettingsManager />}
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

// 系统设置组件
function SettingsManager() {
  const [cookie, setCookie] = useState("");
  const [saving, setSaving] = useState(false);
  const [cookieStatus, setCookieStatus] = useState<CookieStatus | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // 获取当前配置
    apiGet<ConfigResponse>("/api/admin/config?key=zhihu_cookie", false).then((result) => {
      if (result.success && result.data?.value) {
        setCookie(result.data.value);
      }
    });

    // 获取 Cookie 状态
    fetchCookieStatus();
  }, []);

  const fetchCookieStatus = async () => {
    const result = await apiGet<CookieStatus>("/api/admin/cookie-status", false);
    if (result.success) {
      setCookieStatus(result.data);
    }
  };

  const saveCookie = async () => {
    setSaving(true);
    const result = await apiPost("/api/admin/config", { key: "zhihu_cookie", value: cookie });
    setSaving(false);
    if (result.success) {
      toast.success("Cookie 保存成功");
    }
  };

  const checkCookieNow = async () => {
    setChecking(true);
    const result = await apiGet("/api/cron/check-cookie", false);
    await fetchCookieStatus();
    setChecking(false);
    if (result.success) {
      toast.success("Cookie 检查完成");
    }
  };

  return (
    <div className="space-y-6">
      {/* Cookie 配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cookie 配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-[hsl(var(--muted-foreground))] mb-2 block">
              知乎 Cookie
            </label>
            <textarea
              value={cookie}
              onChange={(e) => setCookie(e.target.value)}
              className="w-full h-32 p-3 border rounded-lg bg-[hsl(var(--background))] text-sm font-mono resize-none"
              placeholder="粘贴你的知乎 Cookie..."
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={saveCookie} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "保存中..." : "保存 Cookie"}
            </Button>
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
