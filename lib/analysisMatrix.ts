/**
 * Step5 统筹分析矩阵表：列=牌位/统筹/指示牌，行=属性维度
 */

import type { Case } from "@/lib/db";
import type { SpreadLayout } from "@/lib/spreadTypes";
import { parseSlotInput } from "@/lib/slotInputParse";
import { matchCardByDisplayName } from "@/lib/deck";
import type { Card, Deck } from "@/spec/data_models";
import type { GroupSummary } from "@/lib/groupSummary";

/** 六芒星：时间线=1,2,3 空间线=4,5,6 整体=1..7 */
const HEXAGRAM_SUMMARY_GROUPS = {
  time: ["1", "2", "3"],
  space: ["4", "5", "6"],
  all: ["1", "2", "3", "4", "5", "6", "7"],
} as const;

export type ColumnKind = "slot" | "summary" | "signifier";

export interface AnalysisColumn {
  id: string;
  title: string;
  kind: ColumnKind;
  slotId?: string;
  summaryGroup?: "time" | "space" | "all";
  signifierIndex?: number;
}

export interface SlotCardEntry {
  card: Card;
  reversed: boolean;
}

export interface MatrixContext {
  slotCards: Map<string, SlotCardEntry>;
  summaryGroups: {
    time: SlotCardEntry[];
    space: SlotCardEntry[];
    all: SlotCardEntry[];
  };
  signifierCards: SlotCardEntry[];
}

/** 解析指示牌输入（英文分号分隔，每条同 Step3 规则） */
function parseSignifierInput(raw: string, deck: Deck): SlotCardEntry[] {
  const list: SlotCardEntry[] = [];
  const parts = raw.split(";").map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    const parsed = parseSlotInput(part);
    if (!parsed.ok) continue;
    const card = matchCardByDisplayName(deck, parsed.cardKey);
    if (card) list.push({ card, reversed: parsed.reversed });
  }
  return list;
}

/** 应用用户补录的行星（优先按 cardKey，其次按 slotId）；返回新的 card 引用以避免污染原牌库 */
function applyPlanetSupplement(card: Card, caseData: Case, slotId?: string): Card {
  const fromByKey = caseData.supplements?.planetByCardKey?.[card.name];
  const fromSlot = slotId ? caseData.planetSupplements?.[slotId] : undefined;
  const raw = fromByKey ?? fromSlot;
  if (!raw) return card;
  const planets = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return { ...card, planets };
}

/**
 * 生成列定义：牌位列、统筹列、指示牌列（按指定顺序）
 */
export function buildColumns(
  caseData: Case,
  layout: SpreadLayout,
  deckData: Deck
): AnalysisColumn[] {
  const columns: AnalysisColumn[] = [];
  const byId = new Map(deckData.cards.map((c) => [c.id, c]));
  const cardsBySlot = new Map<string, SlotCardEntry>();
  for (const s of caseData.cards ?? []) {
    if (!s.cardId) continue;
    const card = byId.get(s.cardId);
    if (card) cardsBySlot.set(s.slotId, { card, reversed: s.reversed ?? false });
  }

  const layoutId = layout.id;
  const slots = layout.slots;

  if (layoutId === "hexagram-7" && slots.length >= 7) {
    // 过去、现在、未来、时间线统筹、阻碍、环境、策略、空间线统筹、更好的结果、整体统筹
    const order: (string | "summary-time" | "summary-space" | "summary-all")[] = [
      "1", "2", "3", "summary-time",
      "4", "5", "6", "summary-space",
      "7", "summary-all",
    ];
    const summaryTitles: Record<string, string> = {
      "summary-time": "时间线统筹",
      "summary-space": "空间线统筹",
      "summary-all": "整体统筹",
    };
    for (const key of order) {
      if (key.startsWith("summary-")) {
        columns.push({
          id: key,
          title: summaryTitles[key],
          kind: "summary",
          summaryGroup: key.replace("summary-", "") as "time" | "space" | "all",
        });
      } else {
        const slot = slots.find((s) => s.id === key);
            if (slot) columns.push({ id: `slot-${key}`, title: slot.name, kind: "slot", slotId: key });
      }
    }
  } else {
    // 其他布局：先全部牌位再整体统筹
    for (const slot of slots) {
      columns.push({ id: `slot-${slot.id}`, title: slot.name, kind: "slot", slotId: slot.id });
    }
    columns.push({ id: "summary-all", title: "整体统筹", kind: "summary", summaryGroup: "all" });
  }

  const signifiers = parseSignifierInput(caseData.significatorInput ?? "", deckData);
  signifiers.forEach((_, i) => {
    columns.push({ id: `signifier-${i}`, title: `指示牌${i + 1}`, kind: "signifier", signifierIndex: i });
  });

  return columns;
}

/**
 * 获取矩阵表所需数据：slot 牌、统筹分组牌、指示牌
 */
export function getMatrixContext(
  caseData: Case,
  layout: SpreadLayout,
  deckData: Deck
): MatrixContext {
  const byId = new Map(deckData.cards.map((c) => [c.id, c]));
  const slotCards = new Map<string, SlotCardEntry>();
  for (const s of caseData.cards ?? []) {
    if (!s.cardId) continue;
    const base = byId.get(s.cardId);
    if (!base) continue;
    const card = applyPlanetSupplement(base, caseData, s.slotId);
    slotCards.set(s.slotId, { card, reversed: s.reversed ?? false });
  }

  const getEntries = (slotIds: readonly string[]) =>
    slotIds.map((id) => slotCards.get(id)).filter((e): e is SlotCardEntry => Boolean(e));

  const layoutId = layout.id;
  const summaryGroups = {
    time: layoutId === "hexagram-7" ? getEntries(HEXAGRAM_SUMMARY_GROUPS.time) : [],
    space: layoutId === "hexagram-7" ? getEntries(HEXAGRAM_SUMMARY_GROUPS.space) : [],
    all: layoutId === "hexagram-7"
      ? getEntries(HEXAGRAM_SUMMARY_GROUPS.all)
      : Array.from(slotCards.values()),
  };

  const signifierCardsRaw = parseSignifierInput(caseData.significatorInput ?? "", deckData);
  const signifierCards = signifierCardsRaw.map((entry) => ({
    card: applyPlanetSupplement(entry.card, caseData),
    reversed: entry.reversed,
  }));

  return { slotCards, summaryGroups, signifierCards };
}

