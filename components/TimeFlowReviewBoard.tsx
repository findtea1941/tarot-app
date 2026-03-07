"use client";

import type { SpreadLayout } from "@/lib/spreadTypes";
import type { SpreadSlotState } from "@/lib/spreadTypes";

type SlotStatesMap = Record<string, SpreadSlotState>;

/** 时间流牌阵回顾：视觉与六芒星完全一致 */
export function TimeFlowReviewBoard({
  layout,
  slotStates = {},
}: {
  layout: SpreadLayout;
  slotStates?: SlotStatesMap;
}) {
  if (layout.id !== "timeflow-3" || layout.slots.length < 3) return null;

  const slots = layout.slots;
  const isCenter = (id: string) => id === "2";

  return (
    <div>
      <div className="relative mx-auto w-full overflow-hidden" style={{ aspectRatio: "1 / 0.32" }}>
        <div className="absolute inset-[2px] flex items-center justify-center gap-2">
          {slots.map((slot) => {
            const state = slotStates[slot.id];
            const cardName = state?.cardName
              ? state.reversed
                ? `${state.cardName}-`
                : state.cardName
              : "—";
            const center = isCenter(slot.id);
            return (
              <div
                key={slot.id}
                className={`flex min-w-0 flex-1 max-w-[120px] flex-col items-center rounded-2xl border bg-white px-2.5 py-2.5 shadow-sm ${
                  center
                    ? "border-[#a8ddc8] shadow-[0_8px_20px_rgba(5,150,105,0.14)]"
                    : "border-[#c8e9d9]"
                }`}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-tarot-green text-xs font-semibold text-white">
                  {slot.id}
                </span>
                <span className="mt-1 whitespace-nowrap text-[11px] font-semibold text-tarot-green">
                  {slot.name}
                </span>
                <span className="mt-0.5 whitespace-nowrap text-center text-[11px] text-slate-700">
                  {cardName}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
