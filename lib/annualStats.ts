/**
 * 年运牌阵统计：元素、阶段、性状、牌型比例、星座宫位前二、行星、数字加和
 */

import type { Card } from "@/spec/data_models";
import type { SlotCardEntry } from "./flyingPalace";
import { STARFORTUNE_SLOT_ORDER } from "@/layouts/starFortune";

const ANNUAL_SLOT_ORDER = [
  "significator", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12",
  "fire", "earth", "air", "water",
];

export interface AnnualStats {
  elements: { 火: number; 土: number; 风: number; 水: number };
  stages: { 开创: number; 固定: number; 变动: number; 转化: number };
  traits: { 角: number; 续: number; 果: number; 蛋: number };
  cardTypes: { major: number; minor: number; court: number };
  zodiacCount: Record<string, number>;
  houseCount: Record<string, number>;
  planetCount: Record<string, number>;
  numberSumAbsolute: number;
  numberSumSigned: number;
}

const STAGE_KEYS = ["开创", "固定", "变动", "转化"] as const;
const TRAIT_KEYS = ["角", "续", "果", "蛋"] as const;

export function buildAnnualStats(slotCards: Map<string, SlotCardEntry>): AnnualStats {
  return buildAnnualStatsFromOrder(slotCards, ANNUAL_SLOT_ORDER);
}

/** 星运牌阵统计：与年运逻辑一致，按 23 个 slot 顺序（七星、十二宫、四元素） */
export function buildStarFortuneStats(slotCards: Map<string, SlotCardEntry>): AnnualStats {
  return buildAnnualStatsFromOrder(slotCards, [...STARFORTUNE_SLOT_ORDER]);
}

/** 按给定 slot 顺序统计（供年运/星运复用） */
function buildAnnualStatsFromOrder(
  slotCards: Map<string, SlotCardEntry>,
  slotOrder: string[]
): AnnualStats {
  const elements = { 火: 0, 土: 0, 风: 0, 水: 0 };
  const stages = { 开创: 0, 固定: 0, 变动: 0, 转化: 0 };
  const traits = { 角: 0, 续: 0, 果: 0, 蛋: 0 };
  const cardTypes = { major: 0, minor: 0, court: 0 };
  const zodiacCount: Record<string, number> = {};
  const houseCount: Record<string, number> = {};
  const planetCount: Record<string, number> = {};
  let numberSumAbsolute = 0;
  let numberSumSigned = 0;

  for (const slotId of slotOrder) {
    const entry = slotCards.get(slotId);
    if (!entry) continue;
    const card = entry.card;
    const num = card.number ?? 0;
    if (typeof num === "number") {
      numberSumAbsolute += Math.abs(num);
      numberSumSigned += entry.reversed ? -num : num;
    }
    if (card.element) elements[card.element as keyof typeof elements] = (elements[card.element as keyof typeof elements] ?? 0) + 1;
    if (card.stage && STAGE_KEYS.includes(card.stage as (typeof STAGE_KEYS)[number])) stages[card.stage as keyof typeof stages]++;
    if (card.trait && TRAIT_KEYS.includes(card.trait as (typeof TRAIT_KEYS)[number])) traits[card.trait as keyof typeof traits]++;
    if (card.arcana === "major") cardTypes.major++;
    else if (card.rank === "侍从" || card.rank === "骑士" || card.rank === "王后" || card.rank === "国王") cardTypes.court++;
    else cardTypes.minor++;
    for (const z of card.zodiac ?? []) {
      zodiacCount[z] = (zodiacCount[z] ?? 0) + 1;
    }
    for (const h of card.houses ?? []) {
      const key = String(h);
      houseCount[key] = (houseCount[key] ?? 0) + 1;
    }
    for (const p of card.planets ?? []) {
      const raw = String(p).trim();
      if (!raw) continue;
      const parts = raw.split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean);
      for (const key of parts.length > 0 ? parts : [raw]) {
        planetCount[key] = (planetCount[key] ?? 0) + 1;
      }
    }
  }

  return {
    elements,
    stages,
    traits,
    cardTypes,
    zodiacCount,
    houseCount,
    planetCount,
    numberSumAbsolute,
    numberSumSigned,
  };
}

