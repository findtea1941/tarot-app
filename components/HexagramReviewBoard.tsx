"use client";

import type { SpreadLayout } from "@/lib/spreadTypes";
import type { SpreadSlotState } from "@/lib/spreadTypes";

/** 渲染顺序：上、左中、右中、中心、左下、右下、下 */
const HEXAGRAM_NODE_ORDER = ["4", "2", "3", "7", "5", "6", "1"] as const;

/**
 * 节点百分比坐标 [x, y]。
 * SVG viewBox = "0 0 100 100"，节点定位也用同一坐标系（百分比）。
 */
const NODE_COORDS: Record<string, [number, number]> = {
  "4": [50, 8],    // 顶部中央
  "2": [14, 32],   // 左中
  "3": [86, 32],   // 右中
  "7": [50, 52],   // 中心
  "5": [14, 72],   // 左下
  "6": [86, 72],   // 右下
  "1": [50, 92],   // 底部中央
};

/** 连线：中心 → 各顶点；外圈依次相连 */
const LINES: [string, string][] = [
  ["7", "2"], ["7", "3"], ["7", "5"], ["7", "6"],
  ["4", "2"], ["4", "3"], ["2", "5"], ["5", "1"], ["1", "6"], ["6", "3"],
];

type SlotStatesMap = Record<string, SpreadSlotState>;

export function HexagramReviewBoard({
  layout,
  slotStates = {},
}: {
  layout: SpreadLayout;
  slotStates?: SlotStatesMap;
}) {
  if (layout.id !== "hexagram-7" || layout.slots.length < 7) return null;

  const slotsById = Object.fromEntries(layout.slots.map((s) => [s.id, s]));

  return (
    <div className="rounded-[24px] border border-[#dcefe6] bg-[#f2faf6] p-0.5">
      {/* 相对容器：固定宽高比，节点和连线都在里面 */}
      <div className="relative mx-auto w-full" style={{ aspectRatio: "1 / 1.05" }}>
        {/* SVG 连线层 */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {LINES.map(([a, b]) => {
            const [x1, y1] = NODE_COORDS[a] ?? [0, 0];
            const [x2, y2] = NODE_COORDS[b] ?? [0, 0];
            return (
              <line
                key={`${a}-${b}`}
                x1={x1}
                y1={y1 * (100 / 105)}
                x2={x2}
                y2={y2 * (100 / 105)}
                stroke="#b7e6d2"
                strokeWidth="0.9"
                strokeDasharray="3 2"
              />
            );
          })}
        </svg>

        {/* 节点层 */}
        {HEXAGRAM_NODE_ORDER.map((slotId) => {
          const slot = slotsById[slotId];
          if (!slot) return null;
          const state = slotStates[slotId];
          const cardName = state?.cardName
            ? state.reversed
              ? `${state.cardName}-`
              : state.cardName
            : "—";
          const [px, py] = NODE_COORDS[slotId] ?? [50, 50];
          const isCenter = slotId === "7";

          return (
            <div
              key={slotId}
              className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-2xl border bg-white px-3 py-2.5 shadow-sm ${
                isCenter
                  ? "border-[#a8ddc8] shadow-[0_8px_20px_rgba(5,150,105,0.14)]"
                  : "border-[#c8e9d9]"
              }`}
              style={{
                left: `${px}%`,
                top: `${(py / 105) * 100}%`,
                minWidth: isCenter ? 96 : 88,
              }}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-tarot-green text-xs font-semibold text-white">
                {slotId}
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
