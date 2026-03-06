/**
 * 中国省市联动数据（基于 element-china-area-data，value=code, label=name）
 * 仅使用省、市两级；区县函数与默认值仅保留兼容。
 * 仅在客户端加载该包，避免 SSR 时 window 未定义报错。
 */
export interface RegionItem {
  code: string;
  name: string;
}

interface TreeNode {
  value: string;
  label: string;
  children?: TreeNode[];
}

let treeCache: TreeNode[] | null = null;

function getTree(): TreeNode[] {
  if (typeof window === "undefined") return [];
  if (treeCache) return treeCache;
  // 仅客户端动态加载，避免服务端执行到 element-china-area-data 内部对 window 的引用
  const { regionData } = require("element-china-area-data");
  treeCache = regionData as TreeNode[];
  return treeCache;
}

/** 省级列表（不含“全部”）；SSR 时返回 [] */
export function getProvinces(): RegionItem[] {
  const tree = getTree();
  return tree.map((p) => ({ code: p.value, name: p.label }));
}

/** 某省下的市列表 */
export function getCities(provinceCode: string): RegionItem[] {
  const tree = getTree();
  const province = tree.find((p) => p.value === provinceCode);
  const children = province?.children;
  if (!children?.length) return [];
  return children.map((c) => ({ code: c.value, name: c.label }));
}

/** 某市下的区县列表（需传入省 code 与市 code 以定位） */
export function getDistricts(provinceCode: string, cityCode: string): RegionItem[] {
  const tree = getTree();
  const province = tree.find((p) => p.value === provinceCode);
  const city = province?.children?.find((c) => c.value === cityCode);
  const children = city?.children;
  if (!children?.length) return [];
  return children.map((d) => ({ code: d.value, name: d.label }));
}

/** 默认地点：上海市 -> 上海市(市辖区) */
export const DEFAULT_PROVINCE_CODE = "310000";
export const DEFAULT_CITY_CODE = "310100";
export const DEFAULT_DISTRICT_CODE = "310115";
