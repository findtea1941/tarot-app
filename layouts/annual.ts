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
 * 规则：一宫=出生月日，二宫=出生月+1的同日，…轮转至十二宫；看盘起始月落入的宫位为该年起点，从该宫顺时针 12 个月定年。
 */
export function getAnnualHouseDates(
  clientBirthday: string,
  readingStartMonth: string
): Record<string, string> {
  const parts = clientBirthday.trim().split("-").map((s) => parseInt(s, 10));
  const M0 = parts[0]; // 出生月 1..12
  const D = parts[1] ?? 1;
  const [yStr, mStr] = readingStartMonth.trim().split("-");
  const Y0 = parseInt(yStr, 10);
  const M_start = parseInt(mStr, 10);
  if (Number.isNaN(M0) || Number.isNaN(D) || Number.isNaN(Y0) || Number.isNaN(M_start))
    return {};
  const pad = (n: number) => String(n).padStart(2, "0");
  // 宫位 k(1..12) 的月份：一宫=M0，二宫=M0+1，…，十二宫=M0+11 (mod 12)
  const monthOfHouse = (k: number) => ((M0 - 1 + (k - 1)) % 12) + 1;
  // 看盘起始月落在哪一宫
  let K0 = ((M_start - M0 + 1) % 12 + 12) % 12;
  if (K0 === 0) K0 = 12;
  const result: Record<string, string> = {};
  for (let k = 1; k <= 12; k++) {
    const monthIndex = (k - K0 + 12) % 12; // 从起点宫开始的月偏移 0..11
    const calendarMonth = monthOfHouse(k);
    const year = Y0 + Math.floor((M_start - 1 + monthIndex) / 12);
    result[String(k)] = `${year}-${pad(calendarMonth)}-${pad(D)}`;
  }
  return result;
}

const HOUSE_LABELS: Record<number, string> = {
  1: "一宫", 2: "二宫", 3: "三宫", 4: "四宫", 5: "五宫", 6: "六宫",
  7: "七宫", 8: "八宫", 9: "九宫", 10: "十宫", 11: "十一宫", 12: "十二宫",
};

/** 看盘起始月落入的宫位（1～12），与 getAnnualHouseDates 计算一致 */
export function getReadingStartMonthHouse(
  clientBirthday: string,
  readingStartMonth: string
): number | null {
  const parts = clientBirthday.trim().split("-").map((s) => parseInt(s, 10));
  const M0 = parts[0];
  const mStr = readingStartMonth.trim().split("-")[1];
  const M_start = mStr ? parseInt(mStr, 10) : NaN;
  if (Number.isNaN(M0) || Number.isNaN(M_start)) return null;
  let K0 = ((M_start - M0 + 1) % 12 + 12) % 12;
  if (K0 === 0) K0 = 12;
  return K0;
}

/** 宫位数字对应的中文标签 */
export function getHouseLabel(houseNum: number): string {
  return HOUSE_LABELS[houseNum] ?? `${houseNum}宫`;
}
