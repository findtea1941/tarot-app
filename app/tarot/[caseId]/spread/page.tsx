"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Case, SpreadType } from "@/lib/db";
import {
  getCaseById,
  restoreTarotDraft,
  updateTarotDraft,
  updateCaseSlotInputs,
  updateCaseSpreadCards,
  updateCaseStep4,
} from "@/lib/repo/caseRepo";
import { getLayout, getLayoutWithTimeAxisVariant } from "@/layouts";
import { getDeck } from "@/lib/deck";
import {
  DEFAULT_CITY_CODE,
  DEFAULT_PROVINCE_CODE,
  getCities,
  getProvinces,
} from "@/lib/region";
import { validateSlotInputs } from "@/lib/slotInputParse";
import { BodyMindSpiritEntryBoard } from "@/components/BodyMindSpiritEntryBoard";
import { ChooseOneEntryBoard } from "@/components/ChooseOneEntryBoard";
import { FourElementsEntryBoard } from "@/components/FourElementsEntryBoard";
import { HolyTriangleEntryBoard } from "@/components/HolyTriangleEntryBoard";
import { NoSpreadEntryBoard } from "@/components/NoSpreadEntryBoard";
import { SpreadBoard } from "@/components/SpreadBoard";
import { HexagramEntryBoard } from "@/components/HexagramEntryBoard";
import { TimeFlowEntryBoard } from "@/components/TimeFlowEntryBoard";
import { Step4Modal } from "@/components/Step4Modal";
import { getSlotInputId } from "@/components/SlotStack";
import { getCategoryPillStyle } from "@/lib/categoryTagStyles";
import {
  loadTarotDraftFromStorage,
  saveTarotDraftToStorage,
} from "@/lib/tarotDraftStorage";

