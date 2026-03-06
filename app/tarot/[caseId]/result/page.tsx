"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Case } from "@/lib/db";
import { getCaseById, saveCaseStep5, updateCaseStep5Partial } from "@/lib/repo/caseRepo";
import { getLayout } from "@/layouts";
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
import { SpreadBoard } from "@/components/SpreadBoard";

/**
 * Step5 分析页骨架：左右分栏，左侧案例信息+牌阵可视化，右侧统筹占位+用户解读
 */
export default function ResultPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.caseId as string;
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [userInterpretation, setUserInterpretation] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  /** 指示牌列标题，与列一一对应；可点击表头编辑 */
  const [signifierTitleInputs, setSignifierTitleInputs] = useState<string[]>([]);
  const [editingSignifierTitleIndex, setEditingSignifierTitleIndex] = useState<number | null>(null);
  const [manualNumberNote, setManualNumberNote] = useState("");

  useEffect(() => {
    if (!caseId) return;
    getCaseById(caseId)
      .then((c) => {
        if (!c) setNotFound(true);
        else {
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
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [caseId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const layout = useMemo(
    () => (caseData?.spreadType ? getLayout(caseData.spreadType) : null),
    [caseData?.spreadType]
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

  /** 六芒星三组统筹结果（时间线/空间线/整体），用于统筹列与数字加和区 */
  const groupSummaries = useMemo(() => {
    if (!matrixContext || !layout) return null;
    const groups = getResolvedCardsByGroup(matrixContext.slotCards, layout.id);
    return {
      time: buildGroupSummary(groups.time),
      space: buildGroupSummary(groups.space),
      all: buildGroupSummary(groups.all),
    };
  }, [matrixContext, layout]);

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
    });
    if (updated) setCaseData(updated);
    setToast("保存成功");
  }, [caseId, caseData, userInterpretation, manualNumberNote, buildTitle, buildSlotCards, buildSupplements, buildAnalysis]);

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
    });
    router.push("/cases");
  }, [caseId, caseData, userInterpretation, manualNumberNote, router, buildTitle, buildSlotCards, buildSupplements, buildAnalysis]);

  if (loading) {
    return <div className="text-slate-300 text-sm">加载中…</div>;
  }

  if (notFound || !caseData) {
    return (
      <div className="space-y-4">
        <p className="text-red-300">未找到该案例。</p>
        <Link href="/tarot" className="text-tarot-accent hover:underline">
          返回塔罗
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid flex-1 gap-6 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
        {/* 左侧：案例基础信息 + 牌阵可视化 */}
        <div className="flex min-w-0 flex-col gap-6 overflow-auto">
          <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-3">
            <h2 className="text-sm font-medium text-slate-400">案例基础信息</h2>
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="text-slate-500">标题</dt>
                <dd className="text-slate-100">{caseData.title || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">问题</dt>
                <dd className="text-slate-100">{caseData.question || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">背景</dt>
                <dd className="text-slate-100 whitespace-pre-wrap">{caseData.background || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">分类</dt>
                <dd className="text-slate-100">{caseData.category || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">抽牌时间</dt>
                <dd className="text-slate-100">{drawAtDisplay || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">牌阵类型</dt>
                <dd className="text-slate-100">{caseData.spreadType || "—"}</dd>
              </div>
            </dl>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-slate-400">牌阵</h2>
            {layout ? (
              <SpreadBoard
                layout={layout}
                slotStates={slotStates}
                onSlotClick={() => {}}
              />
            ) : (
              <p className="text-slate-500 text-sm">该牌阵布局未接入</p>
            )}
          </section>
        </div>

        {/* 右侧：统筹表格占位 + 用户解读 */}
        <div className="flex min-w-0 flex-col gap-6 overflow-visible">
          <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="text-sm font-medium text-slate-400 mb-2">统筹分析表格</h2>
            {matrixColumns.length > 0 && matrixContext ? (
              <div className="w-full overflow-visible">
                <table className="mx-auto w-auto border-collapse text-center text-sm" style={{ tableLayout: "auto" }}>
                  <thead>
                    <tr className="border-b border-slate-600">
                      <th className="border border-slate-600 bg-slate-800/80 px-2 py-1.5 text-slate-400 font-medium whitespace-nowrap text-center align-middle">
                        维度
                      </th>
                      {matrixColumns.map((col) => (
                        <th
                          key={col.id}
                          className="border border-slate-600 bg-slate-800/80 px-1.5 py-1.5 text-slate-300 font-medium whitespace-nowrap text-center align-middle"
                        >
                          {col.kind === "signifier" && col.signifierIndex != null ? (
                            editingSignifierTitleIndex === col.signifierIndex ? (
                              <input
                                type="text"
                                className="min-w-[5.5rem] rounded border border-slate-600 bg-slate-900 px-1 py-0.5 text-center text-xs text-slate-100"
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
                                className="w-full whitespace-nowrap px-0.5 text-center text-xs text-slate-300 hover:text-slate-100"
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
                    <tr className="border-b border-slate-600">
                      <td className="border border-slate-600 bg-slate-800/50 px-2 py-1 text-slate-500 whitespace-nowrap text-center align-middle">
                        牌名
                      </td>
                      {matrixColumns.map((col) => (
                        <td
                          key={col.id}
                          className="border border-slate-600 px-1.5 py-1 text-slate-200 whitespace-nowrap text-center align-middle"
                        >
                          {getColumnCardText(col, matrixContext)}
                        </td>
                      ))}
                    </tr>
                    {DIMENSION_ROWS.map((row) => (
                      <tr key={row.id} className="border-b border-slate-600">
                        <td className="border border-slate-600 bg-slate-800/50 px-2 py-1 text-slate-500 whitespace-nowrap text-center align-middle">
                          {row.label}
                        </td>
                        {matrixColumns.map((col) => (
                          <td
                            key={col.id}
                            className="border border-slate-600 px-1.5 py-1 text-slate-200 whitespace-nowrap text-center align-middle"
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
                                    className="min-w-[5.5rem] rounded border border-slate-600 bg-slate-800 px-1 py-0.5 text-center text-xs text-slate-200"
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
            ) : (
              <p className="text-slate-500 text-sm">无牌阵数据或布局未接入</p>
            )}
          </section>

          {/* 数字计算和备注（可选） */}
          <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="text-sm font-medium text-slate-400 mb-2">数字计算和备注（可选）</h2>
            {groupSummaries ? (
              <div className="space-y-1 text-sm text-slate-200 mb-3">
                <p className="font-mono">
                  整体：绝对值加和 ={" "}
                  {groupSummaries.all.numbers.sumAbs % 22}
                  ，直接加和 = {groupSummaries.all.numbers.sumSigned % 22}
                </p>
                {layout?.id === "hexagram-7" && (
                  <>
                    <p className="font-mono text-slate-400">
                      时间线：绝对值加和 = {groupSummaries.time.numbers.sumAbs % 22}
                      ，直接加和 = {groupSummaries.time.numbers.sumSigned % 22}
                    </p>
                  </>
                )}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">—</p>
            )}
            <label className="mb-1 mt-1 block text-sm font-medium text-slate-400">
              手动备注
            </label>
            <input
              type="text"
              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-100 placeholder-slate-500"
              value={manualNumberNote}
              onChange={(e) => setManualNumberNote(e.target.value)}
              onBlur={handleManualNumberNoteBlur}
              placeholder="例如：某些牌不计入数字、特殊换算说明等"
            />
          </section>

          <section className="flex flex-col gap-2 flex-1 min-h-0">
            <label htmlFor="result-user-interpretation" className="text-sm font-medium text-slate-400">
              用户解读
            </label>
            <textarea
              id="result-user-interpretation"
              className="min-h-[120px] w-full flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-500 resize-y"
              value={userInterpretation}
              onChange={(e) => setUserInterpretation(e.target.value)}
              placeholder="输入你的解读…"
            />
          </section>
        </div>
      </div>

      {/* 右下按钮 */}
      <div className="mt-4 flex justify-end gap-3 border-t border-slate-800 pt-4">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-md border border-slate-600 bg-slate-800 px-4 py-2 text-slate-200 hover:bg-slate-700"
        >
          保存
        </button>
        <button
          type="button"
          onClick={handleSaveAndBack}
          className="rounded-md border border-slate-600 bg-tarot-card px-4 py-2 text-slate-100 hover:border-slate-500"
        >
          保存并返回案例库
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-100 shadow-lg"
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
