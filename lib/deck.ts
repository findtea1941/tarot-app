import deckJson from "@/data/tarot_deck_zh.json";
import type { Card, Deck } from "@/spec/data_models";

let cachedDeck: Deck | null = null;

export function getDeck(): Deck {
  if (!cachedDeck) {
    cachedDeck = deckJson as Deck;
  }
  return cachedDeck;
}

/** 常见牌名别名（用户输入 -> 牌库 name 后缀） */
const CARD_NAME_ALIASES: Record<string, string> = {
  "愚人": "愚者",
};

/**
 * 按显示名匹配牌库中唯一一张牌。
 * 匹配规则：先尝试别名，再精确匹配 card.name，再匹配 card.name 结尾（如 "愚者" 匹配 "0、愚者"）。
 * 0 或 多张 匹配返回 null。
 */
export function matchCardByDisplayName(deck: Deck, displayName: string): Card | null {
  const name = displayName.trim();
  if (!name) return null;
  const normalized = CARD_NAME_ALIASES[name] ?? name;
  const matches = deck.cards.filter((c) => {
    if (c.name === normalized || c.name === name) return true;
    if (c.name.endsWith(normalized) || c.name.endsWith(name)) return true;
    return false;
  });
  if (matches.length !== 1) return null;
  return matches[0];
}

