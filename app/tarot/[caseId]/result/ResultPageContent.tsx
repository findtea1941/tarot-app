"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Component, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Case } from "@/lib/db";
import { getCaseById, saveCaseStep5, updateCaseStep5Partial, updateCaseReviewFeedback, updateCaseUserInterpretation } from "@/lib/repo/caseRepo";
import { getLayout, getLayoutWithTimeAxisVariant } from "@/layouts";
import { getAnnualHouseDates, getReadingStartMonthHouse, getHouseLabel } from "@/layouts/annual";
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
import { AnnualReviewBoard } from "@/components/AnnualReviewBoard";
import { StarFortuneReviewBoard } from "@/components/StarFortuneReviewBoard";
import { BodyMindSpiritReviewBoard } from "@/components/BodyMindSpiritReviewBoard";
import { ChooseOneReviewBoard } from "@/components/ChooseOneReviewBoard";
import { FourElementsReviewBoard } from "@/components/FourElementsReviewBoard";
import { HolyTriangleReviewBoard } from "@/components/HolyTriangleReviewBoard";
import { HexagramReviewBoard } from "@/components/HexagramReviewBoard";
import { NoSpreadReviewBoard } from "@/components/NoSpreadReviewBoard";
import { TimeFlowReviewBoard } from "@/components/TimeFlowReviewBoard";
import {
  buildAnnualStats,
  buildStarFortuneStats,
  formatElementLine,
  formatStageLine,
  formatTraitLine,
  formatCardTypeLine,
  topKeysWithCount,
  formatHouseLabel,
} from "@/lib/annualStats";
import {
  buildFlyChainTable,
  flyChainStats,
  getSlotName as getFlySlotName,
} from "@/lib/flyingPalace";
import {
  buildFlyChainTableStarFortune,
  getSlotNameStarFortune,
} from "@/lib/flyingPalaceStarFortune";

const AnnualFlyChainGraph = dynamic(
  () => import("@/components/AnnualFlyChainGraph").then((m) => ({ default: m.AnnualFlyChainGraph })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-[#e2ebe7] bg-[#fbfdfc] px-4 py-6 text-center text-sm text-slate-500">
        飞宫链加载中…
      </div>
    ),
  }
);

class FlyChainGraphBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("AnnualFlyChainGraph render failed:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          飞宫链渲染失败，已自动跳过图表显示。
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Step5 分析页内容（仅客户端加载，避免服务端执行 caseRepo/db 与飞宫链导致 500）
 */
export default function ResultPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseIdParam = params?.caseId;
  const caseId = Array.isArray(caseIdParam) ? caseIdParam[0] : caseIdParam ?? "";
  const fromLibrary = searchParams?.get("from") === "library";
  const fromDraft = searchParams?.get("from") === "draft";
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [userInterpretation, setUserInterpretation] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  /** 指示牌列标题，与列一一对应；可点击表头编辑 */
  const [signifierTitleInputs, setSignifierTitleInputs] = useState<string[]>([]);
  const [editingSignifierTitleIndex, setEditingSignifierTitleIndex] = useState<number | null>(null);
  /** 指示牌行星补录：正在编辑的行星格（signifierIndex），选完或点击别处即隐藏下拉框 */
  const [editingPlanetSignifierIndex, setEditingPlanetSignifierIndex] = useState<number | null>(null);
  const [manualNumberNote, setManualNumberNote] = useState("");
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [annualReviewDetailOpen, setAnnualReviewDetailOpen] = useState(false);
  const interpretationTextareaRef = useRef<HTMLTextAreaElement>(null);

  /** 案例解读 textarea 随内容自动增高（初始最小高度 380px，与左侧底部平齐） */
  const INTERPRETATION_MIN_HEIGHT_PX = 380;
  const resizeInterpretationTextarea = useCallback(() => {
    const el = interpretationTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(INTERPRETATION_MIN_HEIGHT_PX, el.scrollHeight)}px`;
  }, []);
  useEffect(() => {
    const raf = requestAnimationFrame(() => resizeInterpretationTextarea());
    return () => cancelAnimationFrame(raf);
  }, [userInterpretation, resizeInterpretationTextarea]);

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

  /** 年运/星运：案主生日、看盘起始月（来自 extra.annual） */
  const annualExtra = useMemo(() => {
    if ((layout?.id !== "annual-17" && layout?.id !== "starfortune-23") || !caseData?.extra) return null;
    const ex = caseData.extra as { annual?: { clientBirthday?: string; readingStartMonth?: string } };
    return ex.annual ?? null;
  }, [caseData?.extra, layout?.id]);

  /** 年运/星运：十二宫对应年-月-日（一宫=出生月日轮转，看盘起始月定年起宫） */
  const annualHouseDates = useMemo(() => {
    if ((layout?.id !== "annual-17" && layout?.id !== "starfortune-23") || !annualExtra?.clientBirthday || !annualExtra?.readingStartMonth)
      return undefined;
    return getAnnualHouseDates(annualExtra.clientBirthday, annualExtra.readingStartMonth);
  }, [layout?.id, annualExtra?.clientBirthday, annualExtra?.readingStartMonth]);

  /** 年运：统计（依赖 matrixContext.slotCards） */
  const annualStats = useMemo(() => {
    if (layout?.id !== "annual-17" || !matrixContext) return null;
    try {
      return buildAnnualStats(matrixContext.slotCards);
    } catch (error) {
      console.error("buildAnnualStats failed:", error);
      return null;
    }
  }, [layout?.id, matrixContext]);

  /** 星运：统计（23 张牌，逻辑与年运一致） */
  const starFortuneStats = useMemo(() => {
    if (layout?.id !== "starfortune-23" || !matrixContext) return null;
    try {
      return buildStarFortuneStats(matrixContext.slotCards);
    } catch (error) {
      console.error("buildStarFortuneStats failed:", error);
      return null;
    }
  }, [layout?.id, matrixContext]);

  /** 年运飞宫链 */
  const flyChainResult = useMemo(() => {
    if (layout?.id !== "annual-17" || !matrixContext) return null;
    try {
      const table = buildFlyChainTable(matrixContext.slotCards);
      return {
        table,
        stats: flyChainStats(table.rows),
        error: null as string | null,
      };
    } catch (error) {
      console.error("buildFlyChainTable failed:", error);
      return {
        table: null,
        stats: null,
        error: "飞宫链数据异常，已跳过链路图显示。",
      };
    }
  }, [layout?.id, matrixContext]);

  /** 星运飞宫链 */
  const flyChainResultStarFortune = useMemo(() => {
    if (layout?.id !== "starfortune-23" || !matrixContext) return null;
    try {
      const table = buildFlyChainTableStarFortune(matrixContext.slotCards);
      return {
        table,
        stats: flyChainStats(table.rows),
        error: null as string | null,
      };
    } catch (error) {
      console.error("buildFlyChainTableStarFortune failed:", error);
      return {
        table: null,
        stats: null,
        error: "飞宫链数据异常，已跳过链路图显示。",
      };
    }
  }, [layout?.id, matrixContext]);

  const flyChainTable = flyChainResult?.table ?? flyChainResultStarFortune?.table ?? null;
  const flyChainStatsResult = flyChainResult?.stats ?? flyChainResultStarFortune?.stats ?? null;
  const flyChainError = flyChainResult?.error ?? flyChainResultStarFortune?.error ?? null;
  const isStarFortune = layout?.id === "starfortune-23";
  const flyChainMissingMapping = (flyChainResult?.table ?? flyChainResultStarFortune?.table)?.missingMapping ?? null;
  const getFlySlotNameResolved = isStarFortune ? getSlotNameStarFortune : getFlySlotName;
  const statsForDisplay = annualStats ?? starFortuneStats;

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

  /** 年运牌阵回顾/大图用：合并 planetSupplements 与 supplements，保证行星符号能显示 */
  const annualSupplements = useMemo(() => {
    if (layout?.id !== "annual-17" || !caseData) return undefined;
    return buildSupplements(caseData);
  }, [layout?.id, caseData, buildSupplements]);

  /** 星运牌阵回顾/大图用：同上 */
  const starFortuneSupplements = useMemo(() => {
    if (layout?.id !== "starfortune-23" || !caseData) return undefined;
    return buildSupplements(caseData);
  }, [layout?.id, caseData, buildSupplements]);

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
    <div className="flex min-h-0 flex-1 flex-col items-center bg-white pb-16">
      {/* 竖线分左右，左侧横线+淡绿区隔牌阵回顾（无外框） */}
      <div
        className={`mx-auto grid min-h-0 w-full max-w-full flex-1 grid-cols-1 items-stretch ${
          layout?.id === "choose-one-5"
            ? "xl:w-fit xl:grid-cols-[540px_1px_auto]"
            : "xl:w-fit xl:grid-cols-[500px_1px_auto]"
        }`}
      >
        {/* 左侧列：上为工作台，下为牌阵回顾 */}
        <div
          className="flex min-w-0 shrink-0 flex-col"
          style={
            layout?.id === "choose-one-5" ? { width: 540 } : { width: 500 }
          }
        >
          <section className="shrink-0 bg-white p-4">
            <h2 className="text-[29px] font-semibold leading-tight text-slate-900">塔罗案例分析工作台</h2>
            <p className="mt-2 text-[20px] font-semibold text-tarot-green">案例基本信息</p>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium text-slate-500">当前问题</dt>
                <dd className="mt-1 text-sm font-semibold leading-7 text-slate-900">
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
                {annualExtra && (
                  <>
                    <div className="rounded-xl border border-[#e2eee8] bg-white px-3 py-2.5">
                      <dt className="text-xs font-medium text-slate-500">案主生日</dt>
                      <dd className="mt-1 text-sm text-slate-800">{annualExtra.clientBirthday ?? "—"}</dd>
                    </div>
                    <div className="rounded-xl border border-[#e2eee8] bg-white px-3 py-2.5">
                      <dt className="text-xs font-medium text-slate-500">看盘起始月（宫位）</dt>
                      <dd className="mt-1 text-sm text-slate-800">
                        {annualExtra.readingStartMonth && annualExtra.clientBirthday
                          ? (() => {
                              const house = getReadingStartMonthHouse(annualExtra.clientBirthday, annualExtra.readingStartMonth);
                              const 宫位 = house != null ? getHouseLabel(house) : "";
                              return 宫位 ? `${annualExtra.readingStartMonth}（${宫位}）` : annualExtra.readingStartMonth;
                            })()
                          : annualExtra?.readingStartMonth ?? "—"}
                      </dd>
                    </div>
                  </>
                )}
              </div>
            </dl>
          </section>
          {/* 横线 1px，与竖线粗细一致 */}
          <div className="h-px shrink-0 bg-slate-200" />

          {/* 牌阵回顾：横线下淡绿色背景区隔；年运/星运时整块淡绿区可点击打开大图 */}
          <section
            role={layout?.id === "annual-17" || layout?.id === "starfortune-23" ? "button" : undefined}
            tabIndex={layout?.id === "annual-17" || layout?.id === "starfortune-23" ? 0 : undefined}
            onClick={layout?.id === "annual-17" || layout?.id === "starfortune-23" ? () => setAnnualReviewDetailOpen(true) : undefined}
            onKeyDown={
              layout?.id === "annual-17" || layout?.id === "starfortune-23"
                ? (e) => e.key === "Enter" && setAnnualReviewDetailOpen(true)
                : undefined
            }
            className={`min-h-0 flex-1 bg-[#edf8f2] ${
              layout?.id === "choose-one-5" ? "p-5" : "p-4"
            } ${layout?.id === "annual-17" || layout?.id === "starfortune-23" ? "cursor-pointer" : ""}`}
            aria-label={layout?.id === "annual-17" || layout?.id === "starfortune-23" ? "点击查看牌阵详图" : undefined}
          >
            <h2 className="mb-2 text-[22px] font-semibold text-tarot-green">牌阵回顾</h2>
            {layout ? (
              layout.id === "starfortune-23" ? (
                <StarFortuneReviewBoard
                  slotStates={slotStates}
                  clientBirthday={annualExtra?.clientBirthday}
                  readingStartMonth={annualExtra?.readingStartMonth}
                  supplements={starFortuneSupplements ?? caseData?.supplements}
                  detailOpen={annualReviewDetailOpen}
                  onClose={() => setAnnualReviewDetailOpen(false)}
                />
              ) : layout.id === "hexagram-7" ? (
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
              ) : layout.id === "annual-17" ? (
                <AnnualReviewBoard
                  slotStates={slotStates}
                  clientBirthday={annualExtra?.clientBirthday}
                  readingStartMonth={annualExtra?.readingStartMonth}
                  supplements={annualSupplements ?? caseData?.supplements}
                  detailOpen={annualReviewDetailOpen}
                  onClose={() => setAnnualReviewDetailOpen(false)}
                />
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

        {/* 竖线分隔左右：顶格贯通，与左侧横线相交 */}
        <div className="hidden w-px shrink-0 self-stretch bg-slate-200 xl:block" aria-hidden />

        {/* 右侧列：统筹表格/年运统计+飞宫链、数字、案例解读；min-w-0 使统计与飞宫链同宽并换行 */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-10 overflow-visible pl-8 pr-4 pt-4 pb-4 xl:gap-12 xl:pl-10">
          {(layout?.id === "annual-17" || layout?.id === "starfortune-23") ? (
            <>
              {flyChainMissingMapping && (
                <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <p className="font-medium">缺少飞宫数据</p>
                  <p className="mt-1">{flyChainMissingMapping}</p>
                  <Link href={`/tarot/${caseId}/spread`} className="mt-2 inline-block text-tarot-green hover:underline">
                    返回牌阵录入修改
                  </Link>
                </section>
              )}
              {statsForDisplay && (
                <section className="shrink-0 w-full min-w-0">
                  <h2 className="mb-2 text-[20px] font-semibold text-tarot-green">统计表格</h2>
                  <div className="grid w-full grid-cols-[auto_1fr_1fr] gap-x-6 gap-y-4 rounded-xl border border-[#e2ebe7] bg-[#fbfdfc] p-4 text-sm [&>div]:min-w-0 [&>div]:pr-4 [&>div:last-child]:pr-0">
                    <div className="space-y-3 min-w-0">
                      <div className="flex min-w-0 items-start gap-1"><span className="shrink-0 text-slate-500">元素：</span><span className="min-w-0 flex-1 break-words font-medium text-slate-800">{formatElementLine(statsForDisplay)}</span></div>
                      <div className="flex min-w-0 items-start gap-1"><span className="shrink-0 text-slate-500">阶段：</span><span className="min-w-0 flex-1 break-words font-medium text-slate-800">{formatStageLine(statsForDisplay)}</span></div>
                      <div className="flex min-w-0 items-start gap-1"><span className="shrink-0 text-slate-500">性状：</span><span className="min-w-0 flex-1 break-words font-medium text-slate-800">{formatTraitLine(statsForDisplay)}</span></div>
                      <div className="flex min-w-0 items-start gap-1"><span className="shrink-0 text-slate-500">牌型比例：</span><span className="min-w-0 flex-1 break-words font-medium text-slate-800">{formatCardTypeLine(statsForDisplay)}</span></div>
                    </div>
                    <div className="space-y-3 min-w-0">
                      <div className="flex min-w-0 items-start gap-1">
                        <span className="shrink-0 text-slate-500">行星（含补录）：</span>
                        <span className="min-w-0 flex-1 break-words text-sm font-normal text-slate-800">
                          {Object.entries(statsForDisplay.planetCount)
                            .sort((a, b) => b[1] - a[1])
                            .map(([k, v]) => `${k}${v}`)
                            .join(" ") || "—"}
                        </span>
                      </div>
                      <div className="flex min-w-0 items-start gap-1">
                        <span className="shrink-0 text-slate-500">星座（≥2 前三）：</span>
                        <span className="min-w-0 flex-1 break-words font-medium text-slate-800">
                          {(() => {
                            const { items, note } = topKeysWithCount(statsForDisplay.zodiacCount);
                            if (!items.length) return "—";
                            return items.map(({ key, count }) => `${key}（${count}）`).join("、") + (note ? `、${note}` : "");
                          })()}
                        </span>
                      </div>
                      <div className="flex min-w-0 items-start gap-1">
                        <span className="shrink-0 text-slate-500">宫位（≥2 前三）：</span>
                        <span className="min-w-0 flex-1 break-words font-medium text-slate-800">
                          {(() => {
                            const { items, note } = topKeysWithCount(statsForDisplay.houseCount);
                            if (!items.length) return "—";
                            return items.map(({ key, count }) => `${formatHouseLabel(key)}（${count}）`).join("、") + (note ? `、${note}` : "");
                          })()}
                        </span>
                      </div>
                      <div className="flex min-w-0 items-start gap-1"><span className="shrink-0 text-slate-500">飞宫分支最多起点：</span><span className="min-w-0 flex-1 break-words font-medium text-slate-800">{flyChainStatsResult?.topStartSlots ? (flyChainStatsResult.topStartSlots.items.length ? flyChainStatsResult.topStartSlots.items.map(({ node, count }) => `${getFlySlotNameResolved(node)}（${count}）`).join("、") + (flyChainStatsResult.topStartSlots.note ? `、${flyChainStatsResult.topStartSlots.note}` : "") : (flyChainStatsResult.topStartSlots.note ?? "—")) : "—"}</span></div>
                    </div>
                    <div className="space-y-3 min-w-0">
                      <div className="flex min-w-0 items-start gap-1"><span className="shrink-0 text-slate-500">最多停止点：</span><span className="min-w-0 flex-1 break-words font-medium text-slate-800">{flyChainStatsResult?.topStopNodes ? (flyChainStatsResult.topStopNodes.items.length ? flyChainStatsResult.topStopNodes.items.map(({ node, count }) => `${getFlySlotNameResolved(node)}（${count}）`).join("、") + (flyChainStatsResult.topStopNodes.note ? `、${flyChainStatsResult.topStopNodes.note}` : "") : (flyChainStatsResult.topStopNodes.note ?? "—")) : "—"}</span></div>
                      <div className="flex min-w-0 items-start gap-1"><span className="shrink-0 text-slate-500">最多触停点：</span><span className="min-w-0 flex-1 break-words font-medium text-slate-800">{flyChainStatsResult?.topRedNodes ? (flyChainStatsResult.topRedNodes.items.length ? flyChainStatsResult.topRedNodes.items.map(({ node, count }) => `${getFlySlotNameResolved(node)}（${count}）`).join("、") + (flyChainStatsResult.topRedNodes.note ? `、${flyChainStatsResult.topRedNodes.note}` : "") : (flyChainStatsResult.topRedNodes.note ?? "—")) : "—"}</span></div>
                      <div className="flex min-w-0 items-start gap-1"><span className="shrink-0 text-slate-500">最多转折点：</span><span className="min-w-0 flex-1 break-words font-medium text-slate-800">{flyChainStatsResult?.topTurningNodes ? (flyChainStatsResult.topTurningNodes.items.length ? flyChainStatsResult.topTurningNodes.items.map(({ node, count }) => `${getFlySlotNameResolved(node)}（${count}）`).join("、") + (flyChainStatsResult.topTurningNodes.note ? `、${flyChainStatsResult.topTurningNodes.note}` : "") : (flyChainStatsResult.topTurningNodes.note ?? "—")) : "—"}</span></div>
                    </div>
                  </div>
                </section>
              )}
              {statsForDisplay && (
                <section className="shrink-0 w-full min-w-0">
                  <h2 className="mb-2 text-[20px] font-semibold text-tarot-green">数字加和</h2>
                  <p className="flex items-center gap-2 text-sm">
                    <span>
                      <span className="text-slate-500">绝对值 :</span>
                      <span className="ml-1 font-semibold text-green-600">{((statsForDisplay.numberSumAbsolute % 22) + 22) % 22}</span>
                    </span>
                    <span className="h-4 w-px shrink-0 bg-slate-300" />
                    <span>
                      <span className="text-slate-500">直接加和 :</span>
                      <span className="ml-1 font-semibold text-red-600">
                        {((statsForDisplay.numberSumSigned % 22) + 22) % 22}
                      </span>
                    </span>
                  </p>
                </section>
              )}
              {flyChainError && (
                <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <p className="font-medium">飞宫链已跳过</p>
                  <p className="mt-1">{flyChainError}</p>
                </section>
              )}
              {flyChainTable && !flyChainMissingMapping && matrixContext && (
                <section className="shrink-0 min-w-0 space-y-3">
                  <h2 className="mb-2 text-[20px] font-semibold text-tarot-green">飞宫链</h2>
                  <FlyChainGraphBoundary>
                    <AnnualFlyChainGraph
                      rows={flyChainTable.rows}
                      slotCards={matrixContext.slotCards}
                      houseDates={annualHouseDates}
                      getSlotName={isStarFortune ? getSlotNameStarFortune : undefined}
                    />
                  </FlyChainGraphBoundary>
                </section>
              )}
          <section className="flex min-h-[420px] flex-1 flex-col">
            <h2 className="mb-2 text-[20px] font-semibold text-tarot-green">用户解读区</h2>
            <textarea
              ref={interpretationTextareaRef}
              id="result-user-interpretation-annual"
              className="min-h-[380px] w-full resize-none overflow-hidden rounded-xl border border-[#e3ece8] bg-[#fbfcfc] px-3 py-2.5 text-slate-800 placeholder-slate-400"
                  value={userInterpretation}
                  onChange={(e) => setUserInterpretation(e.target.value)}
                  onBlur={handleUserInterpretationBlur}
                  placeholder="输入你的解读…"
                />
                {fromLibrary && (
                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-medium text-slate-700">复盘与反馈</label>
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
            </>
          ) : (
          <>
          <section className="shrink-0">
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
              <div className="mt-2 inline-block overflow-hidden rounded-lg border border-slate-200 bg-white">
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
                      <th className="border border-slate-200 bg-tarot-panel px-2 py-1.5 text-slate-600 font-semibold whitespace-nowrap text-center align-middle">
                        维度
                      </th>
                      {matrixColumns.map((col) => (
                        <th
                          key={col.id}
                          className={`border border-slate-200 bg-tarot-panel px-2 py-1.5 whitespace-nowrap text-center align-middle ${
                            col.kind === "summary"
                              ? "text-slate-700 font-semibold"
                              : "text-slate-700 font-medium"
                          }`}
                        >
                          {col.kind === "signifier" && col.signifierIndex != null ? (
                            editingSignifierTitleIndex === col.signifierIndex ? (
                              <input
                                type="text"
                                className="min-w-[5.5rem] rounded border border-slate-300 bg-white px-1 py-0.5 text-center text-sm text-slate-800"
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
                                className="w-full whitespace-nowrap px-0.5 text-center text-sm text-slate-700 hover:text-tarot-green"
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
                      <td className="border border-slate-200 bg-slate-50 px-2 py-1 font-semibold text-slate-600 whitespace-nowrap text-center align-middle">
                        牌名
                      </td>
                      {matrixColumns.map((col) => (
                        <td
                          key={col.id}
                          className={`border border-slate-200 px-2 py-1 whitespace-nowrap text-center align-middle ${
                            col.kind === "summary" ? "font-semibold text-slate-800" : "text-slate-800"
                          }`}
                        >
                          {getColumnCardText(col, matrixContext)}
                        </td>
                      ))}
                    </tr>
                    {DIMENSION_ROWS.map((row) => (
                      <tr key={row.id} className="border-b border-slate-200">
                        <td className="border border-slate-200 bg-slate-50 px-2 py-1 font-semibold text-slate-600 whitespace-nowrap text-center align-middle">
                          {row.label}
                        </td>
                        {matrixColumns.map((col) => (
                          <td
                            key={col.id}
                            className={`border border-slate-200 px-2 py-1 whitespace-nowrap text-center align-middle text-sm ${
                              col.kind === "summary" && row.id !== "planet"
                                ? "font-semibold text-slate-800"
                                : "font-normal text-slate-800"
                            }`}
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
                                const isEditing = editingPlanetSignifierIndex === col.signifierIndex;
                                const displayText = currentPlanet || "请选择";
                                return needsPlanet ? (
                                  <div className="flex justify-center">
                                    {isEditing ? (
                                      <select
                                        className="min-w-[5.5rem] rounded border border-slate-300 bg-white px-1 py-0.5 text-center text-sm font-normal text-slate-800"
                                        value={currentPlanet}
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          handleSignifierPlanetBlur(entry.card.name, v);
                                          setEditingPlanetSignifierIndex(null);
                                        }}
                                        onBlur={(e) => {
                                          handleSignifierPlanetBlur(
                                            entry.card.name,
                                            e.currentTarget.value
                                          );
                                          setEditingPlanetSignifierIndex(null);
                                        }}
                                        autoFocus
                                        aria-label={`${entry.card.name} 行星`}
                                      >
                                        {PlanetOptions.map((opt) => (
                                          <option key={opt.value || "empty"} value={opt.value}>
                                            {opt.label}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <button
                                        type="button"
                                        className="min-w-[5.5rem] rounded border border-transparent px-1 py-0.5 text-center text-sm font-normal text-slate-800 hover:border-slate-300 hover:bg-slate-50"
                                        onClick={() =>
                                          setEditingPlanetSignifierIndex(col.signifierIndex!)
                                        }
                                        aria-label={`${entry.card.name} 行星`}
                                      >
                                        {displayText}
                                      </button>
                                    )}
                                  </div>
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

          <section className="shrink-0">
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

          <section className="flex min-h-[420px] flex-1 flex-col">
            <h2 className="mb-2 text-[20px] font-semibold text-tarot-green">案例解读</h2>
            <textarea
              ref={interpretationTextareaRef}
              id="result-user-interpretation"
              className="min-h-[380px] w-full resize-none overflow-hidden rounded-xl border border-[#e3ece8] bg-[#fbfcfc] px-3 py-2.5 text-slate-800 placeholder-slate-400"
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
          </>
          )}
        </div>
      </div>

      {/* 底部固定 banner：与内容同宽网格，返回在牌阵回顾左缘下，保存在案例解读右缘下 */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
        <div
          className={`mx-auto grid grid-cols-1 items-center gap-4 px-4 sm:grid-cols-2 ${
            layout?.id === "choose-one-5"
              ? "w-full max-w-[1800px] xl:grid-cols-[540px_1fr]"
              : "w-full max-w-[1800px] xl:grid-cols-[500px_1fr]"
          }`}
        >
          {/* 返回：统一与主内容左列左缘对齐 */}
          <div className="flex items-center justify-start">
            <Link
              href={`/tarot/${caseId}/spread`}
              className="text-sm text-slate-500 transition hover:text-tarot-green"
            >
              ← 返回修改
            </Link>
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 sm:pt-0">
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
