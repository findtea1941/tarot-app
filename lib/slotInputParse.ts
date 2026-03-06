/**
 * Step3 牌阵输入解析与校验
 * 规则：牌名 => 正位；牌名-（末尾半角短横）=> 逆位；trim 空格；只认末尾 "-"
 */

import type { Deck } from "@/spec/data_models";
import { matchCardByDisplayName } from "@/lib/deck";
import type { SpreadLayout } from "@/lib/spreadTypes";

export type ParsedSlot = { cardKey: string; cardId: string; reversed: boolean };

export type ParseResult =
  | { ok: true; cardKey: string; reversed: boolean }
  | { ok: false; error: "empty" | "format" | "not_found" };

/**
 * 解析单条输入（不查牌库）
 * - 空（trim 后）=> { ok: false, error: "empty" }
 * - 末尾 "-" 但去掉后为空 / 多个 "-" / "-" 不在末尾 => { ok: false, error: "format" }
 * - 否则 => { ok: true, cardKey, reversed }
 */
export function parseSlotInput(raw: string): ParseResult {
  const s = raw.trim();
  if (s === "") return { ok: false, error: "empty" };

  const lastDash = s.lastIndexOf("-");
  if (lastDash === -1) {
    return { ok: true, cardKey: s, reversed: false };
  }
  // 有 "-"：必须恰好末尾一个
  if (lastDash !== s.length - 1) return { ok: false, error: "format" };
  const before = s.slice(0, -1).trim();
  if (before === "") return { ok: false, error: "format" };
  if (s.slice(0, -1).includes("-")) return { ok: false, error: "format" };
  return { ok: true, cardKey: before, reversed: true };
}

export type ValidateResult =
  | { ok: true; parsed: Record<string, ParsedSlot> }
  | { ok: false; firstSlotId: string; errors: Record<string, string> };

const ERROR_MESSAGES = {
  empty: "该位置缺牌",
  format: "格式错误：逆位用牌名-",
  not_found: "牌名不存在/不唯一",
} as const;

/**
 * 校验所有 slot 输入；缺牌 / 格式 / 牌名不存在 时返回首错 slot 与错误映射
 */
export function validateSlotInputs(
  layout: SpreadLayout,
  slotInputs: Record<string, string>,
  deck: Deck
): ValidateResult {
  const errors: Record<string, string> = {};
  const parsed: Record<string, ParsedSlot> = {};
  let firstSlotId: string | null = null;

  for (const slot of layout.slots) {
    const raw = slotInputs[slot.id] ?? "";
    const result = parseSlotInput(raw);
    if (!result.ok) {
      errors[slot.id] = ERROR_MESSAGES[result.error];
      if (firstSlotId == null) firstSlotId = slot.id;
      continue;
    }
    const card = matchCardByDisplayName(deck, result.cardKey);
    if (!card) {
      errors[slot.id] = ERROR_MESSAGES.not_found;
      if (firstSlotId == null) firstSlotId = slot.id;
      continue;
    }
    parsed[slot.id] = { cardKey: result.cardKey, cardId: card.id, reversed: result.reversed };
  }

  if (firstSlotId != null) {
    return { ok: false, firstSlotId, errors };
  }
  return { ok: true, parsed };
}
