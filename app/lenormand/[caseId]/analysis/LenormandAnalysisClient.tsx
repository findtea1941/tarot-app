"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getCaseById, updateCaseReviewFeedback } from "@/lib/repo/caseRepo";
import {
  updateLenormandAnalysis,
  saveLenormandCase,
  updateLenormandDraft,
} from "@/lib/repo/lenormandRepo";
import {
  clearLenormandDraftStorage,
  loadLenormandDraftFromStorage,
} from "@/lib/lenormandStorage";
import { getLenormandCardDisplay, parseLenormandCards } from "@/lib/lenormandDeck";
import {
  NINE_GRID_ENTRIES,
  LINEAR_3_ENTRIES,
  LINEAR_5_ENTRIES,
} from "@/lib/lenormandAnalysis";
import type { LenormandSpreadType } from "@/lib/lenormandTypes";

type AnalysisEntryConfig = {
  id: string;
  label: string;
  getLabel: (cards: string[]) => string;
};

function CardBox({
  name,
  index,
  spreadType,
}: {
  name: string;
  index?: number;
  spreadType?: LenormandSpreadType;
}) {
  const [numPart, namePart] = getLenormandCardDisplay(name).split(" ", 2);
  const isLinear = spreadType === "linear-3" || spreadType === "linear-5";
  const useWhiteBg =
    spreadType === "nine-grid"
      ? index !== 4
      : isLinear && spreadType === "linear-3"
        ? index === 0 || index === 2
        : isLinear && spreadType === "linear-5"
          ? index === 1 || index === 3
          : false;
  const bgClass = useWhiteBg ? "bg-white" : "bg-tarot-panel";
  return (
    <div
      className={`flex h-[5.5rem] w-[4.5rem] flex-shrink-0 flex-col items-center overflow-hidden rounded-xl border border-tarot-green-light ${bgClass} px-1 pt-1 pb-2 shadow-sm`}
    >
      <span className="mt-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-tarot-green text-[10px] font-medium text-white">
        {numPart || "?"}
      </span>
      <div className="-mt-2 flex flex-1 min-h-0 items-center justify-center">
        <span className="max-w-full truncate text-center text-xs font-semibold text-slate-800">
          {namePart || name}
        </span>
      </div>
    </div>
  );
}

function AnalysisSection({
  title,
  cards,
  config,
  prefix,
  analysisEntries,
  updateEntry,
}: {
  title: string;
  cards: string[];
  config: AnalysisEntryConfig[];
  prefix: string;
  analysisEntries: Record<string, string>;
  updateEntry: (id: string, val: string) => void;
}) {
  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      {config.map((entry) => {
        const cardLabel = entry.getLabel(cards);
        const displayLabel =
          entry.id === "overall"
            ? "整体分析"
            : entry.label
              ? `${entry.label}：${cardLabel}`
              : cardLabel;
        const entryId = `${prefix}_${entry.id}`;
        return (
          <div key={entryId} className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700 whitespace-nowrap overflow-x-auto">
              {displayLabel}
            </label>
            <textarea
              className="min-h-20 w-full rounded-xl border border-[#dfebe5] bg-[#f8fbfa] px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-tarot-green focus:ring-2 focus:ring-emerald-100"
              value={analysisEntries[entryId] ?? ""}
              onChange={(e) => updateEntry(entryId, e.target.value)}
              placeholder="填写分析内容…"
            />
          </div>
        );
      })}
    </div>
  );
}

