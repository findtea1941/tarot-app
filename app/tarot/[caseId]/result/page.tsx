"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Case } from "@/lib/db";
import { getCaseById, saveCaseStep5, updateCaseStep5Partial, updateCaseReviewFeedback, updateCaseUserInterpretation } from "@/lib/repo/caseRepo";
import { getLayout, getLayoutWithTimeAxisVariant } from "@/layouts";
import { getDeck } from "@/lib/deck";
import type { SpreadSlotState } from "@/lib/spreadTypes";
import { buildAnalysisTable } from "@/lib/buildAnalysisTable";
import {
  buildColumns,
  getMatrixContext,
  getSignifierTitles,
  DIMENSION_ROWS,
  getCellValue,
  getColumnCardText,
} from "@/lib/analysisMatrix";
import {
  buildGroupSummary,
  getResolvedCardsByGroup,
} from "@/lib/groupSummary";
import { PlanetOptions } from "@/lib/planetOptions";
import { getCategoryPillStyle, SPREAD_TYPE_PILL_CLASS } from "@/lib/categoryTagStyles";
import { BodyMindSpiritReviewBoard } from "@/components/BodyMindSpiritReviewBoard";
import { ChooseOneReviewBoard } from "@/components/ChooseOneReviewBoard";
import { FourElementsReviewBoard } from "@/components/FourElementsReviewBoard";
import { HolyTriangleReviewBoard } from "@/components/HolyTriangleReviewBoard";
import { HexagramReviewBoard } from "@/components/HexagramReviewBoard";
import { NoSpreadReviewBoard } from "@/components/NoSpreadReviewBoard";
import { TimeFlowReviewBoard } from "@/components/TimeFlowReviewBoard";

/**
 * Step5 分析页骨架：左右分栏，左侧案例信息+牌阵可视化，右侧统筹占位+用户解读
 */
