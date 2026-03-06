"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createTarotDraft,
  getCaseById,
  updateTarotDraft,
} from "@/lib/repo/caseRepo";
import type { Case, Location, SpreadType } from "@/lib/db";
import {
  getProvinces,
  getCities,
  getDistricts,
  DEFAULT_PROVINCE_CODE,
  DEFAULT_CITY_CODE,
  DEFAULT_DISTRICT_CODE,
} from "@/lib/region";

const CATEGORIES = ["情感", "事业", "学业", "其他"] as const;
const SPREAD_TYPES = [
  "六芒星",
  "四元素",
  "二择一",
  "身心灵",
  "圣三角",
  "时间流",
  "无牌阵",
] as const;

export default function TarotNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseId = searchParams.get("caseId");

  const [question, setQuestion] = useState("");
  const [background, setBackground] = useState("");
  const [category, setCategory] = useState<typeof CATEGORIES[number] | "">("");
  const [drawAt, setDrawAt] = useState("");
  const [spreadType, setSpreadType] = useState<typeof SPREAD_TYPES[number] | "">("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(!!caseId);

  // 地点（中国省市区）：默认 上海市 / 上海市(市辖区) / 浦东新区
  const [provinceCode, setProvinceCode] = useState(DEFAULT_PROVINCE_CODE);
  const [cityCode, setCityCode] = useState(DEFAULT_CITY_CODE);
  const [districtCode, setDistrictCode] = useState(DEFAULT_DISTRICT_CODE);

  const provinces = useMemo(() => getProvinces(), []);
  const cities = useMemo(() => getCities(provinceCode), [provinceCode]);
  const districts = useMemo(
    () => getDistricts(provinceCode, cityCode),
    [provinceCode, cityCode]
  );

  // 改省：市保留同 code 或取第一个，区保留或取第一个
  const handleProvinceChange = useCallback((newProvinceCode: string) => {
    setProvinceCode(newProvinceCode);
    const nextCities = getCities(newProvinceCode);
    const keepCity = nextCities.some((c) => c.code === cityCode);
    const nextCityCode = keepCity ? cityCode : nextCities[0]?.code ?? "";
    setCityCode(nextCityCode);
    const nextDistricts = getDistricts(newProvinceCode, nextCityCode);
    const keepDistrict = nextDistricts.some((d) => d.code === districtCode);
    setDistrictCode(keepDistrict ? districtCode : nextDistricts[0]?.code ?? "");
  }, [cityCode, districtCode]);

  // 改市：区保留或取第一个
  const handleCityChange = useCallback((newCityCode: string) => {
    setCityCode(newCityCode);
    const nextDistricts = getDistricts(provinceCode, newCityCode);
    const keepDistrict = nextDistricts.some((d) => d.code === districtCode);
    setDistrictCode(keepDistrict ? districtCode : nextDistricts[0]?.code ?? "");
  }, [provinceCode, districtCode]);

  const loadDraft = useCallback(async (id: string) => {
    setLoadingDraft(true);
    try {
      const c = await getCaseById(id);
      if (c && c.type === "tarot") {
        setQuestion(c.question ?? "");
        setBackground(c.background ?? "");
        setCategory((c.category as typeof CATEGORIES[number]) ?? "");
        setDrawAt(c.drawTime ? formatForDatetimeLocal(c.drawTime) : "");
        setSpreadType((c.spreadType as typeof SPREAD_TYPES[number]) ?? "");
        if (c.location) {
          setProvinceCode(c.location.provinceCode);
          setCityCode(c.location.cityCode);
          setDistrictCode(c.location.districtCode);
        } else {
          setProvinceCode(DEFAULT_PROVINCE_CODE);
          setCityCode(DEFAULT_CITY_CODE);
          setDistrictCode(DEFAULT_DISTRICT_CODE);
        }
      }
    } finally {
      setLoadingDraft(false);
    }
  }, []);

  useEffect(() => {
    if (caseId) loadDraft(caseId);
  }, [caseId, loadDraft]);

  function formatForDatetimeLocal(isoOrLocal: string): string {
    if (!isoOrLocal) return "";
    const d = new Date(isoOrLocal);
    if (isNaN(d.getTime())) return isoOrLocal;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${day}T${h}:${min}`;
  }

  function toISODrawTime(local: string): string {
    if (!local) return "";
    const d = new Date(local);
    return isNaN(d.getTime()) ? local : d.toISOString();
  }

  function validate(): string {
    if (!question.trim()) return "请填写问题";
    if (!category) return "请选择分类";
    if (!drawAt.trim()) return "请选择抽牌时间";
    if (!provinceCode) return "请选择省/直辖市";
    if (!cityCode) return "请选择市";
    if (!districtCode) return "请选择区/县";
    if (!spreadType) return "请选择牌阵类型";
    return "";
  }

  function buildLocation(): Location {
    const provinceName = provinces.find((p) => p.code === provinceCode)?.name ?? "";
    const cityName = cities.find((c) => c.code === cityCode)?.name ?? "";
    const districtName = districts.find((d) => d.code === districtCode)?.name ?? "";
    // 直辖市：市辖区 展示为 省名（如 上海市·上海市·浦东新区）
    const cityDisplay =
      provinceCode === DEFAULT_PROVINCE_CODE && cityName === "市辖区"
        ? provinceName
        : cityName;
    const label = [provinceName, cityDisplay, districtName].filter(Boolean).join("·");
    return {
      provinceCode,
      provinceName,
      cityCode,
      cityName,
      districtCode,
      districtName,
      label,
    };
  }

  async function handleNext() {
    setError("");
    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    setLoading(true);
    try {
      const drawTime = toISODrawTime(drawAt);
      const cat = category as "情感" | "事业" | "学业" | "其他";
      const st = spreadType as SpreadType;
      const location = buildLocation();

      if (caseId) {
        await updateTarotDraft(caseId, {
          question: question.trim(),
          background: background.trim() || undefined,
          category: cat,
          drawTime,
          spreadType: st,
          location,
        });
        router.push(`/tarot/${caseId}/spread`);
      } else {
        const draft = await createTarotDraft({
          question: question.trim(),
          background: background.trim() || undefined,
          category: cat,
          drawTime,
          spreadType: st,
          location,
        });
        router.push(`/tarot/${draft.id}/spread`);
      }
    } catch (e) {
      setError("保存失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  if (loadingDraft) {
    return <div className="text-slate-400 text-sm">加载中…</div>;
  }

  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="text-2xl font-semibold">新建塔罗案例 · 基础信息</h1>

      <div className="space-y-2">
        <label className="block text-sm text-slate-300">问题 <span className="text-red-400">*</span></label>
        <input
          type="text"
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="例如：这段关系会怎么发展？"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm text-slate-300">问题背景（可选）</label>
        <textarea
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 min-h-24"
          value={background}
          onChange={(e) => setBackground(e.target.value)}
          placeholder="补充背景信息…"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm text-slate-300">分类 <span className="text-red-400">*</span></label>
        <select
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
          value={category}
          onChange={(e) => setCategory(e.target.value as typeof category)}
        >
          <option value="">请选择</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-sm text-slate-300">抽牌时间 <span className="text-red-400">*</span></label>
        <input
          type="datetime-local"
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
          value={drawAt}
          onChange={(e) => setDrawAt(e.target.value)}
        />
      </div>

      {/* 地点（中国省市区）：在抽牌时间之后、牌阵类型之前 */}
      <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-4 space-y-4">
        <h2 className="text-sm font-medium text-slate-300">地点（中国省市区） <span className="text-red-400">*</span></h2>
        <div className="space-y-2">
          <label className="block text-sm text-slate-400">省/直辖市</label>
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
            value={provinceCode}
            onChange={(e) => handleProvinceChange(e.target.value)}
          >
            <option value="">请选择</option>
            {provinces.map((p) => (
              <option key={p.code} value={p.code}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-sm text-slate-400">市</label>
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
            value={cityCode}
            onChange={(e) => handleCityChange(e.target.value)}
          >
            <option value="">请选择</option>
            {cities.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-sm text-slate-400">区/县</label>
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
            value={districtCode}
            onChange={(e) => setDistrictCode(e.target.value)}
          >
            <option value="">请选择</option>
            {districts.map((d) => (
              <option key={d.code} value={d.code}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm text-slate-300">牌阵类型 <span className="text-red-400">*</span></label>
        <select
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
          value={spreadType}
          onChange={(e) => setSpreadType(e.target.value as typeof spreadType)}
        >
          <option value="">请选择</option>
          {SPREAD_TYPES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        className="px-4 py-2 rounded-md bg-tarot-card border border-slate-700 disabled:opacity-60"
        disabled={loading}
        onClick={handleNext}
      >
        {loading ? "处理中…" : "下一步：进入牌阵"}
      </button>
    </div>
  );
}
