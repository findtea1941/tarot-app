/** 雷诺曼牌阵类型 */
export type LenormandSpreadType = "linear-3" | "linear-5" | "nine-grid";

/** 雷诺曼类型标签（多选，与塔罗分类一致） */
export const LENORMAND_CATEGORIES = [
  "情感",
  "事业",
  "学业",
  "健康",
  "灵性",
  "运势",
  "动物",
  "寻物",
  "其他",
  "开放式问题",
  "封闭式问题",
] as const;

export type LenormandCategory = (typeof LENORMAND_CATEGORIES)[number];

/** 牌阵所需牌数 */
export function getLenormandSpreadCardCount(
  spreadType: LenormandSpreadType
): number {
  switch (spreadType) {
    case "linear-3":
      return 3;
    case "linear-5":
      return 5;
    case "nine-grid":
      return 9;
    default:
      return 0;
  }
}
