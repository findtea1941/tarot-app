/**
 * Step5 统筹分析表格数据模型：进入页面即生成
 * 规则：牌名正位为「牌名」、逆位为「牌名-」；数字按数据库，逆位按负数计入 numberSum
 */

import type { Case } from "@/lib/db";
import type { SpreadLayout } from "@/lib/spreadTypes";
import type { Card, Deck } from "@/spec/data_models";

export interface AnalysisTableRow {
  slotId: string;
  slotName: string;
  meaning: string;
  cardText: string;
  reversed: boolean;
  /** 牌在牌库中的 number（大阿尔克那编号 / 小阿尔克那点数等） */
  number: number | null;
  /** 参与加和的值：有 number 时逆位为负，否则不参与 */
  numberForSum: number | null;
}

export interface AnalysisTable {
  rows: AnalysisTableRow[];
  numberSum: number;
}

/**
 * 由 caseData + 牌库 + layout 生成统筹分析表格
 * 进入 Step5 即调用；后续可随指示牌/行星/牌阵变更重新生成或局部更新
 */
export function buildAnalysisTable(
  caseData: Case,
  deckData: Deck,
  layout: SpreadLayout
): AnalysisTable {
  const byId = new Map(deckData.cards.map((c) => [c.id, c]));
  const cardsBySlot = new Map<string, { card: Card; reversed: boolean }>();
  for (const s of caseData.cards ?? []) {
    if (!s.cardId) continue;
    const card = byId.get(s.cardId);
    if (card) cardsBySlot.set(s.slotId, { card, reversed: s.reversed ?? false });
  }

  const rows: AnalysisTableRow[] = [];
  let numberSum = 0;

  for (const slot of layout.slots) {
    const entry = cardsBySlot.get(slot.id);
    if (!entry) {
      rows.push({
        slotId: slot.id,
        slotName: slot.name,
        meaning: slot.meaning,
        cardText: "",
        reversed: false,
        number: null,
        numberForSum: null,
      });
      continue;
    }
    const { card, reversed } = entry;
    const cardText = reversed ? `${card.name}-` : card.name;
    const num = card.number != null ? card.number : null;
    const numberForSum =
      num != null ? (reversed ? -num : num) : null;
    if (numberForSum != null) numberSum += numberForSum;
    rows.push({
      slotId: slot.id,
      slotName: slot.name,
      meaning: slot.meaning,
      cardText,
      reversed,
      number: num,
      numberForSum,
    });
  }

  return { rows, numberSum };
}
