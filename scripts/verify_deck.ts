import fs from "fs";
import path from "path";

interface Card {
  id: string;
  name: string;
  arcana: string;
  suit: string | null;
  rank: string | null;
  number: number | null;
  planetNeedsSupplement: boolean;
}

interface DeckFile {
  cards: Card[];
}

function main() {
  const deckPath = path.join(__dirname, "..", "data", "tarot_deck_zh.json");

  if (!fs.existsSync(deckPath)) {
    console.error(`找不到牌库文件：${deckPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(deckPath, "utf-8");

  let parsed: DeckFile;
  try {
    parsed = JSON.parse(raw) as DeckFile;
  } catch (e) {
    console.error("牌库 JSON 解析失败：", e);
    process.exit(1);
  }

  const errors: string[] = [];

  if (!parsed.cards || !Array.isArray(parsed.cards)) {
    errors.push("顶层字段 cards 不存在或不是数组。");
  } else {
    if (parsed.cards.length !== 78) {
      errors.push(`牌数量应为 78，目前为 ${parsed.cards.length}。`);
    }

    parsed.cards.forEach((card, index) => {
      const prefix = `cards[${index}]`;
      if (!card.id) errors.push(`${prefix} 缺少 id`);
      if (!card.name) errors.push(`${prefix} 缺少 name`);
      if (!card.arcana) errors.push(`${prefix} 缺少 arcana`);
      if (card.suit === undefined) errors.push(`${prefix} 缺少 suit`);
      if (card.rank === undefined) errors.push(`${prefix} 缺少 rank`);
      if (card.number === undefined || card.number === null) {
        errors.push(`${prefix} 缺少 number`);
      }
      if (typeof card.planetNeedsSupplement !== "boolean") {
        errors.push(`${prefix} 的 planetNeedsSupplement 不是布尔值`);
      }
    });
  }

  if (errors.length > 0) {
    console.error("牌库校验失败：");
    for (const err of errors) {
      console.error(" -", err);
    }
    process.exit(1);
  }

  console.log("✅ 牌库校验通过：78 张牌，字段完整。");
  process.exit(0);
}

main();

