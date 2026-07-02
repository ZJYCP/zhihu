import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Trash2, Edit, RefreshCw, X, Save } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPut, apiDelete } from "@/lib/client/api-client";
import type {
  AdminArticleListItem as Article,
  AdminArticlesResponse as ArticlesResponse,
} from "@/lib/shared/types";

// 文章管理组件
export function ArticleManager() {
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
