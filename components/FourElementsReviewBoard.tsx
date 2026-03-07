"use client";

import type { SpreadLayout } from "@/lib/spreadTypes";
import type { SpreadSlotState } from "@/lib/spreadTypes";

const FOUR_ELEMENTS_NODE_ORDER = ["1", "2", "3", "4"] as const;

/** 四元素：火上、风左、土右、水下 */
const NODE_COORDS: Record<string, [number, number]> = {
  "1": [50, 14],
  "2": [24, 50],
  "3": [76, 50],
  "4": [50, 86],
};

type SlotStatesMap = Record<string, SpreadSlotState>;

export function FourElementsReviewBoard({
  layout,
  slotStates = {},
}: {
  layout: SpreadLayout;
  slotStates?: SlotStatesMap;
}) {
  if (layout.id !== "four-elements-4" || layout.slots.length < 4) return null;

  const slotsById = Object.fromEntries(layout.slots.map((slot) => [slot.id, slot]));

  return (
    <div className="rounded-[24px] border border-[#dcefe6] bg-[#f2faf6] p-0.5">
      <div className="relative mx-auto w-full" style={{ aspectRatio: "1 / 1.05" }}>
        {FOUR_ELEMENTS_NODE_ORDER.map((slotId) => {
          const slot = slotsById[slotId];
          if (!slot) return null;
          const state = slotStates[slotId];
          const cardName = state?.cardName
            ? state.reversed
              ? `${state.cardName}-`
              : state.cardName
            : "—";
          const [px, py] = NODE_COORDS[slotId] ?? [50, 50];

          return (
            <div
              key={slotId}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-2xl border border-[#c8e9d9] bg-white px-3 py-2.5 shadow-sm"
              style={{
                left: `${px}%`,
                top: `${py}%`,
                minWidth: 88,
              }}
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
  );
}
