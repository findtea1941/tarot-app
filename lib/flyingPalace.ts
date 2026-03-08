/**
 * 年运牌阵飞宫链：以每张牌为起点，按数据库飞入映射追踪路径，支持大阿分叉、visited 独立、停止判定与转折点标记
 */

import type { Card } from "@/spec/data_models";

export type FlyNode = string; // "1".."12" 宫位 | "fire"|"earth"|"air"|"water" 元素位

const ELEMENT_MAP: Record<string, FlyNode> = { 火: "fire", 土: "earth", 风: "air", 水: "water" };

function elementToNode(el: string | undefined): FlyNode | null {
  if (!el) return null;
  return ELEMENT_MAP[el] ?? null;
}

/** 例外：ACE、侍从飞入元素位；吊人→水，愚者→风，审判→火。其余按 houses 飞入宫位（可双宫分叉） */
export function getFlyTargets(card: Card): FlyNode[] {
  const name = card.name;
  if (name === "愚者") return ["air"];
  if (name === "吊人") return ["water"];
  if (name === "审判") return ["fire"];
  const rank = card.rank;
  if (rank === "ACE" || rank === "侍从") {
    const node = elementToNode(card.element ?? undefined);
    return node ? [node] : [];
  }
  const houses = card.houses;
  if (houses?.length) return houses.map((h) => String(h));
  return [];
}

/** 该牌是否飞入元素位（用于标记转折点） */
export function fliesToElement(card: Card): boolean {
  const name = card.name;
  if (name === "愚者" || name === "吊人" || name === "审判") return true;
  if (card.rank === "ACE" || card.rank === "侍从") return true;
  return false;
}

export interface PathStep {
  node: FlyNode;
  isTurningPoint: boolean;
  isRed?: boolean; // 重复点第一次出现或自回环
}

export interface FlyBranchResult {
  path: PathStep[];
  stopNode: FlyNode | null;
  branchCount: number;
}

export interface FlyChainRow {
  startSlotId: string;
  startLabel: string; // 位置 牌名
  branches: FlyBranchResult[];
  /** 合并后的停止点描述（多分支时取其一或并列） */
  stopLabel: string;
}

export type SlotCardEntry = { card: Card; reversed: boolean };

/** 年运 17 个 slot 顺序 */
const ANNUAL_SLOT_ORDER = [
  "significator", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12",
  "fire", "earth", "air", "water",
];

const SLOT_NAMES: Record<string, string> = {
  significator: "个人指示牌",
  "1": "一宫", "2": "二宫", "3": "三宫", "4": "四宫", "5": "五宫", "6": "六宫",
  "7": "七宫", "8": "八宫", "9": "九宫", "10": "十宫", "11": "十一宫", "12": "十二宫",
  fire: "火元素", earth: "土元素", air: "风元素", water: "水元素",
};

export function getSlotName(slotId: string): string {
  return SLOT_NAMES[slotId] ?? slotId;
}

/** 单分支飞行直到停止，返回路径与停止点；path 中标记转折点与标红 */
function flyOneBranch(
  startNode: FlyNode,
  slotCards: Map<string, SlotCardEntry>,
  getTargets: (node: FlyNode) => FlyNode[],
  isElementFlight: (from: FlyNode, to: FlyNode) => boolean
): FlyBranchResult {
  const path: PathStep[] = [];
  const visited = new Set<FlyNode>([startNode]);
  let current: FlyNode = startNode;
  let stopNode: FlyNode | null = null;

  for (;;) {
    const targets = getTargets(current);
    if (targets.length === 0) {
      stopNode = current;
      break;
    }
    const next = targets[0];
    if (next === current) {
      stopNode = current;
      path.push({ node: current, isTurningPoint: false, isRed: true });
      break;
    }
    if (visited.has(next)) {
      stopNode = current;
      const firstIdx = path.findIndex((p) => p.node === next);
      if (firstIdx >= 0) path[firstIdx] = { ...path[firstIdx], isRed: true };
      break;
    }
    const turning = isElementFlight(current, next);
    path.push({ node: next, isTurningPoint: turning });
    visited.add(next);
    current = next;
  }

  return { path, stopNode, branchCount: 1 };
}

