"use client";

import type { SpreadLayout } from "@/lib/spreadTypes";
import type { SpreadSlotState } from "@/lib/spreadTypes";

/**
 * 二择一牌阵回顾：位置与大小已锁定。
 * 修改本组件内容器尺寸、牌位坐标（NODE_COORDS）或间距，须经用户书面授权。
 */

const CHOOSE_ONE_NODE_ORDER = ["4", "5", "2", "3", "1"] as const;

/** 二择一：上排4/5，中排2/3，下排1；以2、3为中轴，1与4、5的垂直间距镜像一致 */
const NODE_COORDS: Record<string, [number, number]> = {
  "4": [32, 22],
  "5": [68, 22],
  "2": [39, 48], // 在 1 与 4 的连线附近
  "3": [61, 48], // 在 1 与 5 的连线附近
  "1": [50, 74], // 1 到 2、3 的垂直距离 = 2、3 到 4、5 的垂直距离（26%）
};

type SlotStatesMap = Record<string, SpreadSlotState>;

export function ChooseOneReviewBoard({
  layout,
  slotStates = {},
}: {
  layout: SpreadLayout;
  slotStates?: SlotStatesMap;
}) {
  if (layout.id !== "choose-one-5" || layout.slots.length < 5) return null;

  const slotsById = Object.fromEntries(layout.slots.map((slot) => [slot.id, slot]));

  return (
    <div className="mx-auto w-fit">
      <div className="relative w-[420px] sm:w-[470px]" style={{ aspectRatio: "1 / 0.96" }}>
        {CHOOSE_ONE_NODE_ORDER.map((slotId) => {
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
