"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getCaseById } from "@/lib/repo/caseRepo";
import { updateLenormandDraft } from "@/lib/repo/lenormandRepo";
import {
  LENORMAND_CATEGORIES,
  getLenormandSpreadCardCount,
} from "@/lib/lenormandTypes";
import { parseLenormandCards } from "@/lib/lenormandDeck";
import type { LenormandSpreadType } from "@/lib/lenormandTypes";

import {
  loadLenormandDraftFromStorage,
  saveLenormandDraftToStorage,
} from "@/lib/lenormandStorage";

const SPREAD_LABELS: Record<LenormandSpreadType, string> = {
  "linear-3": "线性三张",
  "linear-5": "线性五张",
  "nine-grid": "九宫格",
};

export function LenormandEntryClient() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.caseId as string;

  const [question, setQuestion] = useState("");
  const [background, setBackground] = useState("");
  const [drawDate, setDrawDate] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [cardsInput, setCardsInput] = useState("");
  const [optionAInput, setOptionAInput] = useState("");
  const [optionALabel, setOptionALabel] = useState("");
  const [optionBInput, setOptionBInput] = useState("");
  const [optionBLabel, setOptionBLabel] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(true);

  const [spreadType, setSpreadType] = useState<LenormandSpreadType>("nine-grid");
  const [isChoice, setIsChoice] = useState(false);

  const cardCount = getLenormandSpreadCardCount(spreadType);

  const loadDraft = useCallback(async (id: string) => {
    setLoadingDraft(true);
    try {
      const c = await getCaseById(id);
      const stored = loadLenormandDraftFromStorage(id);
      if (c && c.type === "lenormand") {
        setSpreadType((c.lenormandSpreadType ?? "nine-grid") as LenormandSpreadType);
        setIsChoice(c.lenormandIsChoice ?? false);
        // 优先使用 sessionStorage 中保留的输入（返回修改时恢复）
        if (stored) {
          setQuestion(stored.question);
          setBackground(stored.background);
          setDrawDate(stored.drawDate ?? "");
          setCategories(stored.categories);
          setCardsInput(stored.cardsInput);
          setOptionAInput(stored.optionAInput);
          setOptionALabel(stored.optionALabel);
          setOptionBInput(stored.optionBInput);
          setOptionBLabel(stored.optionBLabel);
        } else {
          setQuestion(c.question ?? "");
          setBackground(c.background ?? "");
          setDrawDate(c.lenormandDrawDate ?? "");
          setCategories(c.lenormandCategories ?? []);
          setCardsInput((c.lenormandCards ?? []).join("；"));
          setOptionAInput((c.lenormandOptionACards ?? []).join("；"));
          setOptionALabel(c.lenormandOptionALabel ?? "");
          setOptionBInput((c.lenormandOptionBCards ?? []).join("；"));
          setOptionBLabel(c.lenormandOptionBLabel ?? "");
        }
      }
    } finally {
      setLoadingDraft(false);
    }
  }, []);

  useEffect(() => {
    if (caseId) loadDraft(caseId);
  }, [caseId, loadDraft]);

  // 立即保存到 sessionStorage（每次输入变化），确保返回时能恢复
  useEffect(() => {
    if (!caseId || loadingDraft) return;
    saveLenormandDraftToStorage(caseId, {
      question,
      background,
      drawDate,
      categories,
      cardsInput,
      optionAInput,
      optionALabel,
      optionBInput,
      optionBLabel,
    });
  }, [
    caseId,
    loadingDraft,
    question,
    background,
    drawDate,
    categories,
    cardsInput,
    optionAInput,
    optionALabel,
    optionBInput,
    optionBLabel,
  ]);

  // 防抖保存到 DB（300ms），减少写入频率
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!caseId) return;
    saveTimerRef.current = setTimeout(() => {
      const cardsToSave = isChoice ? parseLenormandCards(optionAInput).valid : parseLenormandCards(cardsInput).valid;
      updateLenormandDraft(caseId, {
        question: question.trim() || undefined,
        background: background.trim() || undefined,
        lenormandDrawDate: drawDate.trim() || undefined,
        lenormandCategories: categories,
        lenormandCards: cardsToSave,
        lenormandOptionACards: parseLenormandCards(optionAInput).valid,
        lenormandOptionBCards: parseLenormandCards(optionBInput).valid,
        lenormandOptionALabel: optionALabel.trim() || undefined,
        lenormandOptionBLabel: optionBLabel.trim() || undefined,
      }).catch(() => {});
    }, 300);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [
    caseId,
    question,
    background,
    drawDate,
    categories,
    cardsInput,
    optionAInput,
    optionALabel,
    optionBInput,
    optionBLabel,
    isChoice,
    spreadType,
  ]);

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const { valid: mainValid, invalid: mainInvalid } = parseLenormandCards(
    cardsInput
  );
  const { valid: aValid, invalid: aInvalid } = parseLenormandCards(optionAInput);
  const { valid: bValid, invalid: bInvalid } = parseLenormandCards(optionBInput);

  function getDuplicates(arr: string[]): string[] {
    const seen = new Set<string>();
    const dupes = new Set<string>();
    for (const x of arr) {
      if (seen.has(x)) dupes.add(x);
      else seen.add(x);
    }
    return [...dupes];
  }

  function validate(): string {
    if (!question.trim()) return "请填写问题";
    if (categories.length === 0) return "请至少选择一个类型";
    if (!isChoice) {
      if (mainValid.length !== cardCount)
        return `主牌阵需要 ${cardCount} 张牌，当前 ${mainValid.length} 张`;
      if (mainInvalid.length > 0)
        return `无效牌名：${mainInvalid.join("、")}`;
      const dupes = getDuplicates(mainValid);
      if (dupes.length > 0) return `存在重复的牌：${dupes.join("、")}`;
    } else {
      if (aValid.length !== cardCount)
        return `选项 A 需要 ${cardCount} 张牌，当前 ${aValid.length} 张`;
      if (bValid.length !== cardCount)
        return `选项 B 需要 ${cardCount} 张牌，当前 ${bValid.length} 张`;
      if (aInvalid.length > 0) return `选项 A 无效牌名：${aInvalid.join("、")}`;
      if (bInvalid.length > 0) return `选项 B 无效牌名：${bInvalid.join("、")}`;
      if (!optionALabel.trim()) return "请填写选项 A 名称";
      if (!optionBLabel.trim()) return "请填写选项 B 名称";
      const dupesA = getDuplicates(aValid);
      if (dupesA.length > 0) return `选项 A 存在重复的牌：${dupesA.join("、")}`;
      const dupesB = getDuplicates(bValid);
      if (dupesB.length > 0) return `选项 B 存在重复的牌：${dupesB.join("、")}`;
    }
    return "";
  }

  async function handleConfirm() {
    setError("");
    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    setLoading(true);
    try {
      // 二择一用选项A牌阵作为主展示；单牌阵用主牌阵
      const cardsToSave = isChoice ? aValid : mainValid;
      await updateLenormandDraft(caseId, {
        question: question.trim(),
        background: background.trim() || undefined,
        lenormandDrawDate: drawDate.trim() || undefined,
        lenormandCategories: categories,
        lenormandCards: cardsToSave,
        lenormandOptionACards: aValid,
        lenormandOptionBCards: bValid,
        lenormandOptionALabel: optionALabel.trim(),
        lenormandOptionBLabel: optionBLabel.trim(),
      });
      saveLenormandDraftToStorage(caseId, {
        question: question.trim(),
        background: background.trim(),
        drawDate,
        categories,
        cardsInput,
        optionAInput,
        optionALabel,
        optionBInput,
        optionBLabel,
      });
      // 通过 URL 传参确保分析页能拿到牌阵数据
      const params = new URLSearchParams();
      params.set("spread", spreadType);
      params.set("q", question.trim().slice(0, 200));
      if (background.trim()) params.set("bg", background.trim().slice(0, 500));
      if (isChoice) {
        params.set("choice", "1");
        params.set("cardsA", JSON.stringify(aValid));
        params.set("cardsB", JSON.stringify(bValid));
        params.set("labelA", optionALabel.trim());
        params.set("labelB", optionBLabel.trim());
      } else {
        params.set("cards", JSON.stringify(cardsToSave));
      }
      router.push(`/lenormand/${caseId}/analysis?${params.toString()}`);
    } catch {
      setError("保存失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    // 返回上一步前先保存，确保数据不丢失
    saveLenormandDraftToStorage(caseId, {
      question,
      background,
      drawDate,
      categories,
      cardsInput,
      optionAInput,
      optionALabel,
      optionBInput,
      optionBLabel,
    });
    const cardsToSave = isChoice ? parseLenormandCards(optionAInput).valid : parseLenormandCards(cardsInput).valid;
    try {
      await updateLenormandDraft(caseId, {
        question: question.trim() || undefined,
        background: background.trim() || undefined,
        lenormandDrawDate: drawDate.trim() || undefined,
        lenormandCategories: categories,
        lenormandCards: cardsToSave,
        lenormandOptionACards: parseLenormandCards(optionAInput).valid,
        lenormandOptionBCards: parseLenormandCards(optionBInput).valid,
        lenormandOptionALabel: optionALabel.trim() || undefined,
        lenormandOptionBLabel: optionBLabel.trim() || undefined,
      });
    } catch {
      // 忽略保存失败，storage 已有备份
    }
    router.push(`/lenormand?caseId=${caseId}`);
  }

  if (loadingDraft) {
    return (
      <div className="flex min-h-[calc(100vh-96px)] items-center justify-center bg-white">
        <p className="text-sm text-slate-500">加载中…</p>
      </div>
    );
  }

  const spreadLabel = isChoice
    ? `二择一-${SPREAD_LABELS[spreadType]}`
    : SPREAD_LABELS[spreadType];

  return (
    <div className="min-h-[calc(100vh-96px)] bg-white">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            雷诺曼 · 信息录入
          </h1>
          <p className="mt-2 text-sm text-slate-500">{spreadLabel}</p>
        </div>

        <div className="mx-auto max-w-3xl overflow-hidden rounded-[30px] border border-[#dceee6] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.07)]">
          <div className="flex items-center justify-between border-b border-[#ebf4f0] px-7 py-5">
            <h2 className="text-base font-semibold text-slate-900">基本信息</h2>
            <p className="text-xs font-medium tracking-[0.2em] text-slate-400">
              STEP 2 OF 2
            </p>
          </div>
          <div className="space-y-6 px-7 py-7">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                问题 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                className="w-full rounded-2xl border border-[#dfebe5] bg-[#f8fbfa] px-4 py-3 text-slate-800 placeholder-slate-400 outline-none transition focus:border-tarot-green focus:ring-2 focus:ring-emerald-100"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="例如：这段关系会怎么发展？"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                问题背景（可选）
              </label>
              <textarea
                className="min-h-24 w-full rounded-2xl border border-[#dfebe5] bg-[#f8fbfa] px-4 py-3 text-slate-800 placeholder-slate-400 outline-none transition focus:border-tarot-green focus:ring-2 focus:ring-emerald-100"
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                placeholder="补充背景信息…"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                录入日期
              </label>
              <input
                type="date"
                className="w-full rounded-2xl border border-[#dfebe5] bg-[#f8fbfa] px-4 py-3 text-slate-800 outline-none transition focus:border-tarot-green focus:ring-2 focus:ring-emerald-100"
                value={drawDate}
                onChange={(e) => setDrawDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                类型 <span className="text-red-400">*</span>（多选）
              </label>
              <div className="flex flex-wrap gap-2">
                {LENORMAND_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCategory(c)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      categories.includes(c)
                        ? "border-tarot-green bg-tarot-green text-white"
                        : "border-[#e2ebe7] bg-white text-slate-600 hover:border-[#bedfce]"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {!isChoice ? (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  主牌阵（{cardCount} 张） <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className="w-full rounded-2xl border border-[#dfebe5] bg-[#f8fbfa] px-4 py-3 font-mono text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-tarot-green focus:ring-2 focus:ring-emerald-100"
                  value={cardsInput}
                  onChange={(e) => setCardsInput(e.target.value)}
                  placeholder="分号或换行分隔，支持编号(01-40)或牌名，如：01；02；骑士；四叶草"
                />
                <p className="text-xs text-slate-500">
                  已输入 {mainValid.length}/{cardCount} 张
                  {mainInvalid.length > 0 && (
                    <span className="ml-2 text-red-500">
                      无效：{mainInvalid.join("、")}
                    </span>
                  )}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    选项 A 名称 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-2xl border border-[#dfebe5] bg-[#f8fbfa] px-4 py-3 text-slate-800 placeholder-slate-400 outline-none transition focus:border-tarot-green focus:ring-2 focus:ring-emerald-100"
                    value={optionALabel}
                    onChange={(e) => setOptionALabel(e.target.value)}
                    placeholder="例如：留在现公司"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    选项 A 牌阵（{cardCount} 张） <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-2xl border border-[#dfebe5] bg-[#f8fbfa] px-4 py-3 font-mono text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-tarot-green focus:ring-2 focus:ring-emerald-100"
                    value={optionAInput}
                    onChange={(e) => setOptionAInput(e.target.value)}
                    placeholder="分号或换行分隔"
                  />
                  <p className="text-xs text-slate-500">
                    已输入 {aValid.length}/{cardCount} 张
                    {aInvalid.length > 0 && (
                      <span className="ml-2 text-red-500">
                        无效：{aInvalid.join("、")}
                      </span>
                    )}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    选项 B 名称 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-2xl border border-[#dfebe5] bg-[#f8fbfa] px-4 py-3 text-slate-800 placeholder-slate-400 outline-none transition focus:border-tarot-green focus:ring-2 focus:ring-emerald-100"
                    value={optionBLabel}
                    onChange={(e) => setOptionBLabel(e.target.value)}
                    placeholder="例如：跳槽到新公司"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    选项 B 牌阵（{cardCount} 张） <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-2xl border border-[#dfebe5] bg-[#f8fbfa] px-4 py-3 font-mono text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-tarot-green focus:ring-2 focus:ring-emerald-100"
                    value={optionBInput}
                    onChange={(e) => setOptionBInput(e.target.value)}
                    placeholder="分号或换行分隔"
                  />
                  <p className="text-xs text-slate-500">
                    已输入 {bValid.length}/{cardCount} 张
                    {bInvalid.length > 0 && (
                      <span className="ml-2 text-red-500">
                        无效：{bInvalid.join("、")}
                      </span>
                    )}
                  </p>
                </div>
              </>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <div className="flex items-center justify-between border-t border-[#ebf4f0] bg-[#fbfdfc] px-7 py-7">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 rounded-full border border-[#cce7d9] bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-[#f4fbf8]"
              title="返回上一步"
            >
              <span className="text-base">←</span>
              返回上一步
            </button>
            <div className="flex gap-4">
              <button
                onClick={handleCancel}
                className="rounded-full border border-[#cce7d9] bg-white px-8 py-3 text-sm font-medium text-slate-600 transition hover:bg-[#f4fbf8]"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="rounded-full bg-tarot-green px-8 py-3 text-sm font-medium text-white shadow-[0_14px_28px_rgba(5,150,105,0.22)] transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading ? "保存中…" : "确定"}
              </button>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          支持编号 01–40 或牌名，如：骑士、四叶草、船…
        </p>
      </div>
    </div>
  );
}
