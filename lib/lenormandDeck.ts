/**
 * 雷诺曼 40 张牌数据库（编号 1–40）
 * 支持用编号或牌名校验
 */
export const LENORMAND_CARDS = [
  { id: 1, name: "骑士" },
  { id: 2, name: "四叶草" },
  { id: 3, name: "船" },
  { id: 4, name: "房子" },
  { id: 5, name: "树" },
  { id: 6, name: "云" },
  { id: 7, name: "蛇" },
  { id: 8, name: "棺材" },
  { id: 9, name: "花束" },
  { id: 10, name: "镰刀" },
  { id: 11, name: "鞭子" },
  { id: 12, name: "鸟" },
  { id: 13, name: "孩子" },
  { id: 14, name: "狐狸" },
  { id: 15, name: "熊" },
  { id: 16, name: "星星" },
  { id: 17, name: "鹳鸟" },
  { id: 18, name: "狗" },
  { id: 19, name: "塔" },
  { id: 20, name: "花园" },
  { id: 21, name: "山" },
  { id: 22, name: "路口" },
  { id: 23, name: "老鼠" },
  { id: 24, name: "爱心" },
  { id: 25, name: "戒指" },
  { id: 26, name: "书" },
  { id: 27, name: "信" },
  { id: 28, name: "男人" },
  { id: 29, name: "女人" },
  { id: 30, name: "百合" },
  { id: 31, name: "太阳" },
  { id: 32, name: "月亮" },
  { id: 33, name: "钥匙" },
  { id: 34, name: "鱼" },
  { id: 35, name: "锚" },
  { id: 36, name: "十字架" },
  { id: 37, name: "灵体" },
  { id: 38, name: "香炉" },
  { id: 39, name: "床" },
  { id: 40, name: "市场" },
] as const;

/** 编号 -> 牌名 */
const BY_ID = new Map(LENORMAND_CARDS.map((c) => [c.id, c.name]));
/** 牌名 -> 编号 */
const BY_NAME = new Map(LENORMAND_CARDS.map((c) => [c.name, c.id]));

/**
 * 解析单张牌：支持编号（1、01）或牌名
 * @returns 牌名，若无效返回 null
 */
export function parseLenormandCard(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  // 编号
  const n = parseInt(s, 10);
  if (!isNaN(n) && n >= 1 && n <= 40) {
    return (BY_ID as Map<number, string>).get(n) ?? null;
  }
  // 牌名
  return (BY_NAME as Map<string, number>).has(s) ? s : null;
}

/**
 * 解析多张牌（分号分隔）
 * @returns { valid: string[], invalid: string[] }
 */
export function parseLenormandCards(input: string): {
  valid: string[];
  invalid: string[];
} {
  const parts = input
    .split(/[;；\n\r]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const p of parts) {
    const card = parseLenormandCard(p);
    if (card) valid.push(card);
    else invalid.push(p);
  }
  return { valid, invalid };
}

/** 获取牌名（用于展示） */
export function getLenormandCardName(idOrName: string): string {
  const n = parseInt(idOrName, 10);
  if (!isNaN(n) && n >= 1 && n <= 40) return (BY_ID as Map<number, string>).get(n) ?? idOrName;
  return (BY_NAME as Map<string, number>).has(idOrName) ? idOrName : idOrName;
}

/** 格式化编号为 01、02、03…（系统中统一使用两位编号） */
export function formatLenormandCardId(id: number): string {
  if (id >= 1 && id <= 40) return String(id).padStart(2, "0");
  return String(id);
}

/** 获取牌的系统编号（1-40），未知牌返回 undefined */
export function getLenormandCardId(name: string): number | undefined {
  return (BY_NAME as Map<string, number>).get(name);
}

/** 获取牌的系统展示格式：如 "01 骑士" */
export function getLenormandCardDisplay(name: string): string {
  const id = (BY_NAME as Map<string, number>).get(name);
  if (id) return `${formatLenormandCardId(id)} ${name}`;
  return name;
}
