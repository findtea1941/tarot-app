/**
 * Step5 统筹计算逻辑：按六芒星分组（时间线/空间线/整体）分别统计
 * 所有字段从牌库读取，逆位数字取负；结果写入表格统筹列与数字加和区
 */

import type { Card } from "@/spec/data_models";

export interface ResolvedCard {
  card: Card;
  reversed: boolean;
}

export interface GroupNumbers {
  sumSigned: number;
  sumAbs: number;
  mod22: number;
}

export interface GroupSummary {
  element: string;
  quality: string;
  yinYang: string;
  stage: string;
  trait: string;
  zodiac: string;
  house: string;
  planet: string;
  numbers: GroupNumbers;
}

/** 品质单字：从 qualities 数组或组合串拆开统计 */
const QUALITY_KEYS = ["干", "湿", "冷", "热"] as const;
function countQualities(cards: ResolvedCard[]): Record<string, number> {
  const counts: Record<string, number> = { 干: 0, 湿: 0, 冷: 0, 热: 0 };
  cards.forEach(({ card }) => {
    (card.qualities ?? []).forEach((q) => {
      const s = String(q).trim();
      if (s.length === 2) {
        counts[s[0]] = (counts[s[0]] ?? 0) + 1;
        counts[s[1]] = (counts[s[1]] ?? 0) + 1;
      } else if (QUALITY_KEYS.includes(s as (typeof QUALITY_KEYS)[number])) {
        counts[s] = (counts[s] ?? 0) + 1;
      }
    });
  });
  return counts;
}

/** 众数；并列返回 "" */
function mode(values: (string | number)[]): string {
  if (values.length === 0) return "";
  const counts = new Map<string, number>();
  values.forEach((v) => {
    const k = String(v);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  });
  let maxCount = 0;
  const maxKeys: string[] = [];
  counts.forEach((c, k) => {
    if (c > maxCount) {
      maxCount = c;
      maxKeys.length = 0;
      maxKeys.push(k);
    } else if (c === maxCount) maxKeys.push(k);
  });
  return maxCount === 0 || maxKeys.length > 1 ? "" : maxKeys[0];
}

/**
 * 对一组牌计算统筹结果（纯函数）
 */
