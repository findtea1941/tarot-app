/**
 * 四元素牌阵：2 号位=土（右）、3 号位=风（左）。旧数据为 2=风、3=土，首次读取时交换 slot 2/3 并打标，避免牌张错位。
 */

import type { Case } from "@/lib/db";
import type { SpreadSlotState } from "@/lib/spreadTypes";

export const FOUR_ELEMENTS_SLOT_V2_FLAG = "fourElementsSlot23V2" as const;

function extraRecord(extra: unknown): Record<string, unknown> {
  return typeof extra === "object" && extra !== null ? { ...(extra as Record<string, unknown>) } : {};
}

function isFourElementsV2(extra: unknown): boolean {
  return extraRecord(extra)[FOUR_ELEMENTS_SLOT_V2_FLAG] === true;
}

/** 交换 Record 中键 "2" 与 "3" 的值 */
export function swapSlotKeys2And3<V>(obj: Record<string, V> | undefined): Record<string, V> | undefined {
  if (!obj) return obj;
  const has2 = Object.prototype.hasOwnProperty.call(obj, "2");
  const has3 = Object.prototype.hasOwnProperty.call(obj, "3");
  if (!has2 && !has3) return obj;
  const k2 = has2 ? obj["2"] : undefined;
  const k3 = has3 ? obj["3"] : undefined;
  const next = { ...obj };
  delete next["2"];
  delete next["3"];
  if (has2) next["3"] = k2 as V;
  if (has3) next["2"] = k3 as V;
  return next;
}

function swapCards(cards: SpreadSlotState[] | undefined): SpreadSlotState[] | undefined {
  if (!cards?.length) return cards;
  return cards.map((s) => ({
    ...s,
    slotId: s.slotId === "2" ? "3" : s.slotId === "3" ? "2" : s.slotId,
  }));
}

/** 新建四元素草稿时在 extra 中写入，避免空案例被误判为旧编号 */
export function withFourElementsV2Extra(extra: Case["extra"]): Record<string, unknown> {
  return { ...extraRecord(extra), [FOUR_ELEMENTS_SLOT_V2_FLAG]: true };
}

export function migrateFourElementsCaseIfNeeded(c: Case): { case: Case; changed: boolean } {
  if (c.spreadType !== "四元素") return { case: c, changed: false };
  if (isFourElementsV2(c.extra)) return { case: c, changed: false };

  const nextExtra = extraRecord(c.extra);
  nextExtra[FOUR_ELEMENTS_SLOT_V2_FLAG] = true;

  let supplements = c.supplements;
  if (c.supplements?.planetBySlotId) {
    const swapped = swapSlotKeys2And3(c.supplements.planetBySlotId);
    if (swapped !== c.supplements.planetBySlotId) {
      supplements = { ...c.supplements, planetBySlotId: swapped ?? {} };
    }
  }

  return {
    case: {
      ...c,
      extra: nextExtra,
      cards: swapCards(c.cards),
      slotInputs: swapSlotKeys2And3(c.slotInputs),
      slotCards: swapSlotKeys2And3(c.slotCards),
      planetSupplements: swapSlotKeys2And3(c.planetSupplements),
      supplements,
    },
    changed: true,
  };
}
