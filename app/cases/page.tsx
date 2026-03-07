"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Case } from "@/lib/db";
import { deleteCase, listCasesByType, listDrafts, searchCases } from "@/lib/repo/caseRepo";

type CaseTab = "tarot" | "lenormand";

export default function CasesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<CaseTab>("tarot");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<Case[]>([]);
  const [drafts, setDrafts] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const showDrafts = searchParams.get("view") === "drafts";

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (showDrafts) {
        setDrafts(await listDrafts());
      } else if (searchQuery.trim()) {
        setItems(await searchCases(searchQuery));
      } else {
        setItems(await listCasesByType(tab));
      }
    } finally {
      setLoading(false);
    }
  }, [tab, searchQuery, showDrafts]);

  useEffect(() => {
    const t = setTimeout(() => refresh(), searchQuery && !showDrafts ? 200 : 0);
    return () => clearTimeout(t);
  }, [refresh, searchQuery, showDrafts]);

  const isSearchMode = !!searchQuery.trim();
  const displayItems = showDrafts
    ? drafts
    : items;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <h1 className="text-3xl font-semibold">案例库</h1>
          {(!showDrafts && !isSearchMode) || showDrafts ? (
            <div className="flex gap-0.5 rounded-full border border-[#e2ebe7] bg-white p-0.5">
              <button
                type="button"
                onClick={() => {
                  setTab("tarot");
                  if (showDrafts) router.push("/cases");
                }}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  tab === "tarot"
                    ? "bg-tarot-green text-white"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                塔罗
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab("lenormand");
                  if (showDrafts) router.push("/cases");
                }}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  tab === "lenormand"
                    ? "bg-tarot-green text-white"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                雷诺曼
              </button>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => router.push(showDrafts ? "/cases" : "/cases?view=drafts")}
          className={`pb-0.5 text-sm font-normal text-tarot-green hover:underline ${showDrafts ? "underline" : ""}`}
        >
          草稿箱
        </button>
      </div>
      {!showDrafts && (
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 rounded-2xl border border-[#dfebe5] bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-tarot-green focus:ring-2 focus:ring-emerald-100"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="按分类或牌名搜索，如：情感、愚者、骑士…"
          />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">加载中…</p>
      ) : displayItems.length === 0 ? (
        <p className="text-sm text-slate-500">
          {showDrafts ? "草稿箱为空。" : isSearchMode ? "未找到匹配的案例。" : `还没有${tab === "tarot" ? "塔罗" : "雷诺曼"}案例。`}
        </p>
      ) : (
        <ul className="space-y-2">
          {displayItems.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-[#d8ebe3] bg-white p-4 shadow-sm"
            >
              <Link
                href={
                  c.type === "lenormand"
                    ? `/lenormand/${c.id}/analysis${showDrafts ? "?from=draft" : "?from=library"}`
                    : `/tarot/${c.id}/result${showDrafts ? "?from=draft" : "?from=library"}`
                }
                className="min-w-0 flex-1 transition hover:text-tarot-green"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{c.title}</span>
                  {(isSearchMode || showDrafts) && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      {c.type === "tarot" ? "塔罗" : "雷诺曼"}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  {new Date(c.createdAt).toLocaleString()}
                </div>
              </Link>
              <button
                type="button"
                className="shrink-0 text-sm text-red-500 hover:text-red-600"
                onClick={async () => {
                  if (confirm("确定删除该案例？")) {
                    await deleteCase(c.id);
                    await refresh();
                  }
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
