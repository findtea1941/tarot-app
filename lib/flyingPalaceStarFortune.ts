/**
 * 星运牌阵飞宫链：23 张牌（七星、十二宫、四元素），起点顺序 七星位→十二宫→四元素；
 * ACE/侍从→四元素，其余小阿→宫位，大阿→七星位（双行星分叉）；visited 每分支独立；停止与转折点同年运规则。
 */

import type { Card } from "@/spec/data_models";
import type { FlyNode, PathStep, FlyBranchResult, FlyChainRow, SlotCardEntry } from "./flyingPalace";
import { buildFlyChainForStart } from "./flyingPalace";
import { STARFORTUNE_SLOT_ORDER } from "@/layouts/starFortune";

const ELEMENT_MAP: Record<string, FlyNode> = { 火: "fire", 土: "earth", 风: "air", 水: "water" };
const PLANET_TO_SEVEN: Record<string, string> = {
  "☉": "sun",
  "☽": "moon",
  "☿": "mercury",
  "♀": "venus",
  "♂": "mars",
  "♃": "jupiter",
  "♄": "saturn",
};

function elementToNode(el: string | undefined): FlyNode | null {
  if (!el) return null;
  return (ELEMENT_MAP[el] ?? null) as FlyNode | null;
}

/** 星运：解析卡牌 planets 字段（可能含 "♂,♃" 等单字符串多行星），返回七星位 slot 列表 */
function planetsToSevenSlots(planets: string[] | undefined): string[] {
  if (!planets?.length) return [];
  const out: string[] = [];
  for (const p of planets) {
    const raw = String(p).trim();
    const parts = raw.split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean);
    const toCheck = parts.length > 0 ? parts : [raw];
    for (const part of toCheck) {
      const slot = PLANET_TO_SEVEN[part];
      if (slot) out.push(slot);
    }
  }
  return out;
}

/**
 * 星运飞入目标：特例 ACE/侍从→四元素；一般小阿(骑士/王后/国王+2-10)→宫位；大阿→七星位（双行星分叉）。
 * 缺少映射时返回 []，由调用方弹窗提示。
 */
export function getFlyTargetsStarFortune(card: Card): FlyNode[] {
  const name = card.name;
  if (name === "愚者") return ["air"];
  if (name === "吊人") return ["water"];
  if (name === "审判") return ["fire"];
  const rank = card.rank;
  if (rank === "ACE" || rank === "侍从") {
    const node = elementToNode(card.element ?? undefined);
    return node ? [node] : [];
  }
  if (card.arcana === "major") {
    const slots = planetsToSevenSlots(card.planets);
    return slots as FlyNode[];
  }
  const raw = card.houses;
  const houses = Array.isArray(raw) ? raw : raw != null ? [Number(raw)] : [];
  if (houses.length > 0) return houses.map((h) => String(h)) as FlyNode[];
  return [];
}

/** 星运：飞入四元素或七星位时标记为转折点 */
function isTurningPointStarFortune(_from: FlyNode, to: FlyNode): boolean {
  const elements = ["fire", "earth", "air", "water"];
  const seven = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"];
  return elements.includes(to) || seven.includes(to);
}

const SLOT_NAMES_STAR: Record<string, string> = {
  sun: "太阳", moon: "月亮", mercury: "水星", venus: "金星", mars: "火星", jupiter: "木星", saturn: "土星",
  "1": "一宫", "2": "二宫", "3": "三宫", "4": "四宫", "5": "五宫", "6": "六宫",
  "7": "七宫", "8": "八宫", "9": "九宫", "10": "十宫", "11": "十一宫", "12": "十二宫",
  fire: "火元素", earth: "土元素", air: "风元素", water: "水元素",
};

export function getSlotNameStarFortune(slotId: string): string {
  return SLOT_NAMES_STAR[slotId] ?? slotId;
}

/** 星运 23 个起点顺序：七星位、十二宫、四元素 */
const STARFORTUNE_ORDER: string[] = [...STARFORTUNE_SLOT_ORDER];

/** 构建星运飞宫链表格；若某牌缺映射返回 missingMapping 文案 */
export function buildFlyChainTableStarFortune(
  slotCards: Map<string, SlotCardEntry>
): { rows: FlyChainRow[]; missingMapping: string | null } {
  const cardByNode = new Map<FlyNode, SlotCardEntry>();
  for (const [slotId, entry] of slotCards) {
    cardByNode.set(slotId as FlyNode, entry);
  }

  const getTargets = (card: Card) => getFlyTargetsStarFortune(card);
  const isElementOrSeven = (_from: FlyNode, to: FlyNode): boolean =>
    isTurningPointStarFortune(_from, to);

  const rows: FlyChainRow[] = [];
  let missingMapping: string | null = null;

  for (const slotId of STARFORTUNE_ORDER) {
    const entry = slotCards.get(slotId);
    const startLabel = entry
      ? `${getSlotNameStarFortune(slotId)} ${entry.card.name}${entry.reversed ? "-" : ""}`
      : getSlotNameStarFortune(slotId);
    const { branches, missingMapping: err } = buildFlyChainForStart(
      slotId,
      slotCards,
      cardByNode,
      getTargets,
      isElementOrSeven
    );
    if (err) missingMapping = err;
    const pathToLabel = (steps: PathStep[]) =>
      steps.map((s) => {
        const at = cardByNode.get(s.node);
        const name = at ? `${at.card.name}${at.reversed ? "-" : ""}` : "";
        const pos = getSlotNameStarFortune(s.node);
        let text = `${pos}（${name || "—"}）`;
        if (s.isTurningPoint) text = `【${text}】`;
        if (s.isRed) text = `*${text}*`;
        return text;
      }).join(" → ");
    const stopLabel =
      branches.length === 0
        ? "—"
        : branches.map((b) => (b.stopNode ? getSlotNameStarFortune(b.stopNode) : "—")).join(branches.length > 1 ? " / " : "");
    rows.push({
      startSlotId: slotId,
      startLabel,
      branches,
      stopLabel,
    });
  }

  return { rows, missingMapping };
}
