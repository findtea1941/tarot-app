"use client";

import type { SpreadLayout } from "@/lib/spreadTypes";
import type { SpreadSlotState } from "@/lib/spreadTypes";

const BODY_MIND_SPIRIT_ORDER = ["1", "2", "3"] as const;

/** 身心灵：1 上中灵阶，2 左中心阶，3 最下且水平在 1 与 2 之间；三张牌垂直等距、略拉大 */
const NODE_COORDS: Record<string, [number, number]> = {
  "1": [50, 20],
  "2": [28, 50],
  "3": [39, 80],
};

type SlotStatesMap = Record<string, SpreadSlotState>;

export function BodyMindSpiritReviewBoard({
  layout,
  slotStates = {},
}: {
  layout: SpreadLayout;
  slotStates?: SlotStatesMap;
}) {
  if (layout.id !== "body-mind-spirit-3" || layout.slots.length < 3) return null;

  const slotsById = Object.fromEntries(layout.slots.map((slot) => [slot.id, slot]));

  return (
    <div className="rounded-[24px] border border-[#dcefe6] bg-[#f2faf6] p-1">
      <div className="relative mx-auto w-full" style={{ aspectRatio: "1 / 1.2" }}>
        {BODY_MIND_SPIRIT_ORDER.map((slotId) => {
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
