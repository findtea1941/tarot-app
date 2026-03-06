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
          className="px-3 py-1.5 rounded-md bg-tarot-card border border-slate-700 text-slate-100"
        >
          新建案例
        </Link>
      </div>

      {loading ? (
        <p className="text-slate-300 text-sm">加载中…</p>
      ) : items.length === 0 ? (
        <p className="text-slate-300 text-sm">还没有案例，先新建一个。</p>
      ) : (
        <ul className="space-y-2">
          {items.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-3"
            >
              <div>
                <div className="font-medium">{c.title}</div>
                <div className="text-xs text-slate-400">
                  {new Date(c.createdAt).toLocaleString()}
                </div>
              </div>
              <button
                className="text-sm text-red-300 hover:text-red-200"
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