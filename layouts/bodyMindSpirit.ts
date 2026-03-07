import type { SpreadLayout } from "@/lib/spreadTypes";

/** 身心灵牌阵 3 张：灵阶、心阶、身阶 */
export const bodyMindSpiritLayout: SpreadLayout = {
  id: "body-mind-spirit-3",
  name: "身心灵",
  grid: { cols: 3, rows: 2, gapPx: 24 },
  slots: [
    { id: "1", name: "灵阶", meaning: "灵阶", at: { col: 2, row: 1 } },
    { id: "2", name: "心阶", meaning: "心阶", at: { col: 1, row: 2 } },
    { id: "3", name: "身阶", meaning: "身阶", at: { col: 3, row: 2 } },
  ],
};