export function LenormandAnalysisClient() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseIdParam = params?.caseId;
  const caseId = Array.isArray(caseIdParam) ? caseIdParam[0] : caseIdParam ?? "";
  const getQueryParam = useCallback(
    (key: string) => searchParams?.get(key) ?? null,
    [searchParams]
  );

  const [question, setQuestion] = useState("");
  const [background, setBackground] = useState("");
  const [drawDate, setDrawDate] = useState("");
  const [cards, setCards] = useState<string[]>([]);
  const [cardsA, setCardsA] = useState<string[]>([]);
  const [cardsB, setCardsB] = useState<string[]>([]);
  const [optionALabel, setOptionALabel] = useState("");
  const [optionBLabel, setOptionBLabel] = useState("");
  const [isChoice, setIsChoice] = useState(false);
  const [spreadType, setSpreadType] = useState<LenormandSpreadType>("nine-grid");
  const [categories, setCategories] = useState<string[]>([]);
  const [analysisEntries, setAnalysisEntries] = useState<Record<string, string>>(
    {}
  );
  const [loading, setLoading] = useState(false);
  const [loadingCase, setLoadingCase] = useState(true);
  const [toast, setToast] = useState("");
  const [reviewFeedback, setReviewFeedback] = useState("");
  const reviewFeedbackRef = useRef(reviewFeedback);
  reviewFeedbackRef.current = reviewFeedback;
  const fromLibrary = getQueryParam("from") === "library";
  const fromDraft = getQueryParam("from") === "draft";

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadCase = useCallback(async (id: string) => {
    setLoadingCase(true);
    try {
      const spreadFromUrl = getQueryParam("spread") as LenormandSpreadType | null;
      const choiceFromUrl = getQueryParam("choice") === "1";
      const qFromUrl = getQueryParam("q");
      const bgFromUrl = getQueryParam("bg");

      // 1. 二择一：从 URL 读取两组牌
      if (choiceFromUrl) {
        const cardsAStr = getQueryParam("cardsA");
        const cardsBStr = getQueryParam("cardsB");
        if (cardsAStr && cardsBStr) {
          try {
            const parsedA = JSON.parse(cardsAStr) as string[];
            const parsedB = JSON.parse(cardsBStr) as string[];
            const needCount =
              (spreadFromUrl ?? "nine-grid") === "linear-3"
                ? 3
                : (spreadFromUrl ?? "nine-grid") === "linear-5"
                  ? 5
                  : 9;
            if (
              Array.isArray(parsedA) &&
              Array.isArray(parsedB) &&
              parsedA.length === needCount &&
              parsedB.length === needCount
            ) {
              setCardsA(parsedA);
              setCardsB(parsedB);
              setOptionALabel(getQueryParam("labelA") ?? "");
              setOptionBLabel(getQueryParam("labelB") ?? "");
              setIsChoice(true);
              setSpreadType(spreadFromUrl ?? "nine-grid");
              setQuestion(qFromUrl ?? "");
              setBackground(bgFromUrl ?? "");
              const c = await getCaseById(id);
              if (c && c.type === "lenormand") {
                if (!qFromUrl) setQuestion(c.question ?? "");
                if (!bgFromUrl) setBackground(c.background ?? "");
                setDrawDate(c.lenormandDrawDate ?? "");
                setCategories(c.lenormandCategories ?? (c.category ? [c.category] : []));
                setAnalysisEntries(c.lenormandAnalysis ?? {});
                setReviewFeedback(c.reviewFeedback ?? "");
              }
              setLoadingCase(false);
              return;
            }
          } catch {
            // 解析失败则继续从 DB 加载
          }
        }
      }

      // 2. 单牌阵：从 URL 读取
      const cardsFromUrl = getQueryParam("cards");
      if (cardsFromUrl && !choiceFromUrl) {
        try {
          const parsed = JSON.parse(cardsFromUrl) as string[];
          const inferredSpread: LenormandSpreadType =
            parsed.length === 3 ? "linear-3" : parsed.length === 5 ? "linear-5" : "nine-grid";
          if (Array.isArray(parsed) && (parsed.length === 3 || parsed.length === 5 || parsed.length === 9)) {
            setCards(parsed);
            setSpreadType(spreadFromUrl ?? inferredSpread);
            setIsChoice(false);
            setQuestion(qFromUrl ?? "");
            setBackground(bgFromUrl ?? "");
            const c = await getCaseById(id);
            if (c && c.type === "lenormand") {
              if (!qFromUrl) setQuestion(c.question ?? "");
              if (!bgFromUrl) setBackground(c.background ?? "");
              setDrawDate(c.lenormandDrawDate ?? "");
              setCategories(c.lenormandCategories ?? (c.category ? [c.category] : []));
              setAnalysisEntries(c.lenormandAnalysis ?? {});
              setReviewFeedback(c.reviewFeedback ?? "");
              updateLenormandDraft(id, { lenormandCards: parsed }).catch(() => {});
            }
            setLoadingCase(false);
            return;
          }
        } catch {
          // 解析失败则继续从 DB 加载
        }
      }

      // 3. 从 DB 加载
      const c = await getCaseById(id);
      if (c && c.type === "lenormand") {
        setSpreadType((c.lenormandSpreadType ?? "nine-grid") as LenormandSpreadType);
        setIsChoice(c.lenormandIsChoice ?? false);
        setQuestion(c.question ?? "");
        setBackground(c.background ?? "");
        setDrawDate(c.lenormandDrawDate ?? "");
        setCategories(c.lenormandCategories ?? (c.category ? [c.category] : []));
        setOptionALabel(c.lenormandOptionALabel ?? "");
        setOptionBLabel(c.lenormandOptionBLabel ?? "");
        setReviewFeedback(c.reviewFeedback ?? "");
        const needCount =
          (c.lenormandSpreadType ?? "nine-grid") === "linear-3"
            ? 3
            : (c.lenormandSpreadType ?? "nine-grid") === "linear-5"
              ? 5
              : 9;
        if (c.lenormandIsChoice) {
          const a = c.lenormandOptionACards ?? [];
          const b = c.lenormandOptionBCards ?? [];
          if (a.length === needCount && b.length === needCount) {
            setCardsA(a);
            setCardsB(b);
          }
        } else {
          let cardsToUse = c.lenormandCards ?? [];
          if (cardsToUse.length !== needCount) {
            cardsToUse = (c.lenormandOptionACards ?? []).length === needCount
              ? (c.lenormandOptionACards ?? [])
              : cardsToUse;
          }
          if (cardsToUse.length !== needCount) {
            const stored = loadLenormandDraftFromStorage(id);
            if (stored) {
              const fromMain = parseLenormandCards(stored.cardsInput).valid;
              const fromA = parseLenormandCards(stored.optionAInput).valid;
              if (fromMain.length === needCount) {
                cardsToUse = fromMain;
                updateLenormandDraft(id, { lenormandCards: fromMain }).catch(() => {});
              } else if (fromA.length === needCount) {
                cardsToUse = fromA;
                updateLenormandDraft(id, {
                  lenormandCards: fromA,
                  lenormandOptionACards: fromA,
                }).catch(() => {});
              }
            }
          }
          setCards(cardsToUse);
        }
        setAnalysisEntries(c.lenormandAnalysis ?? {});
      }
    } finally {
      setLoadingCase(false);
    }
  }, [searchParams]);

  useEffect(() => {
    if (caseId) loadCase(caseId);
  }, [caseId, loadCase]);

  const updateEntry = (entryId: string, value: string) => {
    setAnalysisEntries((prev) => ({ ...prev, [entryId]: value }));
  };

  /** 分析内容自动保存到草稿 */
  const analysisEntriesRef = useRef(analysisEntries);
  analysisEntriesRef.current = analysisEntries;
  useEffect(() => {
    if (!caseId || loadingCase) return;
    const t = setTimeout(() => {
      updateLenormandAnalysis(caseId, analysisEntriesRef.current).catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [caseId, analysisEntries, loadingCase]);

  /** 保存：停留本页，与塔罗对齐 */
  const handleSave = async () => {
    setLoading(true);
    try {
      await updateLenormandAnalysis(caseId, analysisEntries);
      if (fromLibrary) await updateCaseReviewFeedback(caseId, reviewFeedback);
      await saveLenormandCase(caseId);
      clearLenormandDraftStorage(caseId);
      setToast("保存成功");
    } catch {
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  /** 保存并返回案例库（雷诺曼 tab），与塔罗对齐 */
  const handleSaveAndBack = async () => {
    setLoading(true);
    try {
      await updateLenormandAnalysis(caseId, analysisEntries);
      if (fromLibrary) await updateCaseReviewFeedback(caseId, reviewFeedback);
      await saveLenormandCase(caseId);
      clearLenormandDraftStorage(caseId);
      router.push("/cases?tab=lenormand");
    } catch {
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleReturnEdit = async () => {
    setLoading(true);
    try {
      await updateLenormandAnalysis(caseId, analysisEntries);
      if (fromLibrary) await updateCaseReviewFeedback(caseId, reviewFeedback);
      if (fromDraft) {
        router.push("/cases?view=drafts");
      } else {
        router.push(`/lenormand/${caseId}/entry`);
      }
    } catch {
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  if (loadingCase) {
    return (
      <div className="flex min-h-[calc(100vh-96px)] items-center justify-center bg-white">
        <p className="text-sm text-slate-500">加载中…</p>
      </div>
    );
  }

  const expectedCount =
    spreadType === "linear-3" ? 3 : spreadType === "linear-5" ? 5 : 9;
  const analysisEntriesConfig =
    spreadType === "linear-3"
      ? LINEAR_3_ENTRIES
      : spreadType === "linear-5"
        ? LINEAR_5_ENTRIES
        : NINE_GRID_ENTRIES;
  const isLinear = spreadType === "linear-3" || spreadType === "linear-5";

  const choiceValid =
    isChoice && cardsA.length === expectedCount && cardsB.length === expectedCount;
  const singleValid = !isChoice && cards.length === expectedCount;

  if (!choiceValid && !singleValid) {
    return (
      <div className="min-h-[calc(100vh-96px)] bg-white px-4 py-16">
        <p className="text-center text-slate-600">
          牌阵数据不完整，请从步骤2重新录入
          {isChoice ? `（选项A、B各需${expectedCount}张牌）` : `（需要${expectedCount}张牌）`}
        </p>
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => router.push(`/lenormand/${caseId}/entry`)}
            className="rounded-full border border-[#cce7d9] bg-[#ecf8f2] px-6 py-2 text-sm font-medium text-tarot-green hover:bg-[#e4f5ed]"
          >
            返回步骤2
          </button>
        </div>
      </div>
    );
  }

  const spreadLabel =
    spreadType === "linear-3"
      ? "线性三张"
      : spreadType === "linear-5"
        ? "线性五张"
        : "九宫格";
  const displaySpreadLabel = isChoice ? `二择一-${spreadLabel}` : spreadLabel;
  const leftColumnWidthPx = spreadType === "linear-5" ? 460 : 340;
  const layoutGridClass =
    spreadType === "linear-5"
      ? "xl:grid-cols-[460px_1px_minmax(0,1fr)]"
      : "xl:grid-cols-[340px_1px_minmax(0,1fr)]";
  const footerGridClass =
    spreadType === "linear-5" ? "xl:grid-cols-[460px_1fr]" : "xl:grid-cols-[340px_1fr]";
  const spreadBoardWidthClass =
    spreadType === "linear-5" ? "w-[25.5rem]" : "w-[15rem]";

  const spreadBoardContent = isChoice ? (
    <div className="flex w-full flex-col items-start space-y-6">
      <div className="flex w-full flex-col items-start">
        <p className="mb-2 text-xs font-medium text-slate-500">
          选项 A：{optionALabel || "—"}
        </p>
        <div
          className={
            isLinear
              ? `flex justify-start gap-2 ${spreadType === "linear-5" ? "gap-3" : ""}`
              : "grid w-fit grid-cols-3 gap-x-3 gap-y-1.5 justify-items-center"
          }
        >
          {cardsA.map((name, i) => (
            <CardBox key={i} name={name} index={i} spreadType={spreadType} />
          ))}
        </div>
      </div>
      <div className="flex w-full flex-col items-start">
        <p className="mb-2 text-xs font-medium text-slate-500">
          选项 B：{optionBLabel || "—"}
        </p>
        <div
          className={
            isLinear
              ? `flex justify-start gap-2 ${spreadType === "linear-5" ? "gap-3" : ""}`
              : "grid w-fit grid-cols-3 gap-x-3 gap-y-1.5 justify-items-center"
          }
        >
          {cardsB.map((name, i) => (
            <CardBox key={i} name={name} index={i} spreadType={spreadType} />
          ))}
        </div>
      </div>
    </div>
  ) : (
    <div
      className={
        isLinear
          ? "flex justify-start gap-3"
          : "grid w-fit grid-cols-3 gap-x-3 gap-y-1.5 justify-items-center"
      }
    >
      {cards.map((name, i) => (
        <CardBox key={i} name={name} index={i} spreadType={spreadType} />
      ))}
    </div>
  );

  const analysisContent = isChoice ? (
    <div className="space-y-6">
      <AnalysisSection
        title={`选项 A：${optionALabel || "—"}`}
        cards={cardsA}
        config={analysisEntriesConfig}
        prefix="optionA"
        analysisEntries={analysisEntries}
        updateEntry={updateEntry}
      />
      <AnalysisSection
        title={`选项 B：${optionBLabel || "—"}`}
        cards={cardsB}
        config={analysisEntriesConfig}
        prefix="optionB"
        analysisEntries={analysisEntries}
        updateEntry={updateEntry}
      />
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700">
          综合分析
        </label>
        <textarea
          className="min-h-24 w-full rounded-xl border border-[#dfebe5] bg-[#f8fbfa] px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-tarot-green focus:ring-2 focus:ring-emerald-100"
          value={analysisEntries["choice_overall"] ?? ""}
          onChange={(e) =>
            updateEntry("choice_overall", e.target.value)
          }
          placeholder="填写综合分析…"
        />
      </div>
    </div>
  ) : (
    <div className="space-y-5">
      {analysisEntriesConfig.map((entry) => {
        const cardLabel = entry.getLabel(cards);
        const displayLabel =
          entry.id === "overall"
            ? "整体分析"
            : entry.label
              ? `${entry.label}：${cardLabel}`
              : cardLabel;
        return (
          <div key={entry.id} className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700 whitespace-nowrap overflow-x-auto">
              {displayLabel}
            </label>
            <textarea
              className="min-h-20 w-full rounded-xl border border-[#dfebe5] bg-[#f8fbfa] px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-tarot-green focus:ring-2 focus:ring-emerald-100"
              value={analysisEntries[entry.id] ?? ""}
              onChange={(e) =>
                updateEntry(entry.id, e.target.value)
              }
              placeholder="填写分析内容…"
            />
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-96px)] bg-white pb-24">
      <div className={`mx-auto grid w-full max-w-[1400px] grid-cols-1 px-4 ${layoutGridClass}`}>
        <div className="flex min-w-0 shrink-0 flex-col pr-4" style={{ width: leftColumnWidthPx }}>
          <section className="shrink-0 border-b border-slate-50 bg-white px-0 pt-0 pb-4">
            <div className="space-y-3 text-left">
              <div>
                <p className="text-xs font-semibold text-tarot-green">问题</p>
                <p className="mt-1 text-sm text-slate-800">{question || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-tarot-green">问题背景</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{background || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-tarot-green">时间</p>
                <p className="mt-1 text-sm text-slate-800">
                  {drawDate
                    ? `${drawDate.slice(0, 4)}年${drawDate.slice(5, 7)}月${drawDate.slice(8, 10)}日`
                    : "—"}
                </p>
              </div>
              {categories.length > 0 && (
                <div className="flex flex-col items-start">
                  <p className="text-xs font-semibold text-tarot-green">分类</p>
                  <div className="mt-1 flex flex-wrap justify-start gap-2">
                    {categories.map((cat) => {
                      const isQuestionType =
                        cat === "开放式问题" || cat === "封闭式问题";
                      return (
                        <span
                          key={cat}
                          className={
                            isQuestionType
                              ? "inline-flex items-center rounded-full border border-tarot-green bg-white px-3 py-1.5 text-xs font-medium text-tarot-green"
                              : "inline-flex items-center rounded-full bg-[#d4f0e3] px-3 py-1.5 text-xs font-medium text-[#047857]"
                          }
                        >
                          {cat}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="flex flex-1 flex-col items-center border-t border-slate-50 bg-white px-0 py-4">
            <div className="flex w-full flex-col items-center">
              <div className={`flex min-h-10 ${spreadBoardWidthClass} flex-col justify-center`}>
                <p className="w-full text-center text-xs font-medium text-slate-500">牌型：{displaySpreadLabel}</p>
              </div>
              <div className={`mt-4 ${spreadBoardWidthClass}`}>{spreadBoardContent}</div>
            </div>
          </section>
        </div>

        <div className="hidden w-px shrink-0 self-stretch bg-slate-50 xl:block" aria-hidden />

        <div className="min-w-0 overflow-hidden pl-0 xl:pl-8">
          <section className="max-h-[calc(100vh-160px)] overflow-y-auto pt-4 pb-4 pr-1 xl:pr-4">
            {analysisContent}
            {fromLibrary && (
              <div className="mt-6 space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  复盘与反馈
                </label>
                <textarea
                  className="min-h-24 w-full rounded-xl border border-[#dfebe5] bg-[#f8fbfa] px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-tarot-green focus:ring-2 focus:ring-emerald-100"
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  onBlur={async () => {
                    if (caseId) await updateCaseReviewFeedback(caseId, reviewFeedbackRef.current);
                  }}
                  placeholder="填写复盘与反馈…"
                />
              </div>
            )}
          </section>
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-50 bg-white py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
        <div
          className={`mx-auto grid w-full max-w-[1400px] grid-cols-1 items-center gap-4 px-4 sm:grid-cols-2 ${footerGridClass}`}
        >
          <div className="flex items-center justify-start">
            <button
              onClick={handleReturnEdit}
              disabled={loading}
              className="text-sm text-slate-500 transition hover:text-tarot-green disabled:opacity-60"
            >
              {fromDraft ? "← 返回草稿箱" : "← 返回修改案例"}
            </button>
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 sm:pt-0">
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="rounded-xl border border-[#dfe7e3] bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              {loading ? "处理中…" : "保存"}
            </button>
            <button
              type="button"
              onClick={handleSaveAndBack}
              disabled={loading}
              className="rounded-xl bg-tarot-green px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
            >
              保存并返回案例库
            </button>
          </div>
        </div>
      </footer>

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-tarot-green-light bg-white px-4 py-2 text-sm text-slate-800 shadow-lg"
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
