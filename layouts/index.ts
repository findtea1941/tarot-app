import type { SpreadType } from "@/lib/db";
import type { SpreadLayout, SlotDef } from "@/lib/spreadTypes";
import { getTimeAxisSlotNames } from "@/lib/timeAxisVariant";
import { annualLayout } from "./annual";
import { bodyMindSpiritLayout } from "./bodyMindSpirit";
import { chooseOneLayout } from "./chooseOne";
import { fourElementsLayout } from "./fourElements";
import { holyTriangleLayout } from "./holyTriangle";
import { hexagramLayout } from "./hexagram";
import { noSpreadLayout } from "./noSpread";
import { timeflowLayout } from "./timeflow";

const layoutMap: Record<SpreadType, SpreadLayout | null> = {
  "六芒星": hexagramLayout,
  "四元素": fourElementsLayout,
  "二择一": chooseOneLayout,
  "身心灵": bodyMindSpiritLayout,
  "圣三角": holyTriangleLayout,
  "时间流": timeflowLayout,
  "无牌阵": noSpreadLayout,
  "年运": annualLayout,
};

/** 根据牌阵类型取 layout，未接入的返回 null */
export function getLayout(spreadType: SpreadType): SpreadLayout | null {
  return layoutMap[spreadType] ?? null;
}

/** 六芒星/时间流：用 timeAxisVariant 覆盖 1、2、3 号位名称后返回新 layout（不改原对象） */
export function getLayoutWithTimeAxisVariant(
  layout: SpreadLayout | null,
  timeAxisVariant: string | undefined
): SpreadLayout | null {
  if (!layout) return null;
  const isTimeAxis = layout.id === "hexagram-7" || layout.id === "timeflow-3";
  if (!isTimeAxis || !timeAxisVariant) return layout;
  const [n1, n2, n3] = getTimeAxisSlotNames(timeAxisVariant);
  const slotNames: Record<string, string> = { "1": n1, "2": n2, "3": n3 };
  const slots: SlotDef[] = layout.slots.map((s) =>
    slotNames[s.id] !== undefined
      ? { ...s, name: slotNames[s.id], meaning: slotNames[s.id] }
      : s
  );
  return { ...layout, slots };
}

export { annualLayout, bodyMindSpiritLayout, chooseOneLayout, fourElementsLayout, hexagramLayout, holyTriangleLayout, noSpreadLayout, timeflowLayout };
