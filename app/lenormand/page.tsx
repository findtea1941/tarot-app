"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { getCaseById } from "@/lib/repo/caseRepo";
import {
  createLenormandDraft,
  updateLenormandDraft,
} from "@/lib/repo/lenormandRepo";
import { clearLenormandDraftStorage } from "@/lib/lenormandStorage";
import type { LenormandSpreadType } from "@/lib/lenormandTypes";

const SPREAD_OPTIONS: {
  type: LenormandSpreadType;
  label: string;
  placeholder?: boolean;
}[] = [
  { type: "linear-3", label: "线性三张", placeholder: false },
  { type: "linear-5", label: "线性五张", placeholder: false },
  { type: "nine-grid", label: "九宫格", placeholder: false },
];

function LenormandPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseIdFromUrl = searchParams?.get("caseId") ?? null;
  const [spreadType, setSpreadType] = useState<LenormandSpreadType | null>(null);
  const [isChoice, setIsChoice] = useState(false);
  const [loading, setLoading] = useState(false);

  // 从 URL 返回时，加载已有案例的牌阵设置
  const [loadedCase, setLoadedCase] = useState<{
    spreadType: LenormandSpreadType;
    isChoice: boolean;
  } | null>(null);
  const loadCase = useCallback(async (id: string) => {
    const c = await getCaseById(id);
    if (c && c.type === "lenormand") {
      const data = {
        spreadType: (c.lenormandSpreadType ?? "nine-grid") as LenormandSpreadType,
        isChoice: c.lenormandIsChoice ?? false,
      };
      setLoadedCase(data);
      setSpreadType(data.spreadType);
      setIsChoice(data.isChoice);
    }
  }, []);

  useEffect(() => {
    if (caseIdFromUrl) {
      loadCase(caseIdFromUrl);
    } else {
      setSpreadType(null);
      setIsChoice(false);
    }
  }, [caseIdFromUrl, loadCase]);

  async function handleNext() {
    const type = spreadType ?? "nine-grid";
    setLoading(true);
    try {
      if (caseIdFromUrl) {
        const spreadChanged = type !== loadedCase?.spreadType;
        const choiceChanged = isChoice !== loadedCase?.isChoice;
        if (spreadChanged || choiceChanged) {
          clearLenormandDraftStorage(caseIdFromUrl);
        }
        await updateLenormandDraft(caseIdFromUrl, {
          lenormandSpreadType: type,
          lenormandIsChoice: isChoice,
        });
        router.push(`/lenormand/${caseIdFromUrl}/entry`);
      } else {
        const draft = await createLenormandDraft({
          spreadType: type,
          isChoice,
        });
        router.push(`/lenormand/${draft.id}/entry`);
      }
    } catch {
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-96px)]">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#deeeec] shadow-inner">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[#059669] p-1">
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-4 w-4 text-[#d4f0e3]"
                aria-hidden
              >
                <rect x="10.5" y="0" width="3" height="24" />
                <rect x="0" y="10.5" width="24" height="3" />
              </svg>
            </div>
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900">
            新建雷诺曼案例 · 牌阵选择
          </h1>
        </div>

        <div className="mx-auto max-w-3xl overflow-hidden rounded-[30px] border border-[#dceee6] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.07)]">
          <div className="flex items-center justify-between border-b border-[#ebf4f0] px-7 py-5">
            <h2 className="text-base font-semibold text-slate-900">选择牌阵</h2>
            <p className="text-xs font-medium tracking-[0.2em] text-slate-400">
              STEP 1 OF 2
            </p>
          </div>
          <div className="space-y-6 px-7 py-7">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                牌阵类型
              </label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {SPREAD_OPTIONS.map((opt) => (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setSpreadType(opt.type)}
                    disabled={opt.placeholder}
                    className={`flex w-full flex-col items-center justify-center rounded-2xl border-2 px-6 py-8 transition ${
                      opt.placeholder
                        ? "cursor-not-allowed border-[#e8ecea] bg-slate-50 text-slate-400"
                        : spreadType === opt.type
                          ? "border-tarot-green bg-[#ecf8f2] text-tarot-green shadow-[0_8px_18px_rgba(5,150,105,0.12)]"
                          : "border-[#e2ebe7] bg-white text-slate-600 hover:border-[#bedfce] hover:text-slate-800"
                    }`}
                  >
                    <span className="text-base font-medium">{opt.label}</span>
                    {opt.placeholder && (
                      <span className="mt-1 text-xs text-slate-400">
                        敬请期待
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-[#e1ece8] bg-[#fbfdfc] px-5 py-4">
              <input
                id="lenormand-choice"
                type="checkbox"
                checked={isChoice}
                onChange={(e) => setIsChoice(e.target.checked)}
                className="h-4 w-4 rounded border-[#c8e9d8] text-tarot-green focus:ring-tarot-green"
              />
              <label
                htmlFor="lenormand-choice"
                className="text-sm font-medium text-slate-700"
              >
                二择一模式（选项 A / B 各输入对应牌数）
              </label>
            </div>
          </div>
          <div className="border-t border-[#ebf4f0] bg-[#fbfdfc] px-7 py-7">
            <button
              className="mx-auto block rounded-full bg-tarot-green px-10 py-3 text-sm font-medium text-white shadow-[0_14px_28px_rgba(5,150,105,0.22)] transition hover:bg-emerald-700 disabled:opacity-60"
              disabled={loading || (!spreadType && !caseIdFromUrl)}
              title={caseIdFromUrl ? "返回信息录入" : undefined}
              onClick={handleNext}
            >
              {loading ? "处理中…" : "下一步：信息录入 →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LenormandPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">加载中…</div>}>
      <LenormandPageContent />
    </Suspense>
  );
}