export default function ResultPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseId = params.caseId as string;
  const fromLibrary = searchParams.get("from") === "library";
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [userInterpretation, setUserInterpretation] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  /** 指示牌列标题，与列一一对应；可点击表头编辑 */
  const [signifierTitleInputs, setSignifierTitleInputs] = useState<string[]>([]);
  const [editingSignifierTitleIndex, setEditingSignifierTitleIndex] = useState<number | null>(null);
  const [manualNumberNote, setManualNumberNote] = useState("");
  const [reviewFeedback, setReviewFeedback] = useState("");

  useEffect(() => {
    if (!caseId) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    const loadCase = async () => {
      try {
        for (let attempt = 0; attempt < 6; attempt += 1) {
          const c = await getCaseById(caseId);
          if (c) {
            if (cancelled) return;
            setCaseData(c);
            const notes =
              c.userInterpretation ??
              (c.analysis && typeof c.analysis === "object" && "userNotes" in c.analysis
                ? (c.analysis as { userNotes: string }).userNotes
                : "");
            setUserInterpretation(notes ?? "");
            setManualNumberNote(
              (c.analysis && typeof c.analysis === "object" && "manualNumberNote" in c.analysis
                ? (c.analysis as { manualNumberNote?: string }).manualNumberNote
                : "") ?? ""
            );
            setReviewFeedback(c.reviewFeedback ?? "");
            setNotFound(false);
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 120));
        }
        if (!cancelled) setNotFound(true);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadCase();
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const layout = useMemo(
    () =>
      caseData?.spreadType
        ? getLayoutWithTimeAxisVariant(
            getLayout(caseData.spreadType),
            caseData.timeAxisVariant
          )
        : null,
    [caseData?.spreadType, caseData?.timeAxisVariant]
  );

  /** 用 case.cards + 牌库 构建 slotStates（含牌名、逆位），供 SpreadBoard 展示 */
  const slotStates = useMemo(() => {
    if (!caseData?.cards?.length || !layout) return {};
    const deck = getDeck();
    const byId = new Map(deck.cards.map((c) => [c.id, c]));
    const map: Record<string, SpreadSlotState> = {};
    for (const slot of layout.slots) {
      const cardState = caseData.cards.find((c) => c.slotId === slot.id);
      if (!cardState?.cardId) continue;
      const card = byId.get(cardState.cardId);
      map[slot.id] = {
        slotId: slot.id,
        cardId: cardState.cardId,
        cardName: cardState.cardName ?? card?.name ?? "",
        reversed: cardState.reversed,
        interpretation: cardState.interpretation,
      };
    }
    return map;
  }, [caseData?.cards, layout]);

  /** 进入 Step5 即生成统筹分析表格数据（保留 numberSum 等） */
  const analysisTable = useMemo(() => {
    if (!caseData || !layout) return null;
    const deck = getDeck();
    return buildAnalysisTable(caseData, deck, layout);
  }, [caseData, layout]);

  /** 矩阵表：列定义 + 上下文（进入即生成） */
  const matrixColumns = useMemo(() => {
    if (!caseData || !layout) return [];
    return buildColumns(caseData, layout, getDeck());
  }, [caseData, layout]);
  const matrixContext = useMemo(() => {
    if (!caseData || !layout) return null;
    return getMatrixContext(caseData, layout, getDeck());
  }, [caseData, layout]);

  /** 指示牌列标题与 caseData / 列数同步（不覆盖正在编辑的那一列） */
  const signifierColumnCount = useMemo(
    () => matrixColumns.filter((c) => c.kind === "signifier").length,
    [matrixColumns]
  );
  useEffect(() => {
    if (!caseData || signifierColumnCount === 0) {
      setSignifierTitleInputs([]);
      return;
    }
    const titles = getSignifierTitles(caseData, signifierColumnCount);
    setSignifierTitleInputs((prev) => {
      if (prev.length !== titles.length) return titles;
      if (editingSignifierTitleIndex == null) return titles;
      return prev.map((p, i) => (i === editingSignifierTitleIndex ? p : titles[i]));
    });
  }, [caseData, signifierColumnCount, editingSignifierTitleIndex]);

  /** 当前牌阵的统筹结果，用于统筹列与数字加和区 */
  const groupSummaries = useMemo(() => {
    if (!matrixContext || !layout) return null;
    const groups = getResolvedCardsByGroup(matrixContext.slotCards, layout.id);
    return {
      time: buildGroupSummary(groups.time),
      space: buildGroupSummary(groups.space),
      optionA: buildGroupSummary(groups.optionA),
      optionB: buildGroupSummary(groups.optionB),
      all: buildGroupSummary(groups.all),
    };
  }, [matrixContext, layout]);

  const chooseOneNumberSummary = useMemo(() => {
    if (!groupSummaries || !matrixContext || layout?.id !== "choose-one-5") return null;
    const base = matrixContext.slotCards.get("1");
    const baseSigned = base?.card.number != null ? (base.reversed ? -base.card.number : base.card.number) : 0;
    const mod22 = (value: number) => ((value % 22) + 22) % 22;
    return {
      optionADirect: mod22(groupSummaries.optionA.numbers.sumSigned),
      optionAObjective: mod22(groupSummaries.optionA.numbers.sumSigned - baseSigned),
      optionBDirect: mod22(groupSummaries.optionB.numbers.sumSigned),
      optionBObjective: mod22(groupSummaries.optionB.numbers.sumSigned - baseSigned),
    };
  }, [groupSummaries, matrixContext, layout]);

  const drawAtDisplay =
    caseData?.drawTime &&
    new Date(caseData.drawTime).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  /** 生成/更新标题：YYYY-MM-DD | 分类 | 问题，日期用 drawTime 或当前日期 */
  const buildTitle = useCallback((c: Case) => {
    const dateStr = c.drawTime
      ? c.drawTime.slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    const cat = c.category ?? "";
    const q = (c.question ?? "").trim() || "—";
    return `${dateStr} | ${cat} | ${q}`;
  }, []);

  /** 从 case.cards + 牌库 构建 slotCards：Record<slotId, { cardId, cardKey, reversed }> */
  const buildSlotCards = useCallback((c: Case) => {
    if (!c.cards?.length) return undefined;
    const deck = getDeck();
    const byId = new Map(deck.cards.map((card) => [card.id, card]));
    const out: Record<string, { cardId: string; cardKey: string; reversed: boolean }> = {};
    for (const s of c.cards) {
      if (!s.cardId) continue;
      const card = byId.get(s.cardId);
      out[s.slotId] = {
        cardId: s.cardId,
        cardKey: card?.name ?? s.cardName ?? s.cardId,
        reversed: s.reversed ?? false,
      };
    }
    return out;
  }, []);

  /** 从 case 构建 supplements（行星 + 指示牌） */
  const buildSupplements = useCallback((c: Case) => {
    const planetBySlotId = c.planetSupplements && Object.keys(c.planetSupplements).length > 0
      ? { ...c.planetSupplements }
      : undefined;
    const fromSlots =
      c.cards && c.planetSupplements
        ? (() => {
            const deck = getDeck();
            const byId = new Map(deck.cards.map((card) => [card.id, card]));
            const out: Record<string, string> = {};
            for (const s of c.cards) {
              if (!s.cardId || !c.planetSupplements[s.slotId]) continue;
              const name = byId.get(s.cardId)?.name ?? s.cardId;
              out[name] = c.planetSupplements[s.slotId];
            }
            return out;
          })()
        : {};
    const planetByCardKey = {
      ...fromSlots,
      ...(c.supplements?.planetByCardKey ?? {}),
    };
    const planetByCardKeyOrUndefined =
      Object.keys(planetByCardKey).length > 0 ? planetByCardKey : undefined;
    const signifierTitles =
      c.supplements?.signifierTitles && c.supplements.signifierTitles.length > 0
        ? c.supplements.signifierTitles
        : undefined;
    return {
      ...(planetBySlotId && { planetBySlotId }),
      ...(planetByCardKeyOrUndefined && { planetByCardKey: planetByCardKeyOrUndefined }),
      ...(signifierTitles !== undefined && { signifierTitles }),
    };
  }, []);

  /** 构建 analysis（userNotes + manualNumberNote + 保留原有 tableState） */
  const buildAnalysis = useCallback(
    (c: Case, userNotes: string, manualNote?: string) => {
      const prev = c.analysis && typeof c.analysis === "object" && "tableState" in c.analysis
        ? (c.analysis as { tableState?: unknown }).tableState
        : undefined;
      const note =
        manualNote ??
        (c.analysis && typeof c.analysis === "object" && "manualNumberNote" in c.analysis
          ? (c.analysis as { manualNumberNote?: string }).manualNumberNote
          : undefined);
      return { userNotes, tableState: prev, manualNumberNote: note };
    },
    []
  );

  /** 保存：写入 title / slotCards / supplements / analysis / userInterpretation，停留本页并 toast */
  const handleSave = useCallback(async () => {
    if (!caseId || !caseData) return;
    const title = buildTitle(caseData);
    const slotCards = buildSlotCards(caseData);
    const supplements = buildSupplements(caseData);
    const analysis = buildAnalysis(caseData, userInterpretation, manualNumberNote);
    const updated = await saveCaseStep5(caseId, {
      title,
      slotCards,
      supplements,
      analysis,
      userInterpretation,
      ...(fromLibrary && { reviewFeedback }),
    });
    if (updated) setCaseData(updated);
    setToast("保存成功");
  }, [caseId, caseData, userInterpretation, manualNumberNote, reviewFeedback, fromLibrary, buildTitle, buildSlotCards, buildSupplements, buildAnalysis]);

  /** 指示牌列标题失焦保存（按列索引写入 signifierTitles） */
  const handleSignifierTitleBlur = useCallback(
    async (index: number) => {
      if (!caseId || !caseData) return;
      setEditingSignifierTitleIndex(null);
      const value = (signifierTitleInputs[index] ?? "").trim() || `指示牌${index + 1}`;
      const nextTitles = [...(caseData.supplements?.signifierTitles ?? [])];
      while (nextTitles.length <= index) nextTitles.push(`指示牌${nextTitles.length + 1}`);
      nextTitles[index] = value;
      const updated = await updateCaseStep5Partial(caseId, {
        supplements: { ...caseData.supplements, signifierTitles: nextTitles },
      });
      if (updated) setCaseData(updated);
    },
    [caseId, caseData, signifierTitleInputs]
  );

  /** 指示牌行星补录失焦保存（按 cardKey 存 planetByCardKey） */
  const handleSignifierPlanetBlur = useCallback(
    async (cardKey: string, planet: string) => {
      if (!caseId || !caseData) return;
      const next = { ...(caseData.supplements?.planetByCardKey ?? {}), [cardKey]: planet };
      const updated = await updateCaseStep5Partial(caseId, {
        supplements: { ...caseData.supplements, planetByCardKey: next },
      });
      if (updated) setCaseData(updated);
    },
    [caseId, caseData]
  );

  /** 数字加和手动备注失焦保存 */
  const handleManualNumberNoteBlur = useCallback(async () => {
    if (!caseId || !caseData) return;
    const updated = await updateCaseStep5Partial(caseId, {
      analysis: { ...(caseData.analysis ?? {}), manualNumberNote },
    });
    if (updated) setCaseData(updated);
  }, [caseId, caseData, manualNumberNote]);

  /** 用户解读失焦保存到草稿 */
  const handleUserInterpretationBlur = useCallback(async () => {
    if (!caseId) return;
    await updateCaseUserInterpretation(caseId, userInterpretation);
    setCaseData((c) => (c ? { ...c, userInterpretation } : null));
  }, [caseId, userInterpretation]);

  /** 复盘与反馈失焦保存 */
  const handleReviewFeedbackBlur = useCallback(async () => {
    if (!caseId) return;
    await updateCaseReviewFeedback(caseId, reviewFeedback);
    setCaseData((c) => (c ? { ...c, reviewFeedback } : null));
  }, [caseId, reviewFeedback]);

  /** 保存并返回案例库 */
  const handleSaveAndBack = useCallback(async () => {
    if (!caseId || !caseData) return;
    const title = buildTitle(caseData);
    const slotCards = buildSlotCards(caseData);
    const supplements = buildSupplements(caseData);
    const analysis = buildAnalysis(caseData, userInterpretation, manualNumberNote);
    await saveCaseStep5(caseId, {
      title,
      slotCards,
      supplements,
      analysis,
      userInterpretation,
      ...(fromLibrary && { reviewFeedback }),
    });
    router.push("/cases");
  }, [caseId, caseData, userInterpretation, manualNumberNote, reviewFeedback, fromLibrary, router, buildTitle, buildSlotCards, buildSupplements, buildAnalysis]);

  if (loading) {
    return <div className="text-sm text-slate-500">加载中…</div>;
  }

  if (notFound || !caseData) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-500">未找到该案例。</p>
        <Link href="/tarot" className="text-tarot-green hover:underline">
          返回塔罗
        </Link>
      </div>
    );
  }

  const locationDisplay = caseData.location
    ? [caseData.location.provinceName, caseData.location.cityName === "市辖区" ? caseData.location.provinceName : caseData.location.cityName].filter(Boolean).join(" · ") || "—"
    : "—";

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center bg-white">
      <div className="w-full max-w-[1560px] px-2 pt-2">
        <Link
          href={`/tarot?caseId=${caseId}`}
          className="text-sm text-slate-500 transition hover:text-tarot-green"
        >
          ← 返回修改基础信息
        </Link>
      </div>
      <div
        className={`mx-auto grid w-fit flex-1 gap-3 px-2 py-2 ${
          layout?.id === "hexagram-7"
            ? "max-w-none xl:grid-cols-[500px_auto]"
            : layout?.id === "four-elements-4"
              ? "max-w-none xl:grid-cols-[500px_auto]"
            : layout?.id === "choose-one-5"
              ? "max-w-[1560px] xl:grid-cols-[auto_auto]"
              : "max-w-[1560px] xl:grid-cols-[1fr_1fr]"
        }`}
      >
        <div
          className="flex min-w-0 shrink-0 flex-col gap-3"
          style={
            layout?.id === "choose-one-5"
              ? { width: 540 }
              : layout?.id === "hexagram-7" || layout?.id === "four-elements-4"
                ? { width: 500 }
                : undefined
          }
        >
          <section
            className="rounded-[22px] border border-[#e3efea] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
          >
            <h2 className="text-[29px] font-semibold leading-tight text-slate-900">塔罗案例分析工作台</h2>
            <p className="mt-2 text-[20px] font-semibold text-tarot-green">案例基本信息</p>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium text-slate-500">当前问题</dt>
                <dd className="mt-1 text-[19px] font-semibold leading-7 text-slate-900">
                  {caseData.question || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">问题描述</dt>
                <dd className="mt-1 whitespace-pre-wrap leading-7 text-slate-700">
                  {caseData.background || "—"}
                </dd>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {(caseData.tarotCategories?.length
                  ? caseData.tarotCategories
                  : caseData.category
                    ? [caseData.category]
                    : []
                ).map((cat) => {
                  const pill = getCategoryPillStyle(cat);
                  return (
                    <span key={cat} className={pill.className} style={pill.style}>
                      {cat}
                    </span>
                  );
                })}
                {caseData.spreadType && (
                  <span className={SPREAD_TYPE_PILL_CLASS}>{caseData.spreadType}</span>
                )}
              </div>
              <div className="grid gap-2 pt-1 sm:grid-cols-2">
                <div className="rounded-xl border border-[#e2eee8] bg-white px-3 py-2.5">
                  <dt className="text-xs font-medium text-slate-500">时间</dt>
                  <dd className="mt-1 text-sm text-slate-800">{drawAtDisplay || "—"}</dd>
                </div>
                <div className="rounded-xl border border-[#e2eee8] bg-white px-3 py-2.5">
                  <dt className="text-xs font-medium text-slate-500">地点</dt>
                  <dd className="mt-1 text-sm text-slate-800">{locationDisplay}</dd>
                </div>
              </div>
            </dl>
          </section>

          {/* 牌阵回顾：大小与位置已固定，勿随其它布局改动；修改前需与用户确认 */}
          <section
            className={`shrink-0 rounded-[22px] border border-[#e3efea] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)] ${
              layout?.id === "choose-one-5" ? "p-5" : "p-4"
            }`}
          >
            <h2 className="mb-2 text-[22px] font-semibold text-tarot-green">牌阵回顾</h2>
            {layout ? (
              layout.id === "hexagram-7" ? (
                <HexagramReviewBoard layout={layout} slotStates={slotStates} />
              ) : layout.id === "choose-one-5" ? (
                <ChooseOneReviewBoard layout={layout} slotStates={slotStates} />
              ) : layout.id === "four-elements-4" ? (
                <FourElementsReviewBoard layout={layout} slotStates={slotStates} />
              ) : layout.id === "body-mind-spirit-3" ? (
                <BodyMindSpiritReviewBoard layout={layout} slotStates={slotStates} />
              ) : layout.id === "holy-triangle-3" ? (
                <HolyTriangleReviewBoard layout={layout} slotStates={slotStates} />
              ) : layout.id === "no-spread-3" ? (
                <NoSpreadReviewBoard layout={layout} slotStates={slotStates} />
              ) : layout.id === "timeflow-3" ? (
                <TimeFlowReviewBoard layout={layout} slotStates={slotStates} />
              ) : (
                <div className="mt-2 grid gap-2 text-sm">
                  {layout.slots.map((slot) => {
                    const state = slotStates[slot.id];
                    const name = state?.cardName ? (state.reversed ? `${state.cardName}-` : state.cardName) : "—";
                    return (
                      <div key={slot.id} className="flex items-center gap-2 rounded-2xl border border-tarot-green-light bg-tarot-panel px-3 py-2.5">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tarot-green text-xs font-medium text-white">{slot.id}</span>
                        <span className="text-tarot-green">{slot.name}</span>
                        <span className="text-slate-700">{name}</span>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <p className="mt-4 text-sm text-slate-500">该牌阵布局未接入</p>
            )}
          </section>
        </div>

        <div className="flex min-w-0 w-max flex-col gap-3 overflow-visible">
          <section className="rounded-[22px] border border-[#e3efea] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <h2 className="mb-2 text-[20px] font-semibold text-tarot-green">统筹分析表格</h2>
            {matrixColumns.length > 0 && matrixContext ? (
              (() => {
                const colCount = matrixColumns.length;
                const totalCols = colCount + 1;
                // 总宽度不固定，随列数延展；每列等宽。列多时略收窄、列少时略加宽，保证文字完整且视觉一致
                const colWidthPx =
                  totalCols <= 4 ? 130 : totalCols <= 6 ? 112 : totalCols <= 8 ? 100 : totalCols <= 10 ? 90 : 80;
                const tableWidthPx = totalCols * colWidthPx;
                const colWidthPct = `${100 / totalCols}%`;
                return (
              <div className="mt-2 overflow-visible">
                <table
                  className="border-collapse text-center text-sm table-fixed"
                  style={{ tableLayout: "fixed", width: tableWidthPx }}
                >
                  <colgroup>
                    <col style={{ width: colWidthPct }} />
                    {matrixColumns.map((_, i) => (
                      <col key={i} style={{ width: colWidthPct }} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="border border-slate-200 bg-tarot-panel px-2 py-1.5 text-slate-600 font-medium whitespace-nowrap text-center align-middle">
                        维度
                      </th>
                      {matrixColumns.map((col) => (
                        <th
                          key={col.id}
                          className="border border-slate-200 bg-tarot-panel px-2 py-1.5 text-slate-700 font-medium whitespace-nowrap text-center align-middle"
                        >
                          {col.kind === "signifier" && col.signifierIndex != null ? (
                            editingSignifierTitleIndex === col.signifierIndex ? (
                              <input
                                type="text"
                                className="min-w-[5.5rem] rounded border border-slate-300 bg-white px-1 py-0.5 text-center text-xs text-slate-800"
                                value={signifierTitleInputs[col.signifierIndex] ?? col.title}
                                onChange={(e) => {
                                  const next = [...signifierTitleInputs];
                                  next[col.signifierIndex!] = e.target.value;
                                  setSignifierTitleInputs(next);
                                }}
                                onBlur={() => handleSignifierTitleBlur(col.signifierIndex!)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") e.currentTarget.blur();
                                }}
                                autoFocus
                                aria-label={`指示牌${col.signifierIndex! + 1} 标题`}
                              />
                            ) : (
                              <button
                                type="button"
                                className="w-full whitespace-nowrap px-0.5 text-center text-xs text-slate-700 hover:text-tarot-green"
                                onClick={() => setEditingSignifierTitleIndex(col.signifierIndex!)}
                              >
                                {signifierTitleInputs[col.signifierIndex] ?? col.title}
                              </button>
                            )
                          ) : (
                            col.title
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="border border-slate-200 bg-slate-50 px-2 py-1 text-slate-600 whitespace-nowrap text-center align-middle">
                        牌名
                      </td>
                      {matrixColumns.map((col) => (
                        <td
                          key={col.id}
                          className="border border-slate-200 px-2 py-1 text-slate-800 whitespace-nowrap text-center align-middle"
                        >
                          {getColumnCardText(col, matrixContext)}
                        </td>
                      ))}
                    </tr>
                    {DIMENSION_ROWS.map((row) => (
                      <tr key={row.id} className="border-b border-slate-200">
                        <td className="border border-slate-200 bg-slate-50 px-2 py-1 text-slate-600 whitespace-nowrap text-center align-middle">
                          {row.label}
                        </td>
                        {matrixColumns.map((col) => (
                          <td
                            key={col.id}
                            className="border border-slate-200 px-2 py-1 text-slate-800 whitespace-nowrap text-center align-middle"
                          >
                            {col.kind === "signifier" &&
                            col.signifierIndex != null &&
                            row.id === "planet" &&
                            matrixContext ? (
                              (() => {
                                const entry =
                                  matrixContext.signifierCards[col.signifierIndex!];
                                if (!entry) return "";
                                const needsPlanet = entry.card.planetNeedsSupplement;
                                const currentPlanet =
                                  caseData.supplements?.planetByCardKey?.[entry.card.name] ?? "";
                                return needsPlanet ? (
                                  <select
                                    className="min-w-[5.5rem] rounded border border-slate-300 bg-white px-1 py-0.5 text-center text-xs text-slate-800"
                                    value={currentPlanet}
                                    onChange={(e) =>
                                      handleSignifierPlanetBlur(entry.card.name, e.target.value)
                                    }
                                    onBlur={(e) =>
                                      handleSignifierPlanetBlur(
                                        entry.card.name,
                                        e.currentTarget.value
                                      )
                                    }
                                    aria-label={`${entry.card.name} 行星`}
                                  >
                                    {PlanetOptions.map((opt) => (
                                      <option key={opt.value || "empty"} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  getCellValue(col, row, matrixContext, groupSummaries ?? undefined)
                                );
                              })()
                            ) : (
                              getCellValue(col, row, matrixContext, groupSummaries ?? undefined)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
                );
              })()
            ) : (
              <p className="mt-4 text-sm text-slate-500">无牌阵数据或布局未接入</p>
            )}
          </section>

          <section className="rounded-[22px] border border-[#e3efea] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <h2 className="mb-2 text-[20px] font-semibold text-tarot-green">数字计算</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-[#f7f9fa] px-3 py-2.5">
                <span className="text-slate-500">整体加和</span>
                <span className="font-semibold text-tarot-green">
                  {groupSummaries
                    ? `绝对值加和：${groupSummaries.all.numbers.sumAbs % 22} / 直接加和：${groupSummaries.all.numbers.sumSigned % 22}`
                    : "—"}
                </span>
              </div>
              {layout?.id === "choose-one-5" && (
                <>
                  <div className="flex items-center justify-between rounded-lg bg-[#eef4f2] px-3 py-2.5">
                    <span className="text-slate-500">选项A加和</span>
                    <span className="font-semibold text-slate-700">
                      {chooseOneNumberSummary
                        ? `直接加和：${chooseOneNumberSummary.optionADirect} / 客观加和：${chooseOneNumberSummary.optionAObjective}`
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-[#eef4f2] px-3 py-2.5">
                    <span className="text-slate-500">选项B加和</span>
                    <span className="font-semibold text-slate-700">
                      {chooseOneNumberSummary
                        ? `直接加和：${chooseOneNumberSummary.optionBDirect} / 客观加和：${chooseOneNumberSummary.optionBObjective}`
                        : "—"}
                    </span>
                  </div>
                </>
              )}
              {(layout?.id === "hexagram-7" || layout?.id === "timeflow-3") && (
                <div className="flex items-center justify-between rounded-lg bg-[#eef4f2] px-3 py-2.5">
                  <span className="text-slate-500">时间线加和</span>
                  <span className="font-semibold text-slate-700">
                    {groupSummaries
                      ? `绝对值加和：${groupSummaries.time.numbers.sumAbs % 22} / 直接加和：${groupSummaries.time.numbers.sumSigned % 22}`
                      : "—"}
                  </span>
                </div>
              )}
              <div>
                <label className="mb-2 block text-sm text-slate-500">手动备注</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-[#e3ece8] bg-white px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400"
                  value={manualNumberNote}
                  onChange={(e) => setManualNumberNote(e.target.value)}
                  onBlur={handleManualNumberNoteBlur}
                  placeholder="例如：某些牌不计入数字、特殊换算说明等"
                />
              </div>
            </div>
          </section>

          <section className="flex min-h-[340px] flex-1 flex-col rounded-[22px] border border-[#e3efea] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <h2 className="mb-2 text-[20px] font-semibold text-tarot-green">案例解读</h2>
            <textarea
              id="result-user-interpretation"
              className="min-h-[260px] w-full flex-1 resize-y rounded-xl border border-[#e3ece8] bg-[#fbfcfc] px-3 py-2.5 text-slate-800 placeholder-slate-400"
              value={userInterpretation}
              onChange={(e) => setUserInterpretation(e.target.value)}
              onBlur={handleUserInterpretationBlur}
              placeholder="输入你的解读…"
            />
            {fromLibrary && (
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  复盘与反馈
                </label>
                <textarea
                  className="min-h-24 w-full rounded-xl border border-[#e3ece8] bg-[#fbfcfc] px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400"
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  onBlur={handleReviewFeedbackBlur}
                  placeholder="填写复盘与反馈…"
                />
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="mt-3 flex justify-end gap-3 border-t border-[#e7efeb] pt-3">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-xl border border-[#dfe7e3] bg-white px-4 py-2 text-slate-700 shadow-sm hover:bg-slate-50"
        >
          保存
        </button>
        <button
          type="button"
          onClick={handleSaveAndBack}
          className="rounded-xl bg-tarot-green px-5 py-2 text-white shadow-sm hover:bg-emerald-700"
        >
          保存并返回案例库
        </button>
      </div>

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
