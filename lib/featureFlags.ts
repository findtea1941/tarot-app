/**
 * 功能开关，构建时通过环境变量注入
 * NEXT_PUBLIC_FEATURE_LENORMAND=false 时仅保留塔罗功能
 */
export const FEATURE_LENORMAND =
  process.env.NEXT_PUBLIC_FEATURE_LENORMAND !== "false";
