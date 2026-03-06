"use client";

import type { SlotDef } from "@/lib/spreadTypes";
import type { SpreadSlotState } from "@/lib/spreadTypes";
import { SlotBadge } from "./SlotBadge";

type SlotCardProps = {
  slot: SlotDef;
  state: SpreadSlotState | undefined;
  onClick: () => void;
  showMeaning?: boolean;
};

/**
 * 单个卡位：徽标 + 牌框（空/已选）+ 可选 meaning
 */
export function SlotCard({ slot, state, onClick, showMeaning = true }: SlotCardProps) {
  const hasCard = Boolean(state?.cardId ?? state?.cardName);
  const displayName = state?.cardName
    ? state.reversed
      ? `${state.cardName}-`
      : state.cardName
    : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex min-h-[120px] min-w-[72px] flex-col rounded-2xl border border-[#d6ebe2] bg-white/90 p-2 text-left transition hover:border-[#b7dbc9] hover:bg-[#fbfefd] focus:outline-none focus:ring-2 focus:ring-emerald-100"
    >
      <SlotBadge index={slot.id} name={slot.name} dimmed={hasCard} />

      <div className="mt-6 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#d2e9df] bg-[#f6fbf8] px-1 py-2">
        {displayName ? (
          <span className="text-center text-sm font-medium text-slate-800">
            {displayName}
          </span>
        ) : (
          <span className="text-xs text-slate-400">未选牌</span>
        )}
      </div>

      {showMeaning && slot.meaning && (
        <div className="mt-1 truncate text-[10px] text-slate-500" title={slot.meaning}>
          {slot.meaning}
        </div>
      )}
    </button>
  );
}
