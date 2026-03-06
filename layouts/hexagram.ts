import type { SpreadLayout } from "@/lib/spreadTypes";

/** 六芒星牌阵 7 张 */
export const hexagramLayout: SpreadLayout = {
  id: "hexagram-7",
  name: "六芒星",
  grid: { cols: 7, rows: 7, gapPx: 16 },
  slots: [
    { id: "1", name: "过去", meaning: "过去", at: { col: 4, row: 7 } },
    { id: "2", name: "现在", meaning: "现在", at: { col: 2, row: 2 } },
    { id: "3", name: "未来", meaning: "未来", at: { col: 6, row: 2 } },
    { id: "4", name: "阻碍", meaning: "阻碍", at: { col: 4, row: 1 } },
    { id: "5", name: "环境", meaning: "环境", at: { col: 2, row: 5 } },
    { id: "6", name: "策略", meaning: "策略", at: { col: 6, row: 5 } },
    { id: "7", name: "更好的结果", meaning: "更好的结果", at: { col: 4, row: 4 } },
  ],
};
