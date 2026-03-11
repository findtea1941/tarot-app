"use client";

import type { SpreadLayout } from "@/lib/spreadTypes";
import { getSlotInputId } from "./SlotStack";

const NO_SPREAD_ORDER = ["1", "2", "3"] as const;

/** 无牌阵：1 上中主牌，2 左下副牌1，3 右下副牌2；整体上移、2/3 靠近 1，参考圣三角 */
const NODE_COORDS: Record<string, [number, number]> = {
  "1": [0.5, 0.28],
  "2": [0.38, 0.58],
  "3": [0.62, 0.58],
};

type NoSpreadEntryBoardProps = {
  layout: SpreadLayout;
  slotInputs: Record<string, string>;
  onSlotInputChange: (slotId: string, value: string) => void;
  slotErrors?: Record<string, string>;
};

export function NoSpreadEntryBoard({
  layout,
  slotInputs,
  onSlotInputChange,
  slotErrors = {},
}: NoSpreadEntryBoardProps) {
  if (layout.id !== "no-spread-3" || layout.slots.length < 3) return null;

  const slotsById = Object.fromEntries(layout.slots.map((slot) => [slot.id, slot]));

  return (
    <div className="relative mx-auto w-full max-w-5xl px-2" style={{ aspectRatio: "3.15" }}>
      {NO_SPREAD_ORDER.map((slotId) => {
        const slot = slotsById[slotId];
        if (!slot) return null;

        const [x, y] = NODE_COORDS[slotId] ?? [0.5, 0.5];
        const error = slotErrors[slotId];

        return (
          <div
            key={slotId}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
          >
            <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-tarot-green">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-tarot-green text-xs text-white shadow-sm">
                {slot.id}
              </span>
              <span className="whitespace-nowrap">{slot.name}</span>
            </div>
            <div className="rounded-2xl border-2 border-[#a8d9c8] bg-white/95 p-2 transition-shadow">
              <input
                id={getSlotInputId(slot.id)}
                type="text"
                tabIndex={parseInt(slot.id, 10)}
                className={`h-11 w-32 rounded-xl border px-4 text-center text-sm text-slate-700 outline-none transition ${
                  error
                    ? "border-red-300 bg-red-50 focus:border-red-400"
                    : "border-[#d7ebe2] bg-[#fcfefd] focus:border-tarot-green focus:ring-2 focus:ring-emerald-100"
                }`}
                value={slotInputs[slot.id] ?? ""}
                onChange={(e) => onSlotInputChange(slot.id, e.target.value)}
                placeholder="输入牌名，逆位以-结尾"
                aria-label={`位置 ${slot.id} ${slot.name}`}
                aria-invalid={!!error}
                aria-describedby={error ? `${getSlotInputId(slot.id)}-error` : undefined}
              />
            </div>
            {error ? (
              <p
                id={`${getSlotInputId(slot.id)}-error`}
                className="mt-1 max-w-36 text-center text-xs text-red-500"
                role="alert"
              >
                {error}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
