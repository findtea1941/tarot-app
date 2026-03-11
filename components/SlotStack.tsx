"use client";

import type { SlotDef } from "@/lib/spreadTypes";
import { SlotBadge } from "./SlotBadge";

const INPUT_ID_PREFIX = "slot-input-";

export function getSlotInputId(slotId: string): string {
  return `${INPUT_ID_PREFIX}${slotId}`;
}

type SlotStackProps = {
  slot: SlotDef;
  value: string;
  onChange: (value: string) => void;
  /** 校验错误文案，显示在输入框下方 */
  error?: string;
  /** Tab 切换顺序，按牌号 1→2→3… 设置 */
  tabIndex?: number;
};

/**
 * 单个卡位垂直堆叠：上方牌背/牌框（圈号+位置名称徽标），下方输入框
 */
export function SlotStack({ slot, value, onChange, error, tabIndex }: SlotStackProps) {
  const inputId = getSlotInputId(slot.id);
  return (
    <div className="flex min-h-[140px] min-w-[80px] flex-col gap-2">
      <div className="relative flex min-h-[100px] flex-1 flex-col rounded-2xl border border-[#d6ebe2] bg-white/90 p-2 shadow-sm">
        <SlotBadge index={slot.id} name={slot.name} dimmed={false} />
        <div className="mt-6 flex flex-1 items-center justify-center rounded-xl border border-dashed border-[#d2e9df] bg-[#f6fbf8] px-1 py-2">
          <span className="text-xs text-slate-400">牌背</span>
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        <input
          id={inputId}
          type="text"
          tabIndex={tabIndex}
          className={`w-full rounded-xl border px-3 py-2 text-xs text-slate-700 placeholder-slate-400 outline-none transition ${
            error
              ? "border-red-300 bg-red-50 focus:border-red-400"
              : "border-[#d6ebe2] bg-white focus:border-tarot-green focus:ring-2 focus:ring-emerald-100"
          }`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="输入牌名，逆位以-结尾"
          aria-label={`位置 ${slot.id} ${slot.name}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-red-500" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
