"use client";

import { useEffect, useMemo, useState } from "react";
import { getDeck } from "@/lib/deck";
import { PlanetOptions } from "@/lib/planetOptions";
import type { SpreadLayout } from "@/lib/spreadTypes";
import type { Card } from "@/spec/data_models";

export type ParsedSlotResult = { cardId: string; reversed: boolean };

export type CardToSupplement = {
  slotId: string;
  slotName: string;
  cardId: string;
  cardName: string;
  reversed: boolean;
};

function getCardsNeedingSupplement(
  layout: SpreadLayout,
  parsed: Record<string, ParsedSlotResult>,
  deck: { cards: Card[] }
): CardToSupplement[] {
  const list: CardToSupplement[] = [];
  const byId = new Map(deck.cards.map((c) => [c.id, c]));
  for (const slot of layout.slots) {
    const p = parsed[slot.id];
    if (!p) continue;
    const card = byId.get(p.cardId);
    if (card?.planetNeedsSupplement) {
      list.push({
        slotId: slot.id,
        slotName: slot.name,
        cardId: card.id,
        cardName: card.name,
        reversed: p.reversed,
      });
    }
  }
  return list;
}

type Step4ModalProps = {
  open: boolean;
  caseId: string;
  layout: SpreadLayout;
  /** Step3 解析结果，用于列出需补充的牌 */
  step4Parsed: Record<string, ParsedSlotResult>;
  initialPlanetSupplements: Record<string, string>;
  initialSignificatorInput: string;
  onConfirm: (data: { planetSupplements: Record<string, string>; significatorInput: string }) => void;
  onSkip: () => void;
  /** 取消：关闭弹窗，返回 Step3 修改牌阵 */
  onCancel: () => void;
};

export function Step4Modal({
  open,
  caseId,
  layout,
  step4Parsed,
  initialPlanetSupplements,
  initialSignificatorInput,
  onConfirm,
  onSkip,
  onCancel,
}: Step4ModalProps) {
  const [planetSupplements, setPlanetSupplements] = useState<Record<string, string>>(
    initialPlanetSupplements
  );
  const [significatorInput, setSignificatorInput] = useState(initialSignificatorInput);

  useEffect(() => {
    if (open) {
      setPlanetSupplements(initialPlanetSupplements);
      setSignificatorInput(initialSignificatorInput);
    }
  }, [open, initialPlanetSupplements, initialSignificatorInput]);

  const cardsToSupplement = useMemo(() => {
    if (!open || !layout) return [];
    return getCardsNeedingSupplement(layout, step4Parsed, getDeck());
  }, [open, layout, step4Parsed]);

  if (!open) return null;

  const handlePlanetChange = (slotId: string, value: string) => {
    setPlanetSupplements((prev) => ({ ...prev, [slotId]: value }));
  };

  const handleConfirm = () => {
    onConfirm({ planetSupplements, significatorInput });
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-labelledby="step4-title"
      aria-modal="true"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-[#d7ebe2] bg-[#fbfefd] shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <div className="sticky top-0 flex items-center justify-between border-b border-[#e7f3ee] bg-[#fbfefd]/95 px-5 py-4 backdrop-blur">
          <h2 id="step4-title" className="text-xl font-semibold text-tarot-green">
            补充信息
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-1 text-slate-400 transition hover:bg-[#edf7f3] hover:text-slate-700"
            aria-label="关闭"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        </div>
        <div className="space-y-6 p-5">
          {cardsToSupplement.length > 0 && (
            <section>
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-tarot-green">
                <span className="text-base">✦</span> 补充 ACE 与宫廷牌行星
              </h3>
              <ul className="space-y-3">
                {cardsToSupplement.map((item) => (
                  <li
                    key={item.slotId}
                    className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#d9ece4] bg-[#f5fbf8] p-4"
                  >
                    <span className="text-slate-500">
                      [{item.slotId}] {item.slotName}
                    </span>
                    <span className="font-medium text-slate-900">{item.cardName}</span>
                    <span className="text-xs text-slate-500">
                      {item.reversed ? "逆位" : "正位"}
                    </span>
                    <select
                      className="ml-auto rounded-xl border border-[#d8ebe3] bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-tarot-green focus:ring-2 focus:ring-emerald-100"
                      value={planetSupplements[item.slotId] ?? ""}
                      onChange={(e) => handlePlanetChange(item.slotId, e.target.value)}
                      aria-label={`${item.slotName} ${item.cardName} 行星`}
                    >
                      {PlanetOptions.map((opt) => (
                        <option key={opt.value || "empty"} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 年运、星运不显示补充指示牌，仅其他牌阵显示 */}
          {layout.id !== "annual-17" && layout.id !== "starfortune-23" && (
            <section>
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-tarot-green">
                <span className="text-base">▤</span> 指示牌
              </h3>
              <label htmlFor="step4-significator" className="mb-2 block text-xs leading-5 text-slate-500">
                可选输入，若有多张请用分号 ; 分隔，逆位请在牌名末尾添加减号
              </label>
              <input
                id="step4-significator"
                type="text"
                className="w-full rounded-2xl border border-[#d8ebe3] bg-white px-4 py-3 text-slate-800 placeholder-slate-400 outline-none transition focus:border-tarot-green focus:ring-2 focus:ring-emerald-100"
                value={significatorInput}
                onChange={(e) => setSignificatorInput(e.target.value)}
                placeholder="例：愚者; 女祭司-"
              />
            </section>
          )}
        </div>
        <div className="flex gap-3 border-t border-[#e7f3ee] p-5">
          <button
            type="button"
            className="rounded-2xl border border-[#d8ebe3] bg-white px-5 py-2.5 text-slate-600 transition hover:bg-[#f5fbf8]"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            type="button"
            className="flex-1 rounded-2xl border border-[#d8ebe3] bg-white px-5 py-2.5 text-slate-600 transition hover:bg-[#f5fbf8]"
            onClick={onSkip}
          >
            跳过
          </button>
          <button
            type="button"
            className="flex-1 rounded-2xl bg-tarot-green px-5 py-2.5 text-white shadow-[0_10px_24px_rgba(5,150,105,0.22)] transition hover:bg-emerald-700"
            onClick={handleConfirm}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
