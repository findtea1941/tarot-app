/**
 * 九宫格分析条目配置
 * 位置 1-9 对应索引 0-8
 * 展示格式：去掉数字，只显示牌名；骑士位格式为 牌名【牌+牌】
 */
export interface NineGridEntry {
  id: string;
  label: string;
  /** 根据 cards 数组生成展示标签的函数 */
  getLabel: (cards: string[]) => string;
}

function joinCards(cards: string[], indices: number[], sep = "-"): string {
  return indices
    .map((i) => cards[i] ?? "?")
    .filter(Boolean)
    .join(sep);
}

export const NINE_GRID_ENTRIES: NineGridEntry[] = [
  {
    id: "core",
    label: "核心牌",
    getLabel: (c) => c[4] ?? "?",
  },
  {
    id: "highDim",
    label: "高维",
    getLabel: (c) => joinCards(c, [0, 1, 2]),
  },
  {
    id: "midDim",
    label: "中维",
    getLabel: (c) => joinCards(c, [3, 4, 5]),
  },
  {
    id: "lowDim",
    label: "低维",
    getLabel: (c) => joinCards(c, [6, 7, 8]),
  },
  {
    id: "col1",
    label: "第一列",
    getLabel: (c) => joinCards(c, [0, 3, 6]),
  },
  {
    id: "col2",
    label: "第二列",
    getLabel: (c) => joinCards(c, [1, 4, 7]),
  },
  {
    id: "col3",
    label: "第三列",
    getLabel: (c) => joinCards(c, [2, 5, 8]),
  },
  {
    id: "knight1",
    label: "1骑士位",
    getLabel: (c) => `${c[0] ?? "?"}【${joinCards(c, [5, 7], "+")}】`,
  },
  {
    id: "knight3",
    label: "3骑士位",
    getLabel: (c) => `${c[2] ?? "?"}【${joinCards(c, [3, 7], "+")}】`,
  },
  {
    id: "knight7",
    label: "7骑士位",
    getLabel: (c) => `${c[6] ?? "?"}【${joinCards(c, [1, 5], "+")}】`,
  },
  {
    id: "knight9",
    label: "9骑士位",
    getLabel: (c) => `${c[8] ?? "?"}【${joinCards(c, [1, 3], "+")}】`,
  },
  {
    id: "overall",
    label: "整体分析",
    getLabel: () => "",
  },
];

/** 线性三张 A B C，索引 0 1 2 */
export interface LinearEntry {
  id: string;
  label: string;
  getLabel: (cards: string[]) => string;
}

function joinCardsSep(cards: string[], indices: number[], sep: string): string {
  return indices
    .map((i) => cards[i] ?? "?")
    .filter(Boolean)
    .join(sep);
}

/** 线性三张：核心牌带「核心牌：」前缀，其余只显示牌名组合 */
export const LINEAR_3_ENTRIES: LinearEntry[] = [
  { id: "core", label: "核心牌", getLabel: (c) => c[1] ?? "?" },
  { id: "ab", label: "", getLabel: (c) => joinCardsSep(c, [0, 1], "+") },
  { id: "bc", label: "", getLabel: (c) => joinCardsSep(c, [1, 2], "+") },
  { id: "acMirror", label: "", getLabel: (c) => `${c[0] ?? "?"}-${c[2] ?? "?"} 镜像` },
  { id: "overall", label: "整体分析", getLabel: () => "" },
];

/** 线性五张：核心牌带「核心牌：」前缀，其余只显示牌名组合 */
export const LINEAR_5_ENTRIES: LinearEntry[] = [
  { id: "core", label: "核心牌", getLabel: (c) => c[2] ?? "?" },
  { id: "abc", label: "", getLabel: (c) => joinCardsSep(c, [0, 2, 4], "+") },
  { id: "axb", label: "", getLabel: (c) => joinCardsSep(c, [0, 1, 2], "+") },
  { id: "xby", label: "", getLabel: (c) => joinCardsSep(c, [1, 2, 3], "+") },
  { id: "byc", label: "", getLabel: (c) => joinCardsSep(c, [2, 3, 4], "+") },
  { id: "acMirror", label: "", getLabel: (c) => `${c[0] ?? "?"}-${c[4] ?? "?"} 镜像` },
  { id: "abMirror", label: "", getLabel: (c) => `${c[0] ?? "?"}-${c[2] ?? "?"} 镜像` },
  { id: "xyMirror", label: "", getLabel: (c) => `${c[1] ?? "?"}-${c[3] ?? "?"} 镜像` },
  { id: "bcMirror", label: "", getLabel: (c) => `${c[2] ?? "?"}-${c[4] ?? "?"} 镜像` },
  { id: "overall", label: "整体分析", getLabel: () => "" },
];
