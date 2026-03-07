/**
 * 六芒星/时间流牌阵：1–3 号位名称的六选一变体
 */

export const TIME_AXIS_VARIANTS = [
  { id: "past-present-future", names: ["过去", "现在", "未来"] },
  { id: "base-process-result", names: ["基础", "过程", "结果"] },
  { id: "cause-process-result", names: ["起因", "经过", "结果"] },
  { id: "motive-plan-action", names: ["动机", "计划", "行动"] },
  { id: "start-develop-end", names: ["开始", "发展", "结束"] },
  { id: "create-consolidate-harvest", names: ["创造", "巩固", "收获"] },
] as const;

export const DEFAULT_TIME_AXIS_VARIANT = "past-present-future";

export type TimeAxisVariantId = (typeof TIME_AXIS_VARIANTS)[number]["id"];

/** 下拉展示文案（不含 AB 前缀） */
export function getTimeAxisVariantLabel(id: string): string {
  const v = TIME_AXIS_VARIANTS.find((x) => x.id === id);
  return v ? v.names.join("-") : id;
}

/** 根据变体 id 返回 1、2、3 号位名称 */
export function getTimeAxisSlotNames(variantId: string | undefined): [string, string, string] {
  const v = TIME_AXIS_VARIANTS.find((x) => x.id === variantId);
  if (v) return [...v.names];
  return ["过去", "现在", "未来"];
}