export default function SpreadPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.caseId as string;
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  /** Step3 用户输入：Record<slotId, string>，从 case.slotInputs 回填 */
  const [slotInputs, setSlotInputs] = useState<Record<string, string>>({});
  /** 校验错误：slotId -> 文案；点击确定后填充 */
  const [slotErrors, setSlotErrors] = useState<Record<string, string>>({});
  /** 第一个出错 slot，用于滚动/聚焦 */
  const [focusSlotId, setFocusSlotId] = useState<string | null>(null);
  /** Step4 弹窗；打开时存 Step3 解析结果供补充列表用 */
  const [showStep4Modal, setShowStep4Modal] = useState(false);
  const [step4Parsed, setStep4Parsed] = useState<Record<string, { cardId: string; reversed: boolean }>>(
    {}
  );

  useEffect(() => {
    if (!caseId) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    const loadCase = async () => {
      try {
        // 新建案例后立即跳转到 Step3 时，IndexedDB 可能短暂还未可见；先重试几次再判定未找到
        for (let attempt = 0; attempt < 6; attempt += 1) {
          const c = await getCaseById(caseId);
          if (c) {
            if (cancelled) return;
            setCaseData(c);
            setSlotInputs(
              c.slotInputs && typeof c.slotInputs === "object" ? { ...c.slotInputs } : {}
            );
            setNotFound(false);
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 120));
        }

        const stored = loadTarotDraftFromStorage(caseId);
        if (stored?.question && stored.spreadType) {
          const provinceCode = stored.provinceCode || DEFAULT_PROVINCE_CODE;
          const cityCode = stored.cityCode || DEFAULT_CITY_CODE;
          const provinceName =
            getProvinces().find((p) => p.code === provinceCode)?.name ?? "";
          const cityName =
            getCities(provinceCode).find((c) => c.code === cityCode)?.name ?? "";
          const cityDisplay = cityName === "市辖区" ? provinceName : cityName;
          const drawTimeValue = stored.drawDate
            ? new Date(`${stored.drawDate}T${stored.drawTime || "00:00"}:00`)
            : null;
          const repaired = await restoreTarotDraft(caseId, {
            question: stored.question,
            background: stored.background || undefined,
            categories: stored.categories ?? [],
            drawTime:
              drawTimeValue && !Number.isNaN(drawTimeValue.getTime())
                ? drawTimeValue.toISOString()
                : "",
            spreadType: stored.spreadType as SpreadType,
            timeAxisVariant: stored.timeAxisVariant,
            location: {
              provinceCode,
              provinceName,
              cityCode,
              cityName,
              districtCode: "",
              districtName: "",
              label: [provinceName, cityDisplay].filter(Boolean).join("-"),
            },
          });
          if (cancelled) return;
          setCaseData(repaired);
          setSlotInputs({});
          setNotFound(false);
          return;
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

  const setSlotValue = useCallback((slotId: string, value: string) => {
    setSlotInputs((prev) => ({ ...prev, [slotId]: value }));
    setSlotErrors((prev) => (prev[slotId] ? { ...prev, [slotId]: "" } : prev));
  }, []);

  function parseDraftDrawTime(isoOrLocal?: string): { drawDate: string; drawTime: string } {
    if (!isoOrLocal) return { drawDate: "", drawTime: "" };
    const d = new Date(isoOrLocal);
    if (Number.isNaN(d.getTime())) return { drawDate: "", drawTime: "" };
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return { drawDate: `${y}-${m}-${day}`, drawTime: `${h}:${min}` };
  }

  /** 聚焦到第一个错误输入框并滚动到视内 */
  useEffect(() => {
    if (!focusSlotId) return;
    const id = getSlotInputId(focusSlotId);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      (el as HTMLInputElement).focus();
    }
    setFocusSlotId(null);
  }, [focusSlotId]);

  /** 返回 Step2：先持久化 slotInputs 再跳转，保留已填数据 */
  const handleReturn = useCallback(async () => {
    if (!caseId || !caseData) return;
    const { drawDate, drawTime } = parseDraftDrawTime(caseData.drawTime);

    saveTarotDraftToStorage(caseId, {
      question: caseData.question ?? "",
      background: caseData.background ?? "",
      categories: caseData.tarotCategories ?? (caseData.category ? [caseData.category] : []),
      drawDate,
      drawTime,
      spreadType: caseData.spreadType ?? "",
      timeAxisVariant: caseData.timeAxisVariant,
      provinceCode: caseData.location?.provinceCode || DEFAULT_PROVINCE_CODE,
      cityCode: caseData.location?.cityCode || DEFAULT_CITY_CODE,
    });

    try {
      await updateTarotDraft(caseId, {
        question: caseData.question ?? "",
        background: caseData.background ?? "",
        categories: caseData.tarotCategories ?? (caseData.category ? [caseData.category] : []),
        drawTime: caseData.drawTime ?? "",
        spreadType: caseData.spreadType as SpreadType | undefined,
        timeAxisVariant: caseData.timeAxisVariant,
        location: caseData.location,
      });
    } catch {
      // storage 已保存，忽略 DB 写入失败
    }

    await updateCaseSlotInputs(caseId, slotInputs);
    router.push(`/tarot?caseId=${caseId}`);
  }, [caseData, caseId, slotInputs, router]);

  /** 确定：校验 -> 失败则定位首错并展示错误；通过则保存解析结果并打开 Step4 占位 */
  const handleConfirm = useCallback(async () => {
    if (!caseId || !layout) return;
    setSlotErrors({});
    const deck = getDeck();
    const result = validateSlotInputs(layout, slotInputs, deck);
    if (!result.ok) {
      setSlotErrors(result.errors);
      setFocusSlotId(result.firstSlotId);
      return;
    }
    await updateCaseSlotInputs(caseId, slotInputs);
    const cards = layout.slots.map((s) => ({
      slotId: s.id,
      cardId: result.parsed[s.id].cardId,
      reversed: result.parsed[s.id].reversed,
    }));
    await updateCaseSpreadCards(caseId, cards);
    setStep4Parsed(
      Object.fromEntries(
        Object.entries(result.parsed).map(([k, v]) => [k, { cardId: v.cardId, reversed: v.reversed }])
      )
    );
    setShowStep4Modal(true);
  }, [caseId, layout, slotInputs]);

  /** Step4 确定：保存补充信息并进入 Step5 */
  const handleStep4Confirm = useCallback(
    async (data: { planetSupplements: Record<string, string>; significatorInput: string }) => {
      if (!caseId) return;
      await updateCaseStep4(caseId, data);
      router.push(`/tarot/${caseId}/result`);
    },
    [caseId, router]
  );

  /** Step4 跳过：保存空补充信息并进入 Step5 */
  const handleStep4Skip = useCallback(async () => {
    if (!caseId) return;
    await updateCaseStep4(caseId, { planetSupplements: {}, significatorInput: "" });
    router.push(`/tarot/${caseId}/result`);
  }, [caseId, router]);

  if (loading) {
    return <div className="text-sm text-slate-500">加载中…</div>;
  }

  if (notFound || !caseData) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-500">未找到该案例，可能已被删除。</p>
        <Link href="/tarot" className="text-tarot-green hover:underline">
          返回新建案例
        </Link>
      </div>
    );
  }

  const drawAtDisplay = caseData.drawTime
    ? new Date(caseData.drawTime).toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
  const locationDisplay = caseData.location
    ? [
        caseData.location.provinceName,
        caseData.location.cityName === "市辖区"
          ? caseData.location.provinceName
          : caseData.location.cityName,
      ]
        .filter(Boolean)
        .join(" · ")
    : "—";

  return (
    <div className="min-h-screen w-full">
      {/* 上部：白色背景 - 全宽，靠近顶栏，顶部细线区隔 */}
      <section className="w-full border-t border-slate-200/80 bg-white pt-3 pb-6 lg:pt-4 lg:pb-8">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-tarot-green">
            <span
              className="flex h-5 w-5 items-center justify-center rounded bg-tarot-green/15 text-tarot-green"
              aria-hidden
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
            案例基本信息摘要
          </h2>
          <div className="mt-5 grid gap-6 sm:grid-cols-[minmax(0,1.4fr)_1px_minmax(0,0.9fr)] sm:items-stretch">
            <div className="flex flex-col gap-4">
              <div className="shrink-0">
                <dt className="text-xs font-semibold text-tarot-green">问题</dt>
                <dd className="mt-1 text-base font-semibold leading-snug text-slate-900">
                  {caseData.question || "—"}
                </dd>
              </div>
              <div className="flex min-h-0 flex-1 flex-col">
                <dt className="shrink-0 text-xs font-semibold text-tarot-green">问题背景</dt>
                <dd className="mt-1 min-h-0 flex-1">
                  <div className="h-full min-h-[100px] rounded-xl bg-[#ecf8f2] px-4 py-3 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
                    {caseData.background || "—"}
                  </div>
                </dd>
              </div>
            </div>
            <div className="hidden h-full w-px items-stretch justify-center sm:flex">
              <div className="mx-auto h-full w-px rounded-full bg-[#d8ede4]" aria-hidden />
            </div>
            <div className="mt-4 flex flex-col justify-center gap-3 text-sm sm:mt-0">
              <div>
                <dt className="text-xs font-semibold text-tarot-green">分类</dt>
                <dd className="mt-1 flex flex-wrap gap-2">
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
                  {!caseData.tarotCategories?.length && !caseData.category && (
                    <span className="text-slate-400">—</span>
                  )}
                </dd>
              </div>
              {caseData.spreadType && (
                <div>
                  <dt className="text-xs font-semibold text-tarot-green">牌阵类型</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900">{caseData.spreadType}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-semibold text-tarot-green">抽牌时间</dt>
                <dd className="mt-1 text-sm font-medium text-slate-900">{drawAtDisplay}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-tarot-green">抽牌地点</dt>
                <dd className="mt-1 text-sm font-medium text-slate-900">{locationDisplay}</dd>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 中部：所有牌阵统一为同宽连续淡绿色块 */}
      <section className="w-full bg-white pt-0 pb-0">
        <div className="mx-auto max-w-6xl px-6">
          <div
            className="-mt-3 rounded-t-2xl bg-[#edf8f2] px-4 pt-7 lg:-mt-4 lg:px-6 lg:pt-9"
          >
            <div className="text-center">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">牌阵录入</h2>
            </div>
            {layout ? (
              <div className="mt-4">
                {layout.id === "hexagram-7" ? (
                  <HexagramEntryBoard
                    layout={layout}
                    slotInputs={slotInputs}
                    onSlotInputChange={setSlotValue}
                    slotErrors={slotErrors}
                  />
                ) : layout.id === "choose-one-5" ? (
                  <ChooseOneEntryBoard
                    layout={layout}
                    slotInputs={slotInputs}
                    onSlotInputChange={setSlotValue}
                    slotErrors={slotErrors}
                  />
                ) : layout.id === "four-elements-4" ? (
                  <FourElementsEntryBoard
                    layout={layout}
                    slotInputs={slotInputs}
                    onSlotInputChange={setSlotValue}
                    slotErrors={slotErrors}
                  />
                ) : layout.id === "body-mind-spirit-3" ? (
                  <BodyMindSpiritEntryBoard
                    layout={layout}
                    slotInputs={slotInputs}
                    onSlotInputChange={setSlotValue}
                    slotErrors={slotErrors}
                  />
                ) : layout.id === "holy-triangle-3" ? (
                  <HolyTriangleEntryBoard
                    layout={layout}
                    slotInputs={slotInputs}
                    onSlotInputChange={setSlotValue}
                    slotErrors={slotErrors}
                  />
                ) : layout.id === "no-spread-3" ? (
                  <NoSpreadEntryBoard
                    layout={layout}
                    slotInputs={slotInputs}
                    onSlotInputChange={setSlotValue}
                    slotErrors={slotErrors}
                  />
                ) : layout.id === "timeflow-3" ? (
                  <TimeFlowEntryBoard
                    layout={layout}
                    slotInputs={slotInputs}
                    onSlotInputChange={setSlotValue}
                    slotErrors={slotErrors}
                  />
                ) : (
                  <SpreadBoard
                    layout={layout}
                    slotInputs={slotInputs}
                    onSlotInputChange={setSlotValue}
                    slotErrors={slotErrors}
                  />
                )}
              </div>
            ) : (
              <p className="mt-6 text-center text-sm text-slate-500">该牌阵布局尚未接入，请选择「六芒星」或「时间流」。</p>
            )}
          </div>
        </div>
      </section>

      {/* 下部：所有牌阵统一为连续绿色底座上的白色丝带 */}
      <section className="w-full bg-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="bg-[#edf8f2]">
            <div className="border-b border-slate-200/90 bg-white py-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)] lg:py-6">
              <div className="flex flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handleReturn}
                  className="text-sm text-slate-500 transition hover:text-tarot-green"
                >
                  ← 返回修改案例信息
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="rounded-full bg-tarot-green px-8 py-3 text-sm font-medium text-white shadow-[0_10px_24px_rgba(5,150,105,0.22)] transition hover:bg-emerald-700"
                >
                  确定录入
                </button>
              </div>
            </div>
            <div className="h-[0.5cm] w-full" aria-hidden />
          </div>
        </div>
      </section>

      {/* Step4 补充信息弹窗 */}
      {layout && (
        <Step4Modal
          open={showStep4Modal}
          caseId={caseId}
          layout={layout}
          step4Parsed={step4Parsed}
          initialPlanetSupplements={caseData.planetSupplements ?? {}}
          initialSignificatorInput={caseData.significatorInput ?? ""}
          onConfirm={handleStep4Confirm}
          onSkip={handleStep4Skip}
          onCancel={() => setShowStep4Modal(false)}
        />
      )}
    </div>
  );
}
