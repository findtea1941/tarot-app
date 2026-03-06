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
};

/**
 * 单个卡位垂直堆叠：上方牌背/牌框（圈号+位置名称徽标），下方输入框
 */
export function SlotStack({ slot, value, onChange, error }: SlotStackProps) {
  const inputId = getSlotInputId(slot.id);
  return (
    <div className="flex min-h-[140px] min-w-[80px] flex-col gap-2">
      <div className="relative flex flex-1 min-h-[100px] flex-col rounded-lg border border-slate-600 bg-slate-800/80 p-2">
        <SlotBadge index={slot.id} name={slot.name} dimmed={false} />
        <div className="mt-6 flex flex-1 items-center justify-center rounded border border-dashed border-slate-600 bg-slate-900/50 px-1 py-2">
          <span className="text-xs text-slate-500">牌背</span>
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        <input
          id={inputId}
          type="text"
          className={`w-full rounded border px-2 py-1.5 text-xs text-slate-100 placeholder-slate-500 ${
            error ? "border-red-500 bg-red-950/30" : "border-slate-600 bg-slate-900"
          }`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="输入牌名，逆位以-结尾"
          aria-label={`位置 ${slot.id} ${slot.name}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
