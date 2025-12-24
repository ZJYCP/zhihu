import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "统计",
  description: "查看内容采集统计数据，包括文章数量、采集趋势等",
};

export default function StatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
