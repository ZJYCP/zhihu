import { useState } from "react";
import { RefreshCw } from "lucide-react";

export function RecrawlButton({
  taskId,
  onRecrawled,
}: {
  taskId: string;
  onRecrawled: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  const handleRecrawl = async () => {
    if (!confirm("确定要重新爬取这篇文章吗？")) return;

    setLoading(true);
    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "爬取失败");
      }

      await onRecrawled();
      alert("重新爬取成功！");
    } catch (error) {
      alert(error instanceof Error ? error.message : "重新爬取失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleRecrawl}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      {loading ? "爬取中..." : "重新爬取"}
    </button>
  );
}
