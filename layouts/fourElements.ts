import type { SpreadLayout } from "@/lib/spreadTypes";

/** 四元素牌阵 4 张：火、风、土、水 */
export const fourElementsLayout: SpreadLayout = {
  id: "four-elements-4",
  name: "四元素",
  grid: { cols: 3, rows: 3, gapPx: 24 },
  slots: [
    { id: "1", name: "火", meaning: "火", at: { col: 2, row: 1 } },
    { id: "2", name: "风", meaning: "风", at: { col: 1, row: 2 } },
    { id: "3", name: "土", meaning: "土", at: { col: 3, row: 2 } },
    { id: "4", name: "水", meaning: "水", at: { col: 2, row: 3 } },
  ],
};
