"use client";

import type { SpreadLayout, SlotDef } from "@/lib/spreadTypes";
import { getSlotInputId } from "./SlotStack";
import { getAnnualHouseDates } from "@/layouts/annual";
import { STARFORTUNE_HOUSE_IDS, STARFORTUNE_SLOT_ORDER } from "@/layouts/starFortune";

type StarFortuneEntryBoardProps = {
  layout: SpreadLayout;
  slotInputs: Record<string, string>;
  onSlotInputChange: (slotId: string, value: string) => void;
  onBulkSlotInputChange?: (updates: Record<string, string>) => void;
  slotErrors?: Record<string, string>;
  clientBirthday?: string;
  readingStartMonth?: string;
};

function renderSlotInput(
  slot: SlotDef,
  index: number,
  slotInputs: Record<string, string>,
  slotErrors: Record<string, string>,
  onSlotInputChange: (slotId: string, value: string) => void,
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, index: number) => void
) {
  const error = slotErrors[slot.id];
  return (
    <td
      key={slot.id}
      className="border-b-2 border-[#a8d9c8] px-2 py-2 align-top"
    >
      <input
        id={getSlotInputId(slot.id)}
        type="text"
        className={
          error
            ? "h-12 w-full rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-center text-sm text-slate-700 outline-none transition focus:border-red-400"
            : "h-12 w-full rounded-lg border border-[#a8d9c8] bg-[#fcfefd] px-3 py-2 text-center text-sm text-slate-700 outline-none transition focus:border-tarot-green focus:ring-1 focus:ring-emerald-100"
        }
        value={slotInputs[slot.id] ?? ""}
        onChange={(e) => onSlotInputChange(slot.id, e.target.value)}
        onKeyDown={(e) => onKeyDown(e, index)}
        placeholder="牌名，逆位以-结尾"
        aria-label={slot.name}
        aria-invalid={!!error}
      />
      {error ? (
        <p className="mt-0.5 text-xs text-red-500" role="alert">
          {error}
        </p>
      ) : null}
    </td>
  );
}

/** 星运牌阵录入：23 格，第一行七星牌、第二行十二宫+四元素；支持 Excel 粘贴；十二宫下方显示年-月-日（与年运一致） */
export function StarFortuneEntryBoard({
  layout,
  slotInputs,
  onSlotInputChange,
  onBulkSlotInputChange,
  slotErrors = {},
  clientBirthday = "",
  readingStartMonth = "",
}: StarFortuneEntryBoardProps) {
  if (layout.id !== "starfortune-23" || layout.slots.length < 23) return null;

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

  const slotOrder = [...STARFORTUNE_SLOT_ORDER];
  const row1Slots = layout.slots.filter((s) => ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"].includes(s.id));
  const row2Slots = layout.slots.filter((s) => !row1Slots.some((r) => r.id === s.id));

  const handlePaste = (e: React.ClipboardEvent) => {
    if (!onBulkSlotInputChange) return;
    const text = e.clipboardData.getData("text/plain");
    if (!text.trim()) return;
    const rows = text.split(/\r?\n/).map((row) => row.split(/\t/));
    const values: string[] = [];
    for (const row of rows) {
      for (const cell of row) {
        values.push(String(cell).trim());
        if (values.length >= 23) break;
      }
      if (values.length >= 23) break;
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
    if (e.shiftKey) return;
    const next = index + 1;
    if (next < slotOrder.length) {
      e.preventDefault();
      const nextId = getSlotInputId(slotOrder[next]);
      document.getElementById(nextId)?.focus();
    }
  };

  const allSlots = [...row1Slots, ...row2Slots];

  return (
    <div
      className="mx-auto w-full max-w-[1600px] rounded-xl bg-white"
      onPaste={handlePaste}
    >
      <table className="w-full table-fixed border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-[#a8d9c8]">
            {row1Slots.map((slot) => (
              <th
                key={slot.id}
                className="min-w-[72px] whitespace-nowrap border-b-2 border-[#a8d9c8] bg-[#f5fbf8] px-2 py-2.5 text-center text-sm font-semibold text-tarot-green"
              >
                {slot.name}
              </th>
            ))}
            {row2Slots.map((slot) => (
              <th
                key={slot.id}
                className="min-w-[72px] whitespace-nowrap border-b-2 border-[#a8d9c8] bg-[#f5fbf8] px-2 py-2.5 text-center text-sm font-semibold text-tarot-green"
              >
                {slot.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {row1Slots.map((slot) => (
              <td key={slot.id} className="border-b border-[#a8d9c8] px-2 py-1.5 text-center text-xs text-slate-500" />
            ))}
            {row2Slots.map((slot) => (
              <td
                key={slot.id}
                className="border-b border-[#a8d9c8] px-2 py-1.5 text-center text-xs text-slate-500"
              >
                {STARFORTUNE_HOUSE_IDS.includes(slot.id as (typeof STARFORTUNE_HOUSE_IDS)[number])
                  ? formatYYMMDD(houseDatesRaw[slot.id] ?? "")
                  : ""}
              </td>
            ))}
          </tr>
          <tr>
            {allSlots.map((slot, idx) =>
              renderSlotInput(slot, idx, slotInputs, slotErrors, onSlotInputChange, handleKeyDown)
            )}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
