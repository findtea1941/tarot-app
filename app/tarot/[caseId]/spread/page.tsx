"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Case } from "@/lib/db";
import {
  getCaseById,
  updateCaseSlotInputs,
  updateCaseSpreadCards,
  updateCaseStep4,
} from "@/lib/repo/caseRepo";
import { getLayout } from "@/layouts";
import { getDeck } from "@/lib/deck";
import { validateSlotInputs } from "@/lib/slotInputParse";
import { SpreadBoard } from "@/components/SpreadBoard";
import { HexagramEntryBoard } from "@/components/HexagramEntryBoard";
import { Step4Modal } from "@/components/Step4Modal";
import { getSlotInputId } from "@/components/SlotStack";

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
    getCaseById(caseId)
      .then((c) => {
        if (!c) setNotFound(true);
        else {
          setCaseData(c);
          setSlotInputs((c.slotInputs && typeof c.slotInputs === "object") ? { ...c.slotInputs } : {});
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [caseId]);

  const layout = useMemo(
    () => (caseData?.spreadType ? getLayout(caseData.spreadType) : null),
    [caseData?.spreadType]
  );

  const setSlotValue = useCallback((slotId: string, value: string) => {
    setSlotInputs((prev) => ({ ...prev, [slotId]: value }));
    setSlotErrors((prev) => (prev[slotId] ? { ...prev, [slotId]: "" } : prev));
  }, []);

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
    if (!caseId) return;
    await updateCaseSlotInputs(caseId, slotInputs);
    router.push(`/tarot?caseId=${caseId}`);
  }, [caseId, slotInputs, router]);

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
    <div className="mx-auto max-w-6xl space-y-8">
      {/* 案例基本信息摘要：与参考图一致 */}
      <section className="rounded-2xl border border-[#dcefe6] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <h2 className="flex items-center gap-2 pl-4 text-base font-semibold text-tarot-green sm:pl-16">
          <span
            className="flex h-5 w-5 items-center justify-center rounded bg-tarot-green/15 text-tarot-green"
            aria-hidden
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </span>
          案例基本信息摘要
        </h2>
        <div className="mt-5 grid gap-6 sm:grid-cols-[minmax(0,1.4fr)_1px_minmax(0,0.9fr)] sm:items-stretch">
          {/* 左侧：问题 + 问题背景，问题背景框下沿与右侧抽牌地点下沿对齐 */}
          <div className="flex flex-col gap-4 pl-4 sm:pl-16">
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
          {/* 中间细分割线：仅桌面展示，轻盈的绿色细线 */}
          <div className="hidden h-full w-px items-stretch justify-center sm:flex">
            <div className="mx-auto h-full w-px rounded-full bg-[#d8ede4]" aria-hidden />
          </div>
          {/* 右侧：分类 + 抽牌时间/地点，与左侧视觉连贯 */}
          <div className="mt-4 flex flex-col justify-center gap-3 text-sm sm:mt-0">
            <div>
              <dt className="text-xs font-semibold text-tarot-green">分类</dt>
              <dd className="mt-1">
                <span className="inline-block rounded-lg bg-[#d4f0e3] px-3 py-1 text-sm font-medium text-tarot-green">
                  {caseData.category || "—"}
                </span>
              </dd>
            </div>
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
      </section>

      <section className="rounded-[32px] border border-[#d5ece2] bg-[#edf8f2] px-4 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] sm:px-8">
        <div className="pt-2 text-center">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">牌阵录入</h2>
        </div>
        {layout ? (
          <div className="mt-1">
            {layout.id === "hexagram-7" ? (
              <HexagramEntryBoard
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
          <p className="mt-6 text-center text-sm text-slate-500">该牌阵布局尚未接入，请选择「六芒星」。</p>
        )}
      </section>

      <section className="flex flex-col gap-4 border-t border-[#d7ebe2] pt-6 sm:flex-row sm:items-center sm:justify-between">
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
