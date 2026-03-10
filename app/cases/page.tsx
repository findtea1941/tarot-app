"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Case } from "@/lib/db";
import { CaseExportImportModal } from "@/components/CaseExportImportModal";

type CaseTab = "tarot" | "lenormand";

const LOAD_TIMEOUT_MS = 5000;

function getShowDrafts(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("view") === "drafts";
}

function getInitialTab(): CaseTab {
  if (typeof window === "undefined") return "tarot";
  return new URLSearchParams(window.location.search).get("tab") === "lenormand" ? "lenormand" : "tarot";
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("加载超时，请重试")), ms);
    }),
  ]);
}

function CasesPageContent() {
  const router = useRouter();
  const requestIdRef = useRef(0);
  const [showDrafts, setShowDrafts] = useState(false);
  const [tab, setTab] = useState<CaseTab>("tarot");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [items, setItems] = useState<Case[]>([]);
  const [drafts, setDrafts] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [exportImportOpen, setExportImportOpen] = useState<"export" | "import" | null>(null);

  useEffect(() => {
    setTab(getInitialTab());
    setShowDrafts(getShowDrafts());
    const syncFromUrl = () => {
      setTab(getInitialTab());
      setShowDrafts(getShowDrafts());
    };
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  useEffect(() => {
    if (showDrafts) {
      setDebouncedQuery("");
      return;
    }
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 200);
    return () => clearTimeout(t);
  }, [searchQuery, showDrafts]);

  useEffect(() => {
    if (typeof indexedDB === "undefined") {
      setLoadError("当前环境不支持本地存储，请使用现代浏览器访问");
      setLoading(false);
      return;
    }
    const requestId = ++requestIdRef.current;
    const draftView = showDrafts;
    const activeQuery = draftView ? "" : debouncedQuery;

    setLoading(true);
    setLoadError(null);

    void (async () => {
      try {
        const { listCasesByType, listDrafts, searchCases } = await import("@/lib/repo/caseRepo");
        const result = draftView
          ? await withTimeout(listDrafts(), LOAD_TIMEOUT_MS)
          : activeQuery
            ? await withTimeout(searchCases(activeQuery), LOAD_TIMEOUT_MS)
            : await withTimeout(listCasesByType(tab), LOAD_TIMEOUT_MS);

        if (requestId !== requestIdRef.current) return;
        if (draftView) {
          setDrafts(result);
        } else {
          setItems(result);
        }
      } catch (e) {
        if (requestId !== requestIdRef.current) return;
        setLoadError(e instanceof Error ? e.message : "加载失败，请重试");
        setItems([]);
        setDrafts([]);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    })();
  }, [showDrafts, tab, debouncedQuery, reloadKey]);

  const isSearchMode = !!searchQuery.trim();
  const displayItems = showDrafts ? drafts : items;

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
                  if (showDrafts) {
                    setShowDrafts(false);
                    setLoadError(null);
                    router.push("/cases");
                  } else {
                    router.replace("/cases");
                  }
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
                  if (showDrafts) {
                    setShowDrafts(false);
                    setLoadError(null);
                    router.push("/cases?tab=lenormand");
                  } else {
                    router.replace("/cases?tab=lenormand");
                  }
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
        <div className="flex items-center gap-4 pb-0.5">
          <Link
            href={tab === "tarot" ? "/tarot?new=1" : "/lenormand"}
            className="text-sm font-normal text-slate-600 hover:text-slate-800 hover:underline"
          >
            新建案例
          </Link>
          <button
            type="button"
            onClick={() => {
              const next = !showDrafts;
              setShowDrafts(next);
              setLoadError(null);
              router.push(next ? "/cases?view=drafts" : "/cases");
            }}
            className={`text-sm font-normal text-tarot-green hover:underline ${showDrafts ? "underline" : ""}`}
          >
            草稿箱
          </button>
        </div>
      </div>
      <CaseExportImportModal
        open={exportImportOpen !== null}
        initialMode={exportImportOpen}
        onClose={() => setExportImportOpen(null)}
        onImported={() => setReloadKey((n) => n + 1)}
      />
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

      {loadError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p>{loadError}</p>
          <button
            type="button"
            onClick={() => setReloadKey((n) => n + 1)}
            className="mt-2 rounded-xl bg-tarot-green px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            重试
          </button>
        </div>
      ) : loading ? (
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
                    const { deleteCase } = await import("@/lib/repo/caseRepo");
                    await deleteCase(c.id);
                    setReloadKey((n) => n + 1);
                  }
                }}
              >
                删除
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-end items-center gap-1 pt-2">
        <button
          type="button"
          onClick={() => setExportImportOpen("import")}
          className="text-sm font-normal text-slate-600 hover:text-slate-800 hover:underline"
        >
          案例导入
        </button>
        <span className="text-sm font-normal text-slate-600">/</span>
        <button
          type="button"
          onClick={() => setExportImportOpen("export")}
          className="text-sm font-normal text-slate-600 hover:text-slate-800 hover:underline"
        >
          导出
        </button>
      </div>
    </div>
  );
}

export default function CasesPage() {
  return <CasesPageContent />;
}
