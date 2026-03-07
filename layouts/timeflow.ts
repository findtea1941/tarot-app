import type { SpreadLayout } from "@/lib/spreadTypes";

/** 时间流牌阵 3 张：过去、现在、未来 */
export const timeflowLayout: SpreadLayout = {
  id: "timeflow-3",
  name: "时间流",
  grid: { cols: 3, rows: 1, gapPx: 24 },
  slots: [
    { id: "1", name: "过去", meaning: "过去", at: { col: 1, row: 1 } },
    { id: "2", name: "现在", meaning: "现在", at: { col: 2, row: 1 } },
    { id: "3", name: "未来", meaning: "未来", at: { col: 3, row: 1 } },
  ],
};
