"use client";

import type { SpreadLayout } from "@/lib/spreadTypes";
import { getSlotInputId } from "./SlotStack";
import { HOUSE_IDS, getAnnualHouseDates } from "@/layouts/annual";

type AnnualEntryBoardProps = {
  layout: SpreadLayout;
  slotInputs: Record<string, string>;
  onSlotInputChange: (slotId: string, value: string) => void;
  slotErrors?: Record<string, string>;
  /** 案主生日 MM-DD、看盘起始月 YYYY-MM，用于计算十二宫日期 */
  clientBirthday?: string;
  readingStartMonth?: string;
};

/** 年运牌阵录入：17 格表格，支持 Tab 切换；十二宫下方一行显示年-月-日 */
export function AnnualEntryBoard({
  layout,
  slotInputs,
  onSlotInputChange,
  slotErrors = {},
  clientBirthday = "",
  readingStartMonth = "",
}: AnnualEntryBoardProps) {
  if (layout.id !== "annual-17" || layout.slots.length < 17) return null;

  const houseDates =
    clientBirthday && readingStartMonth
      ? getAnnualHouseDates(clientBirthday, readingStartMonth)
      : {};

  const slots = layout.slots;
  const slotOrder = slots.map((s) => s.id);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key !== "Tab") return;
    if (e.shiftKey) return; // 只处理正向 Tab
    const next = index + 1;
    if (next < slotOrder.length) {
      e.preventDefault();
      const nextId = getSlotInputId(slotOrder[next]);
      document.getElementById(nextId)?.focus();
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[#d7ebe2]">
            {slots.map((slot) => (
              <th
                key={slot.id}
                className="whitespace-nowrap border-b border-[#d7ebe2] bg-[#f5fbf8] px-2 py-2 text-center font-semibold text-tarot-green"
              >
                {slot.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {slots.map((slot, index) => {
              const error = slotErrors[slot.id];
              return (
                <td
                  key={slot.id}
                  className="border-b border-[#e2ebe7] px-1 py-1 align-top"
                >
                  <input
                    id={getSlotInputId(slot.id)}
                    type="text"
                    className={`w-full rounded-lg border px-2 py-2 text-center text-slate-700 outline-none transition ${
                      error
                        ? "border-red-300 bg-red-50 focus:border-red-400"
                        : "border-[#d7ebe2] bg-[#fcfefd] focus:border-tarot-green focus:ring-1 focus:ring-emerald-100"
                    }`}
                    value={slotInputs[slot.id] ?? ""}
                    onChange={(e) => onSlotInputChange(slot.id, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    placeholder="牌名，逆位以-结尾"
                    aria-label={`${slot.name}`}
                    aria-invalid={!!error}
                  />
                  {error && (
                    <p className="mt-0.5 text-xs text-red-500" role="alert">
                      {error}
                    </p>
                  )}
                </td>
              );
            })}
          </tr>
          {/* 十二宫日期行 */}
          <tr>
            <td className="border-b border-[#e2ebe7] px-1 py-1.5 text-center text-xs text-slate-500" />
            {HOUSE_IDS.map((hid) => (
              <td
                key={hid}
                className="border-b border-[#e2ebe7] px-1 py-1.5 text-center text-xs text-slate-500"
              >
                {houseDates[hid] ?? "—"}
              </td>
            ))}
            <td colSpan={4} className="border-b border-[#e2ebe7] px-1 py-1.5" />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
