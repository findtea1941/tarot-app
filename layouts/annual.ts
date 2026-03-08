import type { SpreadLayout } from "@/lib/spreadTypes";

/** 年运牌阵 17 张：个人指示牌、一宫～十二宫、火土风水四元素 */
export const annualLayout: SpreadLayout = {
  id: "annual-17",
  name: "年运",
  grid: { cols: 17, rows: 2, gapPx: 12 },
  slots: [
    { id: "significator", name: "个人指示牌", meaning: "个人指示牌", at: { col: 1, row: 1 } },
    { id: "1", name: "一宫", meaning: "一宫", at: { col: 2, row: 1 } },
    { id: "2", name: "二宫", meaning: "二宫", at: { col: 3, row: 1 } },
    { id: "3", name: "三宫", meaning: "三宫", at: { col: 4, row: 1 } },
    { id: "4", name: "四宫", meaning: "四宫", at: { col: 5, row: 1 } },
    { id: "5", name: "五宫", meaning: "五宫", at: { col: 6, row: 1 } },
    { id: "6", name: "六宫", meaning: "六宫", at: { col: 7, row: 1 } },
    { id: "7", name: "七宫", meaning: "七宫", at: { col: 8, row: 1 } },
    { id: "8", name: "八宫", meaning: "八宫", at: { col: 9, row: 1 } },
    { id: "9", name: "九宫", meaning: "九宫", at: { col: 10, row: 1 } },
    { id: "10", name: "十宫", meaning: "十宫", at: { col: 11, row: 1 } },
    { id: "11", name: "十一宫", meaning: "十一宫", at: { col: 12, row: 1 } },
    { id: "12", name: "十二宫", meaning: "十二宫", at: { col: 13, row: 1 } },
    { id: "fire", name: "火元素", meaning: "火元素", at: { col: 14, row: 1 } },
    { id: "earth", name: "土元素", meaning: "土元素", at: { col: 15, row: 1 } },
    { id: "air", name: "风元素", meaning: "风元素", at: { col: 16, row: 1 } },
    { id: "water", name: "水元素", meaning: "水元素", at: { col: 17, row: 1 } },
  ],
};

/** 宫位顺序（1～12），用于计算日期 */
export const HOUSE_IDS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] as const;

/**
 * 根据案主生日(MM-DD)和看盘起始月(YYYY-MM)计算十二宫每宫对应的年-月-日。
 * 一宫=出生月日(1月X日)，二宫=2月X日，…；看盘起始月落在的宫位为该年起点，顺推12个月。
 */
export function getAnnualHouseDates(
  clientBirthday: string,
  readingStartMonth: string
): Record<string, string> {
  const parts = clientBirthday.trim().split("-").map((s) => parseInt(s, 10));
  const mm = parts[0];
  const dd = parts[1] ?? 1;
  const [yStr, mStr] = readingStartMonth.trim().split("-");
  const year = parseInt(yStr, 10);
  const startMonth = parseInt(mStr, 10);
  if (Number.isNaN(mm) || Number.isNaN(dd) || Number.isNaN(year) || Number.isNaN(startMonth))
    return {};
  const result: Record<string, string> = {};
  for (let h = 1; h <= 12; h++) {
    const houseYear = h >= startMonth ? year : year + 1;
    const m = String(h).padStart(2, "0");
    const d = String(dd).padStart(2, "0");
    result[String(h)] = `${houseYear}-${m}-${d}`;
  }
  return result;
}
