"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  loadTarotDraftFromStorage,
  saveTarotDraftToStorage,
} from "@/lib/tarotDraftStorage";
import {
  DEFAULT_TIME_AXIS_VARIANT,
  getTimeAxisVariantLabel,
  TIME_AXIS_VARIANTS,
} from "@/lib/timeAxisVariant";

const CATEGORIES = [
  "情感",
  "事业",
  "学业",
  "健康",
  "灵性",
  "运势",
  "其他",
  "开放式问题",
  "封闭式问题",
] as const;
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
  const [categories, setCategories] = useState<string[]>([]);
  const [drawDate, setDrawDate] = useState("");
  const [drawTime, setDrawTime] = useState("");
  const [spreadType, setSpreadType] = useState<typeof SPREAD_TYPES[number] | "">("");
  const [timeAxisVariant, setTimeAxisVariant] = useState(DEFAULT_TIME_AXIS_VARIANT);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // 用 URL 同步 state，解决 Next 在浏览器后退时 useSearchParams 不更新导致 caseId 为空的问题
  const [urlKey, setUrlKey] = useState(
    () => (typeof window !== "undefined" ? window.location.search : "")
  );
  const [loadingDraft, setLoadingDraft] = useState(() =>
    typeof window !== "undefined" ? window.location.search.includes("caseId=") : false
  );

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
      // 优先从 sessionStorage 恢复（与雷诺曼一致，浏览器后退时能保留）
      const stored = loadTarotDraftFromStorage(id);
      if (stored) {
        setQuestion(stored.question);
        setBackground(stored.background);
        setCategories(stored.categories ?? []);
        setDrawDate(stored.drawDate ?? "");
        setDrawTime(stored.drawTime ?? "");
        setSpreadType((stored.spreadType as typeof SPREAD_TYPES[number]) || "");
        setTimeAxisVariant(stored.timeAxisVariant || DEFAULT_TIME_AXIS_VARIANT);
        setProvinceCode(stored.provinceCode || DEFAULT_PROVINCE_CODE);
        setCityCode(stored.cityCode || DEFAULT_CITY_CODE);
        setLoadingDraft(false);
        return;
      }
      const c = await getCaseById(id);
      if (c && c.type === "tarot") {
        setQuestion(c.question ?? "");
        setBackground(c.background ?? "");
        setCategories(c.tarotCategories ?? (c.category ? [c.category] : []));
        if (c.drawTime) {
          const parsed = parseDrawTime(c.drawTime);
          setDrawDate(parsed.date);
          setDrawTime(parsed.time);
        } else {
          setDrawDate("");
          setDrawTime("");
        }
        setSpreadType((c.spreadType as typeof SPREAD_TYPES[number]) ?? "");
        setTimeAxisVariant(c.timeAxisVariant || DEFAULT_TIME_AXIS_VARIANT);
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

  // 始终从当前 URL 取 caseId 并加载草稿，避免 useSearchParams 在浏览器后退后不更新
  const searchForId =
    urlKey || (typeof window !== "undefined" ? window.location.search : "");
  const idFromUrl = searchForId
    ? new URLSearchParams(searchForId).get("caseId")
    : null;
  const effectiveId = idFromUrl || caseId;

  useEffect(() => {
    if (!effectiveId) return;
    loadDraft(effectiveId);
  }, [effectiveId, loadDraft]);

  // 从顶部导航直接进入 /tarot 时，始终打开一个全新的基础信息页，不保留上一份录入内容
  useEffect(() => {
    if (effectiveId) return;
    setLoadingDraft(false);
    setQuestion("");
    setBackground("");
    setCategories([]);
    setDrawDate("");
    setDrawTime("");
    setSpreadType("");
    setTimeAxisVariant(DEFAULT_TIME_AXIS_VARIANT);
    setProvinceCode(DEFAULT_PROVINCE_CODE);
    setCityCode(DEFAULT_CITY_CODE);
    setError("");
  }, [effectiveId]);

  // 浏览器后退/前进时同步 urlKey，使上面的 effect 用最新 URL 再拉草稿
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPopState = () => setUrlKey(window.location.search);
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setUrlKey(window.location.search);
    };
    window.addEventListener("popstate", onPopState);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  // 有 caseId 时把表单写入 sessionStorage（防抖），与雷诺曼一致，浏览器后退时能恢复
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const id = idFromUrl || caseId;
    if (!id || loadingDraft) return;
    saveTimerRef.current = setTimeout(() => {
      saveTarotDraftToStorage(id, {
        question,
        background,
        categories,
        drawDate,
        drawTime,
        spreadType,
        timeAxisVariant,
        provinceCode,
        cityCode,
      });
    }, 400);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [
    idFromUrl,
    caseId,
    loadingDraft,
    question,
    background,
    categories,
    drawDate,
    drawTime,
    spreadType,
    timeAxisVariant,
    provinceCode,
    cityCode,
  ]);

  function parseDrawTime(isoOrLocal: string): { date: string; time: string } {
    if (!isoOrLocal) return { date: "", time: "" };
    const d = new Date(isoOrLocal);
    if (isNaN(d.getTime())) return { date: "", time: "" };
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return { date: `${y}-${m}-${day}`, time: `${h}:${min}` };
  }

  function toISODrawTime(date: string, time: string): string {
    if (!date) return "";
    const timePart = (time || "00:00").trim();
    const m = timePart.match(/^(\d{1,2}):(\d{2})$/);
    const t = m ? `${m[1].padStart(2, "0")}:${m[2]}` : "00:00";
    const d = new Date(`${date}T${t}:00`);
    return isNaN(d.getTime()) ? "" : d.toISOString();
  }

  function validate(): string {
    if (!question.trim()) return "请填写问题";
    if (categories.length === 0) return "请至少选择一个分类";
    if (!drawDate.trim()) return "请选择抽牌日期";
    if (!drawTime.trim()) return "请填写抽牌时间";
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
      const isoDrawTime = toISODrawTime(drawDate, drawTime);
      const st = spreadType as SpreadType;
      const location = buildLocation();

      const timeAxis =
        st === "六芒星" || st === "时间流" ? timeAxisVariant : undefined;
      const currentCaseId = idFromUrl || caseId;
      let nextCaseId: string;
      const existingCase = currentCaseId ? await getCaseById(currentCaseId) : undefined;
      if (existingCase?.type === "tarot") {
        await updateTarotDraft(currentCaseId, {
          question: question.trim(),
          background: background.trim() || undefined,
          categories,
          drawTime: isoDrawTime,
          spreadType: st,
          timeAxisVariant: timeAxis,
          location,
        });
        nextCaseId = currentCaseId;
      } else {
        const draft = await createTarotDraft({
          question: question.trim(),
          background: background.trim() || undefined,
          categories,
          drawTime: isoDrawTime,
          spreadType: st,
          ...(timeAxis != null && timeAxis !== "" ? { timeAxisVariant: timeAxis } : {}),
          location,
        });
        nextCaseId = draft.id;
        await new Promise((r) => setTimeout(r, 0));
        const verify = await getCaseById(draft.id);
        if (!verify) throw new Error("Case not found after create");
      }
      // 写入 sessionStorage，与雷诺曼一致，浏览器后退时能恢复
      saveTarotDraftToStorage(nextCaseId, {
        question: question.trim(),
        background: background.trim(),
        categories,
        drawDate,
        drawTime,
        spreadType: st,
        timeAxisVariant: timeAxis,
        provinceCode,
        cityCode,
      });
      // 用带 caseId 的地址替换当前历史，这样浏览器后退时会回到 /tarot?caseId=xxx 并加载草稿
      router.replace(`/tarot?caseId=${nextCaseId}`);
      router.push(`/tarot/${nextCaseId}/spread`);
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
    <div className="min-h-[calc(100vh-96px)]">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#deeeec] shadow-inner">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[#059669] p-1">
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-4 w-4 text-[#d4f0e3]"
                aria-hidden
              >
                <rect x="10.5" y="0" width="3" height="24" />
                <rect x="0" y="10.5" width="24" height="3" />
              </svg>
            </div>
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
              <label className="block text-sm font-medium text-slate-700">分类 <span className="text-red-400">*</span>（多选）</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() =>
                      setCategories((prev) =>
                        prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
                      )
                    }
                    className={`rounded-full border px-5 py-2.5 text-sm font-medium transition-colors ${
                      categories.includes(c)
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
                <label className="block text-sm font-medium text-slate-700">抽牌日期 <span className="text-red-400">*</span></label>
                <input
                  type="date"
                  className="w-full rounded-2xl border border-[#dfebe5] bg-[#f8fbfa] px-4 py-3 text-slate-800 outline-none transition focus:border-tarot-green focus:ring-2 focus:ring-emerald-100"
                  value={drawDate}
                  min="1900-01-01"
                  max="2099-12-31"
                  onChange={(e) => setDrawDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">抽牌时间 <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  className="w-full rounded-2xl border border-[#dfebe5] bg-[#f8fbfa] px-4 py-3 text-slate-800 placeholder-slate-400 outline-none transition focus:border-tarot-green focus:ring-2 focus:ring-emerald-100"
                  value={drawTime}
                  onChange={(e) => setDrawTime(e.target.value)}
                  placeholder="例如：14:30"
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
              {(spreadType === "六芒星" || spreadType === "时间流") && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">时间流变形</label>
                  <select
                    className="w-full rounded-2xl border border-[#dfebe5] bg-[#f8fbfa] px-4 py-3 text-slate-800 outline-none transition focus:border-tarot-green focus:ring-2 focus:ring-emerald-100"
                    value={timeAxisVariant}
                    onChange={(e) => setTimeAxisVariant(e.target.value)}
                  >
                    {TIME_AXIS_VARIANTS.map((v) => (
                      <option key={v.id} value={v.id}>
                        {getTimeAxisVariantLabel(v.id)}
                        {v.id === DEFAULT_TIME_AXIS_VARIANT ? "（默认）" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
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
