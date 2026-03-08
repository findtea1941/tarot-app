"use client";

import type { SpreadSlotState } from "@/lib/spreadTypes";
import { HOUSE_IDS, getAnnualHouseDates } from "@/layouts/annual";

const SLOT_NAMES: Record<string, string> = {
  significator: "个人指示牌",
  "1": "一宫", "2": "二宫", "3": "三宫", "4": "四宫", "5": "五宫", "6": "六宫",
  "7": "七宫", "8": "八宫", "9": "九宫", "10": "十宫", "11": "十一宫", "12": "十二宫",
  fire: "火元素", earth: "土元素", air: "风元素", water: "水元素",
};

const ORDER = [
  "significator", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12",
  "fire", "earth", "air", "water",
];

type AnnualReviewBoardProps = {
  slotStates: Record<string, SpreadSlotState>;
  clientBirthday?: string;
  readingStartMonth?: string;
};

/** 年运牌阵回顾：占位表格，展示 17 格牌名与十二宫日期行 */
export function AnnualReviewBoard({
  slotStates,
  clientBirthday = "",
  readingStartMonth = "",
}: AnnualReviewBoardProps) {
  const houseDates =
    clientBirthday && readingStartMonth
      ? getAnnualHouseDates(clientBirthday, readingStartMonth)
      : {};

  return (
    <div className="mx-auto w-full max-w-6xl overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[#d7ebe2]">
            {ORDER.map((id) => (
              <th
                key={id}
                className="whitespace-nowrap border-b border-[#d7ebe2] bg-[#f5fbf8] px-2 py-2 text-center font-semibold text-tarot-green"
              >
                {SLOT_NAMES[id] ?? id}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {ORDER.map((id) => {
              const state = slotStates[id];
              const text = state?.cardName ? (state.reversed ? `${state.cardName}-` : state.cardName) : "—";
              return (
                <td
                  key={id}
                  className="border-b border-[#e2ebe7] px-2 py-2 text-center text-slate-700"
                >
                  {text}
                </td>
              );
            })}
          </tr>
          <tr>
            <td className="border-b border-[#e2ebe7] px-2 py-1.5 text-center text-xs text-slate-500" />
            {HOUSE_IDS.map((hid) => (
              <td
                key={hid}
                className="border-b border-[#e2ebe7] px-2 py-1.5 text-center text-xs text-slate-500"
              >
                {houseDates[hid] ?? "—"}
              </td>
            ))}
            <td colSpan={4} className="border-b border-[#e2ebe7]" />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
