import type { Metadata } from "next";
import "./globals.css";
import { TopTabs } from "@/components/TopTabs";

export const metadata: Metadata = {
  title: "塔罗案例助手",
  description: "本地离线可用的塔罗案例录入与分析系统"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <TopTabs>{children}</TopTabs>
      </body>
    </html>
  );
}

