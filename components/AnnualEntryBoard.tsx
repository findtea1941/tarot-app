"use client";

import type { SpreadLayout } from "@/lib/spreadTypes";
import { getSlotInputId } from "./SlotStack";
import { HOUSE_IDS, getAnnualHouseDates } from "@/layouts/annual";

type AnnualEntryBoardProps = {
  layout: SpreadLayout;
  slotInputs: Record<string, string>;
  onSlotInputChange: (slotId: string, value: string) => void;
  /** 批量填入多格（用于从 Excel 粘贴）；key 为 slotId，value 为牌名 */
  onBulkSlotInputChange?: (updates: Record<string, string>) => void;
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
  onBulkSlotInputChange,
  slotErrors = {},
  clientBirthday = "",
  readingStartMonth = "",
}: AnnualEntryBoardProps) {
  if (layout.id !== "annual-17" || layout.slots.length < 17) return null;

  const houseDatesRaw =
    clientBirthday && readingStartMonth
      ? getAnnualHouseDates(clientBirthday, readingStartMonth)
      : {};
  const formatYYMMDD = (full: string) => {
    if (!full) return "—";
    const [y, m, d] = full.split("-");
    const yy = y && y.length >= 2 ? y.slice(-2) : y;
    return yy && m && d ? `${yy}-${m}-${d}` : full;
  };

  const slots = layout.slots;
  const slotOrder = slots.map((s) => s.id);

  /** 从 Excel/表格粘贴：按行按列解析，取前 17 格依次填入 */
  const handlePaste = (e: React.ClipboardEvent) => {
    if (!onBulkSlotInputChange) return;
    const text = e.clipboardData.getData("text/plain");
    if (!text.trim()) return;
    const rows = text.split(/\r?\n/).map((row) => row.split(/\t/));
    const values: string[] = [];
    for (const row of rows) {
      for (const cell of row) {
        values.push(String(cell).trim());
        if (values.length >= 17) break;
      }
      if (values.length >= 17) break;
    }
    if (values.length === 0) return;
    const updates: Record<string, string> = {};
    slotOrder.slice(0, values.length).forEach((slotId, i) => {
      updates[slotId] = values[i];
    });
    onBulkSlotInputChange(updates);
    e.preventDefault();
  };

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
    <div
      className="mx-auto w-full max-w-[1460px] rounded-xl bg-white"
      onPaste={handlePaste}
    >
      <table className="w-full table-fixed border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-[#a8d9c8]">
            {slots.map((slot) => (
              <th
                key={slot.id}
                className="min-w-[82px] whitespace-nowrap border-b-2 border-[#a8d9c8] bg-[#f5fbf8] px-3 py-2.5 text-center text-sm font-semibold text-tarot-green"
              >
                {slot.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* 日期行：与宫位垂直对齐，在输入行上方 */}
          <tr>
            {slots.map((slot) => (
              <td
                key={slot.id}
                className="border-b border-[#a8d9c8] px-2 py-1.5 text-center text-xs text-slate-500"
              >
                {HOUSE_IDS.includes(slot.id as (typeof HOUSE_IDS)[number])
                  ? formatYYMMDD(houseDatesRaw[slot.id] ?? "")
                  : ""}
              </td>
            ))}
          </tr>
          {/* 输入行 */}
          <tr>
            {slots.map((slot, index) => {
              const error = slotErrors[slot.id];
              return (
                <td
                  key={slot.id}
                  className="border-b-2 border-[#a8d9c8] px-2 py-2 align-top"
                >
                  <input
                    id={getSlotInputId(slot.id)}
                    type="text"
                    className={`h-12 w-full rounded-lg border px-3 py-2 text-center text-sm text-slate-700 outline-none transition ${
                      error
                        ? "border-red-300 bg-red-50 focus:border-red-400"
                        : "border-[#a8d9c8] bg-[#fcfefd] focus:border-tarot-green focus:ring-1 focus:ring-emerald-100"
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
        </tbody>
      </table>
    </div>
  );
}
