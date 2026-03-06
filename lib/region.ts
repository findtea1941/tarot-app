/**
 * 中国省市区三级联动数据（基于 element-china-area-data，value=code, label=name）
 * 按需从树形数据中取当前层级，避免一次性渲染全国区县
 */
import { regionData } from "element-china-area-data";

export interface RegionItem {
  code: string;
  name: string;
}

interface TreeNode {
  value: string;
  label: string;
  children?: TreeNode[];
}

const tree = regionData as TreeNode[];

/** 省级列表（不含“全部”） */
export function getProvinces(): RegionItem[] {
  return tree.map((p) => ({ code: p.value, name: p.label }));
}

/** 某省下的市列表 */
export function getCities(provinceCode: string): RegionItem[] {
  const province = tree.find((p) => p.value === provinceCode);
  const children = province?.children;
  if (!children?.length) return [];
  return children.map((c) => ({ code: c.value, name: c.label }));
}

/** 某市下的区县列表（需传入省 code 与市 code 以定位） */
export function getDistricts(provinceCode: string, cityCode: string): RegionItem[] {
  const province = tree.find((p) => p.value === provinceCode);
  const city = province?.children?.find((c) => c.value === cityCode);
  const children = city?.children;
  if (!children?.length) return [];
  return children.map((d) => ({ code: d.value, name: d.label }));
}

/** 默认地点：上海市 -> 上海市(市辖区) -> 浦东新区 */
export const DEFAULT_PROVINCE_CODE = "310000";
export const DEFAULT_CITY_CODE = "310100";
export const DEFAULT_DISTRICT_CODE = "310115";
