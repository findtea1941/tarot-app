/**
 * 塔罗分类在后续页面中以单独 tab（圈）展示时的配色，按分类名称固定配色。
 * 色系与绿色主视觉协调：青绿/蓝绿/琥珀/暖灰等，无紫色。
 * 使用 inline style 保证颜色在牌阵录入/分析页稳定生效。
 */

const BASE_PILL_CLASS = "rounded-full border px-3 py-1.5 text-xs font-medium";

/** 按分类名称：背景色、边框色、文字色（与绿色 UI 搭配的和谐色系） */
const CATEGORY_COLORS: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  情感: { bg: "#fff7ed", border: "#fed7aa", text: "#b45309" },       // 暖杏
  事业: { bg: "#ccfbf1", border: "#5eead4", text: "#0f766e" },     // 青绿
  学业: { bg: "#fef9c3", border: "#fde047", text: "#a16207" },     // 琥珀
  健康: { bg: "#d4f0e3", border: "#a8ddc8", text: "#047857" },     // 主绿
  灵性: { bg: "#e0f2fe", border: "#7dd3fc", text: "#0369a1" },     // 天蓝
  其他: { bg: "#f1f5f9", border: "#cbd5e1", text: "#475569" },     // 灰
  开放式问题: { bg: "#cffafe", border: "#67e8f9", text: "#0e7490" }, // 青
  封闭式问题: { bg: "#e7e5e4", border: "#a8a29e", text: "#57534e" }, // 暖灰
};

const FALLBACK_COLORS = { bg: "#f1f5f9", border: "#cbd5e1", text: "#475569" };

export type CategoryPillStyle = {
  className: string;
  style: { backgroundColor: string; borderColor: string; color: string };
};

/**
 * 根据分类名称返回标签的 className 与 style；未知分类使用灰色兜底。
 */
export function getCategoryPillStyle(categoryName: string): CategoryPillStyle {
  const colors = CATEGORY_COLORS[categoryName] ?? FALLBACK_COLORS;
  return {
    className: BASE_PILL_CLASS,
    style: {
      backgroundColor: colors.bg,
      borderColor: colors.border,
      color: colors.text,
    },
  };
}

/** 案例分析界面：牌阵类型标签统一样式（与分类圈区分） */
export const SPREAD_TYPE_PILL_CLASS =
  "rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-3 py-1.5 text-xs font-medium text-slate-600";