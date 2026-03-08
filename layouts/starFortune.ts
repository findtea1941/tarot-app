import type { SpreadLayout } from "@/lib/spreadTypes";

/** 星运牌阵 23 张：七星牌（日月水金火木土）、一宫～十二宫、火土风水四元素 */
export const starFortuneLayout: SpreadLayout = {
  id: "starfortune-23",
  name: "星运",
  grid: { cols: 16, rows: 2, gapPx: 12 },
  slots: [
    { id: "sun", name: "太阳", meaning: "太阳", at: { col: 1, row: 1 } },
    { id: "moon", name: "月亮", meaning: "月亮", at: { col: 2, row: 1 } },
    { id: "mercury", name: "水星", meaning: "水星", at: { col: 3, row: 1 } },
    { id: "venus", name: "金星", meaning: "金星", at: { col: 4, row: 1 } },
    { id: "mars", name: "火星", meaning: "火星", at: { col: 5, row: 1 } },
    { id: "jupiter", name: "木星", meaning: "木星", at: { col: 6, row: 1 } },
    { id: "saturn", name: "土星", meaning: "土星", at: { col: 7, row: 1 } },
    { id: "1", name: "一宫", meaning: "一宫", at: { col: 1, row: 2 } },
    { id: "2", name: "二宫", meaning: "二宫", at: { col: 2, row: 2 } },
    { id: "3", name: "三宫", meaning: "三宫", at: { col: 3, row: 2 } },
    { id: "4", name: "四宫", meaning: "四宫", at: { col: 4, row: 2 } },
    { id: "5", name: "五宫", meaning: "五宫", at: { col: 5, row: 2 } },
    { id: "6", name: "六宫", meaning: "六宫", at: { col: 6, row: 2 } },
    { id: "7", name: "七宫", meaning: "七宫", at: { col: 7, row: 2 } },
    { id: "8", name: "八宫", meaning: "八宫", at: { col: 8, row: 2 } },
    { id: "9", name: "九宫", meaning: "九宫", at: { col: 9, row: 2 } },
    { id: "10", name: "十宫", meaning: "十宫", at: { col: 10, row: 2 } },
    { id: "11", name: "十一宫", meaning: "十一宫", at: { col: 11, row: 2 } },
    { id: "12", name: "十二宫", meaning: "十二宫", at: { col: 12, row: 2 } },
    { id: "fire", name: "火元素", meaning: "火元素", at: { col: 13, row: 2 } },
    { id: "earth", name: "土元素", meaning: "土元素", at: { col: 14, row: 2 } },
    { id: "air", name: "风元素", meaning: "风元素", at: { col: 15, row: 2 } },
    { id: "water", name: "水元素", meaning: "水元素", at: { col: 16, row: 2 } },
  ],
};

/** 星运牌阵 slot 顺序：七星位、十二宫、四元素（与飞宫链起点顺序一致） */
export const STARFORTUNE_SLOT_ORDER = [
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn",
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12",
  "fire", "earth", "air", "water",
] as const;

export const STARFORTUNE_HOUSE_IDS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] as const;
