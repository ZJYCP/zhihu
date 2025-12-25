"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton() {
  const router = useRouter();

  const handleBack = () => {
    // 检查是否有历史记录可以后退
    if (window.history.length > 1) {
      router.back();
    } else {
      // 没有历史记录时跳转到首页
      router.push("/");
    }
  };

  return (
    <button
      onClick={handleBack}
      className="inline-flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] mb-8 cursor-pointer"
    >
      <ArrowLeft className="h-4 w-4" />
      返回列表
    </button>
  );
}
