"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
      <h2 className="text-lg font-semibold text-slate-800">出错了</h2>
      <p className="max-w-md text-center text-sm text-slate-600">
        {error.message || "页面加载时发生错误"}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-xl bg-tarot-green px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        重试
      </button>
    </div>
  );
}
