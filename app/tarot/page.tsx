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
  DEFAULT_PROVINCE_CODE,
  DEFAULT_CITY_CODE,
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

  // 地点（中国省市）：默认 上海市 / 上海市(市辖区)
  const [provinceCode, setProvinceCode] = useState(DEFAULT_PROVINCE_CODE);
  const [cityCode, setCityCode] = useState(DEFAULT_CITY_CODE);

  // 省市数据仅在客户端加载，避免 SSR 报 window 未定义；挂载后再取数以保持一致
  const [regionReady, setRegionReady] = useState(false);
  useEffect(() => setRegionReady(true), []);
  const provinces = useMemo(() => (regionReady ? getProvinces() : []), [regionReady]);
  const cities = useMemo(
    () => (regionReady ? getCities(provinceCode) : []),
    [regionReady, provinceCode]
  );

  // 改省：市保留同 code 或取第一个
  const handleProvinceChange = useCallback((newProvinceCode: string) => {
    setProvinceCode(newProvinceCode);
    const nextCities = getCities(newProvinceCode);
    const keepCity = nextCities.some((c) => c.code === cityCode);
    const nextCityCode = keepCity ? cityCode : nextCities[0]?.code ?? "";
    setCityCode(nextCityCode);
  }, [cityCode]);

  const handleCityChange = useCallback((newCityCode: string) => {
    setCityCode(newCityCode);
  }, []);

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
        } else {
          setProvinceCode(DEFAULT_PROVINCE_CODE);
          setCityCode(DEFAULT_CITY_CODE);
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

  function normalizeDatetimeLocalInput(raw: string): string {
    if (!raw) return "";
    const [datePart, timePart] = raw.split("T");
    const [year = "", month, day] = datePart.split("-");
    const normalizedDate = [year.slice(0, 4), month, day]
      .filter((part) => part != null)
      .join("-");
    return timePart == null ? normalizedDate : `${normalizedDate}T${timePart}`;
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
    if (!spreadType) return "请选择牌阵类型";
    return "";
  }

  function buildLocation(): Location {
    const provinceName = provinces.find((p) => p.code === provinceCode)?.name ?? "";
    const cityName = cities.find((c) => c.code === cityCode)?.name ?? "";
    // 直辖市：市辖区 展示为省名，以省-市格式展示
    const cityDisplay =
      cityName === "市辖区"
        ? provinceName
        : cityName;
    const label = [provinceName, cityDisplay].filter(Boolean).join("-");
    return {
      provinceCode,
      provinceName,
      cityCode,
      cityName,
      districtCode: "",
      districtName: "",
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
    return <div className="text-sm text-slate-500">加载中…</div>;
  }

  return (
    <div className="min-h-[calc(100vh-96px)] bg-white">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e7f8f0] shadow-inner">
            <span className="text-3xl font-semibold leading-none text-tarot-green">+</span>
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900">新建塔罗案例 · 基础信息</h1>
        </div>

        <div className="mx-auto max-w-3xl overflow-hidden rounded-[30px] border border-[#dceee6] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.07)]">
          <div className="flex items-center justify-between border-b border-[#ebf4f0] px-7 py-5">
            <h2 className="text-base font-semibold text-slate-900">基本信息登记</h2>
            <p className="text-xs font-medium tracking-[0.2em] text-slate-400">STEP 1 OF 2</p>
          </div>
          <div className="space-y-6 px-7 py-7">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">问题 <span className="text-red-400">*</span></label>
              <input
                type="text"
                className="w-full rounded-2xl border border-[#dfebe5] bg-[#f8fbfa] px-4 py-3 text-slate-800 placeholder-slate-400 outline-none transition focus:border-tarot-green focus:ring-2 focus:ring-emerald-100"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="例如：这段关系会怎么发展？"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">问题背景（可选）</label>
              <textarea
                className="min-h-32 w-full rounded-2xl border border-[#dfebe5] bg-[#f8fbfa] px-4 py-3 text-slate-800 placeholder-slate-400 outline-none transition focus:border-tarot-green focus:ring-2 focus:ring-emerald-100"
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                placeholder="补充背景信息…"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">分类 <span className="text-red-400">*</span></label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`rounded-full border px-5 py-2.5 text-sm font-medium transition-colors ${
                      category === c
                        ? "border-tarot-green bg-tarot-green text-white shadow-[0_8px_18px_rgba(5,150,105,0.18)]"
                        : "border-[#e2ebe7] bg-white text-slate-600 hover:border-[#bedfce] hover:text-slate-800"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">抽牌时间 <span className="text-red-400">*</span></label>
                <input
                  type="datetime-local"
                  className="w-full rounded-2xl border border-[#dfebe5] bg-[#f8fbfa] px-4 py-3 text-slate-800 outline-none transition focus:border-tarot-green focus:ring-2 focus:ring-emerald-100"
                  value={drawAt}
                  min="1900-01-01T00:00"
                  max="2099-12-31T23:59"
                  step={60}
                  onChange={(e) => setDrawAt(normalizeDatetimeLocalInput(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">牌阵类型 <span className="text-red-400">*</span></label>
                <select
                  className="w-full rounded-2xl border border-[#dfebe5] bg-[#f8fbfa] px-4 py-3 text-slate-800 outline-none transition focus:border-tarot-green focus:ring-2 focus:ring-emerald-100"
                  value={spreadType}
                  onChange={(e) => setSpreadType(e.target.value as typeof spreadType)}
                >
                  <option value="">请选择</option>
                  {SPREAD_TYPES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-3 rounded-[24px] border border-[#e1ece8] bg-[#fbfdfc] p-5">
              <h3 className="text-sm font-medium text-slate-700">地点（省-市） <span className="text-red-400">*</span></h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs text-slate-500">省/直辖市</label>
                  <select
                    className="mt-1 w-full rounded-2xl border border-[#dfebe5] bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-tarot-green focus:ring-2 focus:ring-emerald-100"
                    value={provinceCode}
                    onChange={(e) => handleProvinceChange(e.target.value)}
                  >
                    <option value="">请选择</option>
                    {provinces.map((p) => (
                      <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500">市</label>
                  <select
                    className="mt-1 w-full rounded-2xl border border-[#dfebe5] bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-tarot-green focus:ring-2 focus:ring-emerald-100"
                    value={cityCode}
                    onChange={(e) => handleCityChange(e.target.value)}
                  >
                    <option value="">请选择</option>
                    {cities.map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <div className="border-t border-[#ebf4f0] bg-[#fbfdfc] px-7 py-7">
            <button
              className="mx-auto block rounded-full bg-tarot-green px-10 py-3 text-sm font-medium text-white shadow-[0_14px_28px_rgba(5,150,105,0.22)] transition hover:bg-emerald-700 disabled:opacity-60"
              disabled={loading}
              onClick={handleNext}
            >
              {loading ? "处理中…" : "下一步：进入牌阵 →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