export function buildGroupSummary(cards: ResolvedCard[]): GroupSummary {
  const numbers: GroupNumbers = { sumSigned: 0, sumAbs: 0, mod22: 0 };
  cards.forEach(({ card, reversed }) => {
    const n = card.number;
    if (n != null) {
      const signed = reversed ? -n : n;
      numbers.sumSigned += signed;
      numbers.sumAbs += Math.abs(signed);
    }
  });
  numbers.mod22 = ((numbers.sumSigned % 22) + 22) % 22;

  if (cards.length === 0) {
    return {
      element: "",
      quality: "",
      yinYang: "",
      stage: "",
      trait: "",
      zodiac: "",
      house: "",
      planet: "",
      numbers,
    };
  }

  // 1) 元素：火/水/风/土，抵消规则
  const fire = cards.filter(({ card }) => card.element === "火").length;
  const water = cards.filter(({ card }) => card.element === "水").length;
  const air = cards.filter(({ card }) => card.element === "风").length;
  const earth = cards.filter(({ card }) => card.element === "土").length;
  const fireWater = fire - water;
  const airEarth = air - earth;
  const netFire = Math.max(fireWater, 0);
  const netWater = Math.max(-fireWater, 0);
  const netAir = Math.max(airEarth, 0);
  const netEarth = Math.max(-airEarth, 0);
  const nets = [
    { v: netFire, label: "火" },
    { v: netWater, label: "水" },
    { v: netAir, label: "风" },
    { v: netEarth, label: "土" },
  ];
  const maxNet = Math.max(netFire, netWater, netAir, netEarth);
  const element =
    maxNet === 0
      ? "平衡"
      : nets.filter((n) => n.v === maxNet).length > 1
        ? "平衡"
        : nets.find((n) => n.v === maxNet)!.label;

  // 2) 品质：干/湿/冷/热
  const q = countQualities(cards);
  const dry = q.干 ?? 0;
  const wet = q.湿 ?? 0;
  const cold = q.冷 ?? 0;
  const hot = q.热 ?? 0;
  const dryWet = dry - wet;
  const coldHot = cold - hot;
  const netDry = Math.max(dryWet, 0);
  const netWet = Math.max(-dryWet, 0);
  const netCold = Math.max(coldHot, 0);
  const netHot = Math.max(-coldHot, 0);
  const axis1 = netDry > 0 ? "干" : netWet > 0 ? "湿" : "";
  const axis2 = netCold > 0 ? "冷" : netHot > 0 ? "热" : "";
  const quality =
    !axis1 && !axis2 ? "平衡" : axis1 && axis2 ? `${axis1}${axis2}` : axis1 || axis2;

  // 3) 阴阳
  const yin = cards.filter(({ card }) => card.yinYang === "阴").length;
  const yang = cards.filter(({ card }) => card.yinYang === "阳").length;
  const diff = yang - yin;
  const yinYang = diff === 0 ? "平衡" : diff > 0 ? "阳" : "阴";

  // 4) 阶段：仅当唯一第一名存在时返回该值；并列第一或全不同均返回“无”
  const stageCounts: Record<string, number> = {};
  ["开创", "固定", "变动", "转化"].forEach((s) => (stageCounts[s] = 0));
  cards.forEach(({ card }) => {
    const s = card.stage?.trim();
    if (s && stageCounts[s] !== undefined) stageCounts[s]++;
  });
  const maxStageCount = Math.max(0, ...Object.values(stageCounts));
  const topStages = (["开创", "固定", "变动", "转化"] as const).filter(
    (s) => stageCounts[s] === maxStageCount
  );
  const stage =
    maxStageCount === 0 || topStages.length !== 1
      ? "无"
      : topStages[0];

  // 5) 性状：角/续/果/蛋，fruit2 = fruit + horn + link
  const horn = cards.filter(({ card }) => card.trait === "角").length;
  const link = cards.filter(({ card }) => card.trait === "续").length;
  const fruit = cards.filter(({ card }) => card.trait === "果").length;
  const egg = cards.filter(({ card }) => card.trait === "蛋").length;
  const fruit2 = fruit + horn + link;
  const traitVals = [
    { v: horn, label: "角" },
    { v: link, label: "续" },
    { v: fruit2, label: "果" },
    { v: egg, label: "蛋" },
  ];
  const maxTrait = Math.max(horn, link, fruit2, egg);
  const trait =
    maxTrait === 0
      ? ""
      : traitVals.filter((t) => t.v === maxTrait).length > 1
        ? ""
        : traitVals.find((t) => t.v === maxTrait)!.label;

  // 6) 星座/宫位/行星：展平后众数，并列 ""
  const zodiacFlat: string[] = [];
  const houseFlat: (string | number)[] = [];
  const planetFlat: string[] = [];
  cards.forEach(({ card }) => {
    (card.zodiac ?? []).forEach((z) => zodiacFlat.push(String(z).trim()));
    (card.houses ?? []).forEach((h) => houseFlat.push(h));
    (card.planets ?? []).forEach((p) => {
      String(p)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((s) => planetFlat.push(s));
    });
  });
  const zodiac = mode(zodiacFlat);
  const house = mode(houseFlat);
  const planet = mode(planetFlat);

  return {
    element,
    quality,
    yinYang,
    stage,
    trait,
    zodiac,
    house,
    planet,
    numbers,
  };
}

/** 六芒星分组 slotId 列表 */
export const HEXAGRAM_GROUP_SLOT_IDS = {
  time: ["1", "2", "3"],
  space: ["4", "5", "6"],
  all: ["1", "2", "3", "4", "5", "6", "7"],
} as const;

/** 时间流分组：三张牌均为时间线 */
const TIMEFLOW_GROUP_SLOT_IDS = {
  time: ["1", "2", "3"],
  space: [] as const,
  all: ["1", "2", "3"],
} as const;

/**
 * 从 caseData + deck 解析出各组的 ResolvedCard[]（仅牌阵 slot，不含指示牌）
 */
export function getResolvedCardsByGroup(
  slotCards: Map<string, ResolvedCard>,
  layoutId: string
): { time: ResolvedCard[]; space: ResolvedCard[]; all: ResolvedCard[] } {
  const get = (ids: readonly string[]) =>
    ids.map((id) => slotCards.get(id)).filter((e): e is ResolvedCard => Boolean(e));
  if (layoutId === "hexagram-7") {
    return {
      time: get(HEXAGRAM_GROUP_SLOT_IDS.time),
      space: get(HEXAGRAM_GROUP_SLOT_IDS.space),
      all: get(HEXAGRAM_GROUP_SLOT_IDS.all),
    };
  }
  if (layoutId === "timeflow-3") {
    const all = get(TIMEFLOW_GROUP_SLOT_IDS.all);
    return {
      time: all,
      space: [],
      all,
    };
  }
  const all = Array.from(slotCards.values());
  return { time: [], space: [], all };
}
