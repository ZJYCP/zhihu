import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "关于",
  description: "了解拾盐记的使用方法，包括如何获取知乎文章链接等教程",
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
