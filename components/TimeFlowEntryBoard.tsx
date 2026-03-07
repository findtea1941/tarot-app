"use client";

import type { SpreadLayout } from "@/lib/spreadTypes";
import { getSlotInputId } from "./SlotStack";

type TimeFlowEntryBoardProps = {
  layout: SpreadLayout;
  slotInputs: Record<string, string>;
  onSlotInputChange: (slotId: string, value: string) => void;
  slotErrors?: Record<string, string>;
};

/** 时间流牌阵录入：三张牌横向排列，视觉与六芒星一致 */
export function TimeFlowEntryBoard({
  layout,
  slotInputs,
  onSlotInputChange,
  slotErrors = {},
}: TimeFlowEntryBoardProps) {
  if (layout.id !== "timeflow-3" || layout.slots.length < 3) return null;

  const slots = layout.slots;
  const isCenter = (id: string) => id === "2";

  return (
    <div className="relative mx-auto w-full max-w-5xl px-2" style={{ aspectRatio: "3.44" }}>
      <div className="absolute inset-0 flex items-center justify-center gap-12 -translate-y-[6%]">
        {slots.map((slot) => {
          const error = slotErrors[slot.id];
          const center = isCenter(slot.id);
          return (
            <div
              key={slot.id}
              className="flex flex-col items-center"
            >
              <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-tarot-green">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-tarot-green text-xs text-white shadow-sm">
                  {slot.id}
                </span>
                <span className="whitespace-nowrap">{slot.name}</span>
              </div>
              <div
                className={`rounded-2xl border bg-white/95 p-2 shadow-sm transition-shadow ${
                  center
                    ? "border-[#b7e6d2] shadow-[0_10px_24px_rgba(5,150,105,0.12)]"
                    : "border-[#cfeee0]"
                }`}
              >
                <input
                  id={getSlotInputId(slot.id)}
                  type="text"
                  className={`h-11 rounded-xl border px-4 text-center text-sm text-slate-700 outline-none transition ${
                    center ? "w-36" : "w-32"
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
    </div>
  );
}
