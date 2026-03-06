"use client";

import { useMemo, useState } from "react";
import type { SpreadLayout } from "@/lib/spreadTypes";
import type { SpreadSlotState } from "@/lib/spreadTypes";
import { SlotCard } from "./SlotCard";
import { SlotStack } from "./SlotStack";

type SlotStatesMap = Record<string, SpreadSlotState>;

type SpreadBoardProps = {
  layout: SpreadLayout;
  /** 展示模式：传入 slotStates + onSlotClick 渲染 SlotCard */
  slotStates?: SlotStatesMap;
  onSlotClick?: (slotId: string) => void;
  /** 录入模式：传入 slotInputs + onSlotInputChange 渲染 SlotStack（牌背+输入框） */
  slotInputs?: Record<string, string>;
  onSlotInputChange?: (slotId: string, value: string) => void;
  /** 录入模式下的校验错误：slotId -> 错误文案 */
  slotErrors?: Record<string, string>;
  /** 移动端窄屏时改用列表视图（仅展示模式） */
  useListView?: boolean;
};

/**
 * 根据 grid + slots 渲染牌阵分布图；支持录入模式（SlotStack）或展示模式（SlotCard）
 */
export function SpreadBoard({
  layout,
  slotStates = {},
  onSlotClick,
  slotInputs = {},
  onSlotInputChange,
  slotErrors = {},
  useListView = false,
}: SpreadBoardProps) {
  const { grid, slots } = layout;
  const [drawerSlotId, setDrawerSlotId] = useState<string | null>(null);
  const isEntryMode = typeof slotInputs === "object" && typeof onSlotInputChange === "function";

  const handleSlotClick = (slotId: string) => {
    if (!onSlotClick) return;
    setDrawerSlotId(slotId);
    onSlotClick(slotId);
  };

  const gridStyle = useMemo(
    () => ({
      display: "grid",
      gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))`,
      gridTemplateRows: `repeat(${grid.rows}, minmax(100px, 1fr))`,
      gap: `${grid.gapPx}px`,
    }),
    [grid]
  );

  if (useListView && !isEntryMode) {
    return (
      <div className="space-y-4">
        <ul className="flex flex-col gap-3">
          {slots.map((slot) => (
            <li key={slot.id}>
              <SlotCard
                slot={slot}
                state={slotStates[slot.id]}
                onClick={() => handleSlotClick(slot.id)}
                showMeaning
              />
            </li>
          ))}
        </ul>
        {drawerSlotId && (
          <div
            className="fixed inset-y-0 right-0 z-20 w-64 border-l border-slate-700 bg-slate-900 p-4 shadow-xl"
            role="dialog"
            aria-label="卡位详情"
          >
            <p className="text-sm text-slate-400">选择牌 / 填写该位置解读（占位）</p>
            <p className="mt-2 text-xs text-slate-500">卡位 ID: {drawerSlotId}</p>
            <button
              type="button"
              className="mt-4 text-sm text-tarot-accent hover:underline"
              onClick={() => setDrawerSlotId(null)}
            >
              关闭
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full overflow-auto">
      <div style={gridStyle} className="min-w-[320px]">
        {slots.map((slot) => (
          <div
            key={slot.id}
            style={{
              gridColumn: `${slot.at.col} / span ${slot.at.colSpan ?? 1}`,
              gridRow: `${slot.at.row} / span ${slot.at.rowSpan ?? 1}`,
            }}
            className="flex items-center justify-center"
          >
            {isEntryMode ? (
              <SlotStack
                slot={slot}
                value={slotInputs[slot.id] ?? ""}
                onChange={(value) => onSlotInputChange!(slot.id, value)}
                error={slotErrors[slot.id]}
              />
            ) : (
              <SlotCard
                slot={slot}
                state={slotStates[slot.id]}
                onClick={() => handleSlotClick(slot.id)}
                showMeaning
              />
            )}
          </div>
        ))}
      </div>
      {!isEntryMode && drawerSlotId && (
        <div
          className="fixed inset-y-0 right-0 z-20 w-64 border-l border-slate-700 bg-slate-900 p-4 shadow-xl"
          role="dialog"
          aria-label="卡位详情"
        >
          <p className="text-sm text-slate-400">选择牌 / 填写该位置解读（占位）</p>
          <p className="mt-2 text-xs text-slate-500">卡位 ID: {drawerSlotId}</p>
          <button
            type="button"
            className="mt-4 text-sm text-tarot-accent hover:underline"
            onClick={() => setDrawerSlotId(null)}
          >
            关闭
          </button>
        </div>
      )}
    </div>
  );
}
