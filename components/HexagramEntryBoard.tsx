"use client";

import type { SpreadLayout } from "@/lib/spreadTypes";
import { getSlotInputId } from "./SlotStack";

const HEXAGRAM_NODE_ORDER = ["4", "2", "3", "7", "5", "6", "1"] as const;

/** 节点比例坐标 [x,y] 0~1；已向中心收 1/3 更紧凑 */
const NODE_COORDS: Record<string, [number, number]> = {
  "4": [0.5, 0.22],
  "2": [0.287, 0.367],
  "3": [0.713, 0.367],
  "7": [0.5, 0.5],
  "5": [0.287, 0.647],
  "6": [0.713, 0.647],
  "1": [0.5, 0.767],
};

type HexagramEntryBoardProps = {
  layout: SpreadLayout;
  slotInputs: Record<string, string>;
  onSlotInputChange: (slotId: string, value: string) => void;
  slotErrors?: Record<string, string>;
};

export function HexagramEntryBoard({
  layout,
  slotInputs,
  onSlotInputChange,
  slotErrors = {},
}: HexagramEntryBoardProps) {
  if (layout.id !== "hexagram-7" || layout.slots.length < 7) return null;

  const slotsById = Object.fromEntries(layout.slots.map((slot) => [slot.id, slot]));

  return (
    <div className="relative mx-auto w-full max-w-5xl px-2" style={{ aspectRatio: "1.72" }}>
      {HEXAGRAM_NODE_ORDER.map((slotId) => {
        const slot = slotsById[slotId];
        if (!slot) return null;

        const [x, y] = NODE_COORDS[slotId] ?? [0.5, 0.5];
        const error = slotErrors[slotId];
        const isCenter = slotId === "7";

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
            <div
              className={`rounded-2xl border-2 bg-white/95 p-2 transition-shadow ${
                isCenter
                  ? "border-[#a8d9c8] shadow-[0_10px_24px_rgba(5,150,105,0.12)]"
                  : "border-[#a8d9c8]"
              }`}
            >
              <input
                id={getSlotInputId(slot.id)}
                type="text"
                tabIndex={parseInt(slot.id, 10)}
                className={`h-11 rounded-xl border px-4 text-center text-sm text-slate-700 outline-none transition ${
                  isCenter ? "w-36" : "w-32"
                } ${
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
