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
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-labelledby="step4-title"
      aria-modal="true"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-slate-600 bg-slate-900 shadow-xl">
        <div className="sticky top-0 border-b border-slate-700 bg-slate-900 px-4 py-3">
          <h2 id="step4-title" className="text-lg font-medium text-slate-100">
            补充信息（可跳过）
          </h2>
        </div>
        <div className="space-y-4 p-4">
          {cardsToSupplement.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-medium text-slate-400">
                需补充行星的牌（ACE / 宫廷牌）
              </h3>
              <ul className="space-y-3">
                {cardsToSupplement.map((item) => (
                  <li
                    key={item.slotId}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 p-3"
                  >
                    <span className="text-slate-300">
                      [{item.slotId}] {item.slotName}
                    </span>
                    <span className="text-slate-100">{item.cardName}</span>
                    <span className="text-xs text-slate-500">
                      {item.reversed ? "逆位" : "正位"}
                    </span>
                    <select
                      className="ml-auto rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-200"
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

          <section>
            <label htmlFor="step4-significator" className="mb-1 block text-sm font-medium text-slate-400">
              指示牌（可选，多张用英文分号 ; 分隔，逆位以 - 结尾）
            </label>
            <input
              id="step4-significator"
              type="text"
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-500"
              value={significatorInput}
              onChange={(e) => setSignificatorInput(e.target.value)}
              placeholder="例：愚者; 女祭司-"
            />
          </section>
        </div>
        <div className="flex gap-3 border-t border-slate-700 p-4">
          <button
            type="button"
            className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200 hover:bg-slate-700"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            type="button"
            className="flex-1 rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-200 hover:bg-slate-700"
            onClick={onSkip}
          >
            跳过
          </button>
          <button
            type="button"
            className="flex-1 rounded-md border border-slate-600 bg-tarot-card px-3 py-2 text-slate-100 hover:border-slate-500"
            onClick={handleConfirm}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
