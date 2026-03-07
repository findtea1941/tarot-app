import type { SpreadLayout } from "@/lib/spreadTypes";

/** 二择一牌阵 5 张：现状、A发展、B发展、A结果、B结果 */
export const chooseOneLayout: SpreadLayout = {
  id: "choose-one-5",
  name: "二择一",
  grid: { cols: 5, rows: 3, gapPx: 24 },
  slots: [
    { id: "1", name: "现状", meaning: "现状", at: { col: 3, row: 3 } },
    { id: "2", name: "选项A发展", meaning: "选项A发展", at: { col: 2, row: 2 } },
    { id: "3", name: "选项B发展", meaning: "选项B发展", at: { col: 4, row: 2 } },
    { id: "4", name: "选项A结果", meaning: "选项A结果", at: { col: 1, row: 1 } },
    { id: "5", name: "选项B结果", meaning: "选项B结果", at: { col: 5, row: 1 } },
  ],
};
