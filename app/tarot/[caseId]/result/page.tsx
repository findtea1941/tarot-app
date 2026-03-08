"use client";

import dynamic from "next/dynamic";

/**
 * 结果页仅客户端加载：服务端不执行 caseRepo/db 与飞宫链，避免刷新时 500。
 */
const ResultPageContent = dynamic(
  () => import("./ResultPageContent").then((m) => ({ default: m.default })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
        加载中…
      </div>
    ),
  }
);

export default function ResultPage() {
  return <ResultPageContent />;
}
