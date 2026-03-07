import type { SpreadLayout } from "@/lib/spreadTypes";

/** 无牌阵 3 张：主牌、副牌1、副牌2 */
export const noSpreadLayout: SpreadLayout = {
  id: "no-spread-3",
  name: "无牌阵",
  grid: { cols: 3, rows: 2, gapPx: 24 },
  slots: [
    { id: "1", name: "主牌", meaning: "主牌", at: { col: 2, row: 1 } },
    { id: "2", name: "副牌1", meaning: "副牌1", at: { col: 1, row: 2 } },
    { id: "3", name: "副牌2", meaning: "副牌2", at: { col: 3, row: 2 } },
  ],
};
