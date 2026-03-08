"use client";

import type { SpreadLayout } from "@/lib/spreadTypes";
import type { SpreadSlotState } from "@/lib/spreadTypes";

const HOLY_TRIANGLE_NODE_ORDER = ["2", "3", "1"] as const;

/** 圣三角：上左现在、上右未来、下中过去 */
const NODE_COORDS: Record<string, [number, number]> = {
  "2": [22, 24],
  "3": [78, 24],
  "1": [50, 72],
};

type SlotStatesMap = Record<string, SpreadSlotState>;

export function HolyTriangleReviewBoard({
  layout,
  slotStates = {},
}: {
  layout: SpreadLayout;
  slotStates?: SlotStatesMap;
}) {
  if (layout.id !== "holy-triangle-3" || layout.slots.length < 3) return null;

  const slotsById = Object.fromEntries(layout.slots.map((slot) => [slot.id, slot]));

  return (
    <div className="mx-auto w-full max-w-[320px]">
      <div className="relative mx-auto w-full" style={{ aspectRatio: "1 / 1.05" }}>
        {HOLY_TRIANGLE_NODE_ORDER.map((slotId) => {
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
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-2xl border-2 border-[#a8d9c8] bg-white px-3 py-2.5 shadow-[0_4px_10px_rgba(5,150,105,0.10)]"
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
