export default function ArticleLoading() {
  return (
    <main className="container mx-auto max-w-3xl p-6 animate-pulse">
      {/* 返回按钮骨架 */}
      <div className="h-5 w-20 bg-[hsl(var(--muted))] rounded mb-8" />

      {/* 标题骨架 */}
      <div className="h-10 w-3/4 bg-[hsl(var(--muted))] rounded mb-4" />

      {/* 元信息骨架 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-4 w-16 bg-[hsl(var(--muted))] rounded" />
        <div className="h-4 w-24 bg-[hsl(var(--muted))] rounded" />
        <div className="h-4 w-20 bg-[hsl(var(--muted))] rounded" />
      </div>

      {/* 分割线 */}
      <hr className="mb-8" />

      {/* 正文骨架 */}
      <div className="space-y-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-full bg-[hsl(var(--muted))] rounded" />
            <div className="h-4 w-full bg-[hsl(var(--muted))] rounded" />
            <div className="h-4 w-4/5 bg-[hsl(var(--muted))] rounded" />
          </div>
        ))}
      </div>
    </main>
  );
}
