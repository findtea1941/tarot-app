"use client";

import type { SpreadLayout } from "@/lib/spreadTypes";
import { getSlotInputId } from "./SlotStack";

const CHOOSE_ONE_NODE_ORDER = ["4", "5", "2", "3", "1"] as const;

/** 二择一：上排结果，中排发展，下排现状 */
const NODE_COORDS: Record<string, [number, number]> = {
  "4": [0.36, 0.18],
  "5": [0.64, 0.18],
  "2": [0.4, 0.47],
  "3": [0.6, 0.47],
  "1": [0.5, 0.78],
};

type ChooseOneEntryBoardProps = {
  layout: SpreadLayout;
  slotInputs: Record<string, string>;
  onSlotInputChange: (slotId: string, value: string) => void;
  slotErrors?: Record<string, string>;
};

export function ChooseOneEntryBoard({
  layout,
  slotInputs,
  onSlotInputChange,
  slotErrors = {},
}: ChooseOneEntryBoardProps) {
  if (layout.id !== "choose-one-5" || layout.slots.length < 5) return null;

  const slotsById = Object.fromEntries(layout.slots.map((slot) => [slot.id, slot]));

  return (
    <div className="relative mx-auto w-full max-w-5xl px-2" style={{ aspectRatio: "2.35" }}>
      {CHOOSE_ONE_NODE_ORDER.map((slotId) => {
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