/** 维度行：从牌库属性读取 */
export interface DimensionRow {
  id: string;
  label: string;
  getValue: (card: Card) => string;
  /** 汇总时所有可能取值（用于计数展示） */
  options: string[];
  getSummary: (cards: SlotCardEntry[]) => string;
}

function countByValue(cards: SlotCardEntry[], getValue: (card: Card) => string, options: string[]): string {
  const counts: Record<string, number> = {};
  options.forEach((o) => (counts[o] = 0));
  cards.forEach(({ card }) => {
    const v = getValue(card)?.trim();
    if (v && (options.includes(v) || options.length === 0)) counts[v] = (counts[v] ?? 0) + 1;
  });
  return options.map((o) => `${o}${counts[o] ?? 0}`).join(" ");
}

export const DIMENSION_ROWS: DimensionRow[] = [
  {
    id: "element",
    label: "元素",
    getValue: (c) => c.element ?? "",
    options: ["火", "土", "风", "水"],
    getSummary: (cards) => countByValue(cards, (c) => c.element ?? "", ["火", "土", "风", "水"]),
  },
  {
    id: "quality",
    label: "品质",
    getValue: (c) => (Array.isArray(c.qualities) ? c.qualities.join(" ") : ""),
    options: ["干", "湿", "热", "冷"],
    getSummary: (cards) => {
      const counts: Record<string, number> = { 干: 0, 湿: 0, 热: 0, 冷: 0 };
      cards.forEach(({ card }) => {
        (card.qualities ?? []).forEach((q) => { if (counts[q] !== undefined) counts[q]++; });
      });
      return ["干", "湿", "热", "冷"].map((k) => `${k}${counts[k]}`).join(" ");
    },
  },
  {
    id: "yinYang",
    label: "阴阳",
    getValue: (c) => c.yinYang ?? "",
    options: ["阴", "阳"],
    getSummary: (cards) => countByValue(cards, (c) => c.yinYang ?? "", ["阴", "阳"]),
  },
  {
    id: "stage",
    label: "阶段",
    getValue: (c) => c.stage ?? "",
    options: ["开创", "固定", "变动", "转化"],
    getSummary: (cards) => countByValue(cards, (c) => c.stage ?? "", ["开创", "固定", "变动", "转化"]),
  },
  {
    id: "trait",
    label: "性状",
    getValue: (c) => c.trait ?? "",
    options: ["角", "续", "果", "蛋"],
    getSummary: (cards) => countByValue(cards, (c) => c.trait ?? "", ["角", "续", "果", "蛋"]),
  },
  {
    id: "zodiac",
    label: "星座",
    getValue: (c) => (Array.isArray(c.zodiac) ? c.zodiac.join(" ") : ""),
    options: [],
    getSummary: () => "",
  },
  {
    id: "house",
    label: "宫位",
    getValue: (c) => (Array.isArray(c.houses) ? c.houses.map(String).join(" ") : ""),
    options: [],
    getSummary: () => "",
  },
  {
    id: "planet",
    label: "行星",
    getValue: (c) => (Array.isArray(c.planets) ? c.planets.join(" ") : ""),
    options: [],
    getSummary: () => "",
  },
];

/** 取单格显示值（牌位列/指示牌列：属性值；统筹列：优先用 groupSummaries，否则 getSummary） */
export function getCellValue(
  col: AnalysisColumn,
  row: DimensionRow,
  ctx: MatrixContext,
  groupSummaries?: Record<"time" | "space" | "all", GroupSummary>
): string {
  if (col.kind === "slot" && col.slotId) {
    const entry = ctx.slotCards.get(col.slotId);
    return entry ? row.getValue(entry.card) : "";
  }
  if (col.kind === "summary" && col.summaryGroup) {
    const summary = groupSummaries?.[col.summaryGroup];
    if (summary) {
      const key = row.id as keyof GroupSummary;
      if (key === "numbers") return ""; // numbers 在数字加和区展示
      const v = summary[key];
      return typeof v === "string" ? v : "";
    }
    const list = ctx.summaryGroups[col.summaryGroup];
    return list.length ? row.getSummary(list) : "";
  }
  if (col.kind === "signifier" && col.signifierIndex != null) {
    const entry = ctx.signifierCards[col.signifierIndex];
    return entry ? row.getValue(entry.card) : "";
  }
  return "";
}

/** 取列顶牌名（仅牌位列、指示牌列有；逆位为 牌名-） */
export function getColumnCardText(col: AnalysisColumn, ctx: MatrixContext): string {
  if (col.kind === "slot" && col.slotId) {
    const entry = ctx.slotCards.get(col.slotId);
    if (!entry) return "";
    return entry.reversed ? `${entry.card.name}-` : entry.card.name;
  }
  if (col.kind === "signifier" && col.signifierIndex != null) {
    const entry = ctx.signifierCards[col.signifierIndex];
    if (!entry) return "";
    return entry.reversed ? `${entry.card.name}-` : entry.card.name;
  }
  return "";
}

/** 首行用「牌名」维度：显示牌名（逆位 牌名-），统筹列空 */
export const CARD_NAME_ROW_ID = "__cardName";
