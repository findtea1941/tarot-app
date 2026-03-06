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
    return <div className="text-slate-300 text-sm">加载中…</div>;
  }

  if (notFound || !caseData) {
    return (
      <div className="space-y-4">
        <p className="text-red-300">未找到该案例，可能已被删除。</p>
        <Link href="/tarot" className="text-tarot-accent hover:underline">
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
        .join("-")
    : "—";

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-semibold">牌阵录入</h1>

      {/* A. 顶部信息区（只读）：问题 / 背景 / 分类 / 抽牌时间 / 牌阵类型 */}
      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-3">
        <h2 className="text-sm font-medium text-slate-400">案例基础信息（只读）</h2>
        <dl className="grid gap-2 text-sm">
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
            <dd className="text-slate-100">{drawAtDisplay}</dd>
          </div>
          <div>
            <dt className="text-slate-500">抽牌地点</dt>
            <dd className="text-slate-100">{locationDisplay}</dd>
          </div>
          <div>
            <dt className="text-slate-500">牌阵类型</dt>
            <dd className="text-slate-100">{caseData.spreadType || "—"}</dd>
          </div>
        </dl>
      </section>

      {/* B. 牌阵布局区：SpreadBoard 按 (col,row) 展示，每格为 SlotStack（牌背+输入框） */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-slate-400">牌阵录入</h2>
        {layout ? (
          <SpreadBoard
            layout={layout}
            slotInputs={slotInputs}
            onSlotInputChange={setSlotValue}
            slotErrors={slotErrors}
          />
        ) : (
          <p className="text-slate-500 text-sm">该牌阵布局尚未接入，请选择「六芒星」。</p>
        )}
      </section>

      {/* C. 底部按钮区：左 返回修改案例信息 / 右 确定 */}
      <section className="flex items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={handleReturn}
          className="px-3 py-2 rounded-md border border-slate-600 text-slate-200 hover:bg-slate-800"
        >
          返回修改案例信息
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="px-4 py-2 rounded-md bg-tarot-card border border-slate-600 text-slate-100 hover:border-slate-500"
        >
          确定
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