/** 格式：火3 土4 风5 水6 */
export function formatElementLine(stats: AnnualStats): string {
  const { elements } = stats;
  return ["火", "土", "风", "水"].map((e) => `${e}${elements[e as keyof typeof elements] ?? 0}`).join(" ");
}

const STAGE_LABELS: Record<keyof AnnualStats["stages"], string> = {
  开创: "开",
  固定: "固",
  变动: "变",
  转化: "转",
};

/** 格式：开8 固4 变3 转2 */
export function formatStageLine(stats: AnnualStats): string {
  const { stages } = stats;
  return (["开创", "固定", "变动", "转化"] as const).map((s) => STAGE_LABELS[s] + (stages[s] ?? 0)).join(" ");
}

/** 格式：角4 续5 果6 蛋2 */
export function formatTraitLine(stats: AnnualStats): string {
  const { traits } = stats;
  return (["角", "续", "果", "蛋"] as const).map((t) => `${t}${traits[t] ?? 0}`).join(" ");
}

/** 格式：大阿卡纳X 数字牌X 宫廷牌X */
export function formatCardTypeLine(stats: AnnualStats): string {
  const { cardTypes } = stats;
  return `大阿卡纳${cardTypes.major} 数字牌${cardTypes.minor} 宫廷牌${cardTypes.court}`;
}

/** 数量≥2 的星座/宫位，取前二（可并列） */
export function topTwoKeys(count: Record<string, number>): string[] {
  const entries = Object.entries(count).filter(([, c]) => c >= 2);
  if (entries.length === 0) return [];
  entries.sort((a, b) => b[1] - a[1]);
  const max = entries[0][1];
  return entries.filter(([, c]) => c === max).slice(0, 3).map(([k]) => k);
}

/** 星座/宫位：取数量≥minCount 的前三档，最多展示 3 项；若某档并列≥5 项或加入会超 3 项则省略该档并说明 */
export type TopKeysWithCount = { items: Array<{ key: string; count: number }>; note?: string };

const ZODIAC_HOUSE_TOP_DISPLAY_MAX = 3;

export function topKeysWithCount(
  count: Record<string, number>,
  minCount: number = 2
): TopKeysWithCount {
  const entries = Object.entries(count).filter(([, c]) => c >= minCount);
  if (entries.length === 0) return { items: [] };
  entries.sort((a, b) => b[1] - a[1]);
  const byCount = new Map<number, string[]>();
  for (const [key, c] of entries) {
    if (!byCount.has(c)) byCount.set(c, []);
    byCount.get(c)!.push(key);
  }
  const distinctCounts = [...byCount.keys()].sort((a, b) => b - a).slice(0, 3);
  const items: Array<{ key: string; count: number }> = [];
  let note: string | undefined;
  for (const c of distinctCounts) {
    const keys = byCount.get(c) ?? [];
    if (keys.length >= 5) {
      note = note ? `${note}、略（${c}）` : `略（${c}）`;
      continue;
    }
    if (items.length + keys.length > ZODIAC_HOUSE_TOP_DISPLAY_MAX) {
      note = note ? `${note}、略（${c}）` : `略（${c}）`;
      continue;
    }
    for (const key of keys) items.push({ key, count: c });
  }
  return { items, note };
}

const HOUSE_LABELS: Record<string, string> = {
  "1": "一宫", "2": "二宫", "3": "三宫", "4": "四宫", "5": "五宫", "6": "六宫",
  "7": "七宫", "8": "八宫", "9": "九宫", "10": "十宫", "11": "十一宫", "12": "十二宫",
};

export function formatHouseLabel(key: string): string {
  return HOUSE_LABELS[key] ?? key;
}
