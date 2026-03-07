import type { SpreadType } from "@/lib/db";
import type { SpreadLayout } from "@/lib/spreadTypes";
import { chooseOneLayout } from "./chooseOne";
import { fourElementsLayout } from "./fourElements";
import { holyTriangleLayout } from "./holyTriangle";
import { hexagramLayout } from "./hexagram";
import { timeflowLayout } from "./timeflow";

const layoutMap: Record<SpreadType, SpreadLayout | null> = {
  "六芒星": hexagramLayout,
  "四元素": fourElementsLayout,
  "二择一": chooseOneLayout,
  "身心灵": null,
  "圣三角": holyTriangleLayout,
  "时间流": timeflowLayout,
  "无牌阵": null,
};

/** 根据牌阵类型取 layout，未接入的返回 null */
export function getLayout(spreadType: SpreadType): SpreadLayout | null {
  return layoutMap[spreadType] ?? null;
}

export { chooseOneLayout, fourElementsLayout, hexagramLayout, holyTriangleLayout, timeflowLayout };
