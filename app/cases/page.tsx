"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Case } from "@/lib/db";
import { deleteCase, listCases } from "@/lib/repo/caseRepo";

export default function CasesPage() {
  const [items, setItems] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    setItems(await listCases());
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">案例库</h1>
        <Link
          href="/tarot"
          className="rounded-full border border-[#cce7d9] bg-[#ecf8f2] px-4 py-2 text-sm font-medium text-tarot-green transition hover:bg-[#e4f5ed]"
        >
          新建案例
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">加载中…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">还没有案例，先新建一个。</p>
      ) : (
        <ul className="space-y-2">
          {items.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-2xl border border-[#d8ebe3] bg-white p-4 shadow-sm"
            >
              <div>
                <div className="font-medium">{c.title}</div>
                <div className="text-xs text-slate-500">
                  {new Date(c.createdAt).toLocaleString()}
                </div>
              </div>
              <button
                className="text-sm text-red-500 hover:text-red-600"
                onClick={async () => {
                  await deleteCase(c.id);
                  await refresh();
                }}
              >
                删除
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}