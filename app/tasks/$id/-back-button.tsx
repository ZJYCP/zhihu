"use client";

import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function BackButton() {
  const navigate = useNavigate();

  const handleBack = () => {
    // 检查是否有历史记录可以后退
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // 没有历史记录时跳转到首页
      navigate({ to: "/" });
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className="inline-flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] cursor-pointer"
    >
      <ArrowLeft className="h-4 w-4" />
      返回列表
    </button>
  );
}