/** 从起点开始飞行，支持大阿双落点分叉；每分支独立 visited */
export function buildFlyChainForStart(
  startSlotId: string,
  slotCards: Map<string, SlotCardEntry>,
  cardByNode: Map<FlyNode, SlotCardEntry>,
  getTargetsForCard: (card: Card) => FlyNode[]
): { branches: FlyBranchResult[]; missingMapping: string | null } {
  const entry = slotCards.get(startSlotId);
  if (!entry) return { branches: [], missingMapping: null };
  const initialTargets = getTargetsForCard(entry.card);
  if (initialTargets.length === 0)
    return { branches: [], missingMapping: `${entry.card.name} 缺少飞宫/元素映射` };

  const isElementFlight = (_from: FlyNode, to: FlyNode): boolean =>
    ["fire", "earth", "air", "water"].includes(to);

  type State = { path: PathStep[]; visited: Set<FlyNode>; current: FlyNode };
  const branches: FlyBranchResult[] = [];
  const queue: State[] = initialTargets.map((next) => ({
    path: [],
    visited: new Set<FlyNode>([startSlotId as FlyNode]),
    current: next,
  }));

  while (queue.length > 0) {
    const state = queue.shift()!;
    const { path, visited, current } = state;
    if (visited.has(current)) {
      const firstIdx = path.findIndex((p) => p.node === current);
      if (firstIdx >= 0) path[firstIdx] = { ...path[firstIdx], isRed: true };
      branches.push({ path: [...path], stopNode: current, branchCount: 1 });
      continue;
    }
    visited.add(current);
    const at = cardByNode.get(current);
    const nextTargets = at ? getTargetsForCard(at.card) : [];
    if (nextTargets.length === 0) {
      branches.push({
        path: [...path, { node: current, isTurningPoint: false }],
        stopNode: current,
        branchCount: 1,
      });
      continue;
    }
    if (nextTargets.length === 1) {
      const next = nextTargets[0];
      if (next === current) {
        branches.push({
          path: [...path, { node: current, isTurningPoint: false, isRed: true }],
          stopNode: current,
          branchCount: 1,
        });
        continue;
      }
      const newPath = [...path, { node: current, isTurningPoint: isElementFlight(current, next) }];
      if (visited.has(next)) {
        const firstIdx = newPath.findIndex((p) => p.node === next);
        if (firstIdx >= 0) newPath[firstIdx] = { ...newPath[firstIdx], isRed: true };
        branches.push({ path: newPath, stopNode: current, branchCount: 1 });
        continue;
      }
      queue.push({ path: newPath, visited: new Set(visited), current: next });
      continue;
    }
    const newPath = [...path, { node: current, isTurningPoint: isElementFlight(current, nextTargets[0]) }];
    for (const next of nextTargets) {
      if (next === current) {
        branches.push({
          path: [...path, { node: current, isTurningPoint: false, isRed: true }],
          stopNode: current,
          branchCount: 1,
        });
        continue;
      }
      queue.push({
        path: [...newPath],
        visited: new Set(visited),
        current: next,
      });
    }
  }

  return { branches, missingMapping: null };
}

/** 构建 17 个起点的飞宫链表格行；若某牌缺映射返回 error 文案 */
export function buildFlyChainTable(
  slotCards: Map<string, SlotCardEntry>
): { rows: FlyChainRow[]; missingMapping: string | null } {
  const cardByNode = new Map<FlyNode, SlotCardEntry>();
  for (const [slotId, entry] of slotCards) {
    cardByNode.set(slotId as FlyNode, entry);
  }

  const rows: FlyChainRow[] = [];
  let missingMapping: string | null = null;

  for (const slotId of ANNUAL_SLOT_ORDER) {
    const entry = slotCards.get(slotId);
    const startLabel = entry
      ? `${getSlotName(slotId)} ${entry.card.name}${entry.reversed ? "-" : ""}`
      : getSlotName(slotId);
    const { branches, missingMapping: err } = buildFlyChainForStart(
      slotId,
      slotCards,
      cardByNode,
      getFlyTargets
    );
    if (err) missingMapping = err;
    const pathToLabel = (steps: PathStep[]) =>
      steps.map((s) => {
        const at = cardByNode.get(s.node);
        const name = at ? `${at.card.name}${at.reversed ? "-" : ""}` : "";
        const pos = getSlotName(s.node);
        let text = `${pos}（${name || "—"}）`;
        if (s.isTurningPoint) text = `【${text}】`;
        if (s.isRed) text = `*${text}*`;
        return text;
      }).join(" → ");
    const stopLabel =
      branches.length === 0
        ? "—"
        : branches.map((b) => (b.stopNode ? getSlotName(b.stopNode) : "—")).join(branches.length > 1 ? " / " : "");
    rows.push({
      startSlotId: slotId,
      startLabel,
      branches,
      stopLabel,
    });
  }

  return { rows, missingMapping };
}

/** 飞宫链统计：分支最多的起点、出现最多的停止点、最多被标红的点、出现最多的转折点 */
export function flyChainStats(rows: FlyChainRow[]): {
  topStartSlots: string[];
  topStopNodes: string[];
  topRedNodes: string[];
  topTurningNodes: string[];
} {
  const startCount: Record<string, number> = {};
  const stopCount: Record<string, number> = {};
  const redCount: Record<string, number> = {};
  const turningCount: Record<string, number> = {};

  for (const row of rows) {
    const branchNum = row.branches.length;
    if (branchNum > 0) {
      startCount[row.startSlotId] = branchNum;
    }
    for (const b of row.branches) {
      if (b.stopNode) stopCount[b.stopNode] = (stopCount[b.stopNode] ?? 0) + 1;
      for (const step of b.path) {
        if (step.isRed) redCount[step.node] = (redCount[step.node] ?? 0) + 1;
        if (step.isTurningPoint) turningCount[step.node] = (turningCount[step.node] ?? 0) + 1;
      }
    }
  }

  const topN = (count: Record<string, number>, n: number): string[] => {
    const sorted = Object.entries(count).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return [];
    const max = sorted[0][1];
    return sorted.filter(([, c]) => c === max).slice(0, n).map(([k]) => k);
  };

  return {
    topStartSlots: topN(startCount, 3),
    topStopNodes: topN(stopCount, 3),
    topRedNodes: topN(redCount, 3),
    topTurningNodes: topN(turningCount, 3),
  };
}
