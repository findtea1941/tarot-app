import { db, type Case } from "@/lib/db";
import type { LenormandSpreadType } from "@/lib/lenormandTypes";

/** 创建雷诺曼草稿（步骤1 点击下一步时调用） */
export async function createLenormandDraft(input: {
  spreadType: LenormandSpreadType;
  isChoice: boolean;
}): Promise<Case> {
  const now = Date.now();
  const spreadLabel =
    input.spreadType === "nine-grid"
      ? "九宫格"
      : input.spreadType === "linear-3"
        ? "线性三张"
        : "线性五张";
  const title = input.isChoice
    ? `二择一-${spreadLabel} | 草稿`
    : `${spreadLabel} | 草稿`;
  const item: Case = {
    id: crypto.randomUUID(),
    type: "lenormand",
    status: "draft",
    title,
    lenormandSpreadType: input.spreadType,
    lenormandIsChoice: input.isChoice,
    lenormandCategories: [],
    lenormandCards: [],
    lenormandOptionACards: [],
    lenormandOptionBCards: [],
    lenormandOptionALabel: undefined,
    lenormandOptionBLabel: undefined,
    createdAt: now,
    updatedAt: now,
  };
  await db.cases.add(item);
  return item;
}

/** 更新雷诺曼草稿（步骤2 返回修改或确定时调用） */
export async function updateLenormandDraft(
  id: string,
  input: Partial<{
    question: string;
    background: string;
    lenormandDrawDate: string;
    lenormandSpreadType: LenormandSpreadType;
    lenormandIsChoice: boolean;
    lenormandCategories: string[];
    lenormandCards: string[];
    lenormandOptionACards: string[];
    lenormandOptionBCards: string[];
    lenormandOptionALabel: string;
    lenormandOptionBLabel: string;
  }>
): Promise<void> {
  const existing = await db.cases.get(id);
  if (!existing) return;
  const merged = { ...existing, ...input, updatedAt: Date.now() };
  if (input.question !== undefined) {
    merged.title = `${(merged.question || "").trim().slice(0, 40)}${(merged.question || "").length > 40 ? "…" : ""} | 草稿`;
  }
  if (input.lenormandSpreadType !== undefined || input.lenormandIsChoice !== undefined) {
    const spreadChanged =
      input.lenormandSpreadType !== undefined &&
      input.lenormandSpreadType !== existing.lenormandSpreadType;
    const choiceChanged =
      input.lenormandIsChoice !== undefined &&
      input.lenormandIsChoice !== existing.lenormandIsChoice;
    if (spreadChanged || choiceChanged) {
      merged.question = undefined;
      merged.background = undefined;
      merged.lenormandDrawDate = undefined;
      merged.lenormandCards = [];
      merged.lenormandOptionACards = [];
      merged.lenormandOptionBCards = [];
      merged.lenormandCategories = [];
      merged.lenormandAnalysis = undefined;
      merged.lenormandOptionALabel = undefined;
      merged.lenormandOptionBLabel = undefined;
    }
    const spreadLabel =
      (merged.lenormandSpreadType ?? "nine-grid") === "nine-grid"
        ? "九宫格"
        : (merged.lenormandSpreadType ?? "") === "linear-3"
          ? "线性三张"
          : "线性五张";
    merged.title = (merged.lenormandIsChoice ? `二择一-${spreadLabel}` : spreadLabel) + " | 草稿";
  }
  await db.cases.put(merged);
}

/** 更新雷诺曼步骤3分析内容 */
export async function updateLenormandAnalysis(
  id: string,
  analysis: Record<string, string>
): Promise<void> {
  await db.cases.update(id, {
    lenormandAnalysis: analysis,
    updatedAt: Date.now(),
  });
}

/** 保存雷诺曼案例（草稿 -> 已完成，移除标题中的草稿标注） */
export async function saveLenormandCase(id: string): Promise<Case | undefined> {
  const existing = await db.cases.get(id);
  if (!existing || existing.type !== "lenormand") return undefined;
  const now = Date.now();
  const rawTitle = (existing.title ?? "").replace(/\s*\|\s*草稿\s*$/, "").trim();
  const title = rawTitle || "雷诺曼案例";
  const merged: Case = {
    ...existing,
    status: "completed",
    title: title ?? existing.title,
    updatedAt: now,
  };
  await db.cases.put(merged);
  return merged;
}
