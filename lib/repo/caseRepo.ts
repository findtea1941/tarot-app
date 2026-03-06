import {
  db,
  Case,
  type CaseCategory,
  type Location,
  type SpreadType,
} from "@/lib/db";
import type { SpreadSlotState } from "@/lib/spreadTypes";

export async function createCase(input: { title: string; question?: string }) {
  const now = Date.now();
  const item: Case = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    question: input.question?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  await db.cases.add(item);
  return item;
}

/** 创建塔罗案例草稿，仅当用户点击「下一步：进入牌阵」时调用 */
export async function createTarotDraft(input: {
  question: string;
  background?: string;
  category: CaseCategory;
  drawTime: string;
  spreadType: SpreadType;
  location: Location;
}): Promise<Case> {
  const now = Date.now();
  const dateStr = input.drawTime.slice(0, 10); // YYYY-MM-DD
  const title = `${dateStr} | ${input.category} | ${input.question.trim().slice(0, 30)}${input.question.length > 30 ? "…" : ""}`;
  const item: Case = {
    id: crypto.randomUUID(),
    type: "tarot",
    title,
    question: input.question.trim(),
    background: input.background?.trim() || undefined,
    category: input.category,
    drawTime: input.drawTime,
    spreadType: input.spreadType,
    location: input.location,
    locationLabel: input.location.label,
    cards: [],
    extra: undefined,
    analysis: undefined,
    userInterpretation: "",
    createdAt: now,
    updatedAt: now,
  };
  await db.cases.add(item);
  return item;
}

/** 更新塔罗草稿基础信息（返回修改时用） */
export async function updateTarotDraft(
  id: string,
  input: Partial<{
    question: string;
    background: string;
    category: CaseCategory;
    drawTime: string;
    spreadType: SpreadType;
    location: Location;
  }>
): Promise<void> {
  const now = Date.now();
  const existing = await db.cases.get(id);
  if (!existing) return;
  const merged = { ...existing, ...input, updatedAt: now };
  if (input.question !== undefined || input.category !== undefined || input.drawTime !== undefined) {
    const dateStr = (merged.drawTime || "").slice(0, 10);
    merged.title = `${dateStr} | ${merged.category || ""} | ${(merged.question || "").trim().slice(0, 30)}`;
  }
  if (input.location !== undefined) {
    merged.locationLabel = input.location.label;
  }
  await db.cases.put(merged);
}

export async function getCaseById(id: string): Promise<Case | undefined> {
  return db.cases.get(id);
}

/** 更新案例牌阵卡位状态（保存/读取各 slot 的 card 与 interpretation） */
export async function updateCaseSpreadCards(
  id: string,
  cards: SpreadSlotState[]
): Promise<void> {
  const existing = await db.cases.get(id);
  if (!existing) return;
  await db.cases.update(id, { cards, updatedAt: Date.now() });
}

/** 更新 Step3 牌阵录入原始输入（返回 Step2 或确定时持久化，再进入 Step3 时回填） */
export async function updateCaseSlotInputs(
  id: string,
  slotInputs: Record<string, string>
): Promise<void> {
  await db.cases.update(id, { slotInputs, updatedAt: Date.now() });
}

/** 更新 Step4 补充信息（行星补充 + 指示牌输入） */
export async function updateCaseStep4(
  id: string,
  input: { planetSupplements?: Record<string, string>; significatorInput?: string }
): Promise<void> {
  await db.cases.update(id, { ...input, updatedAt: Date.now() });
}

/** 更新 Step5 用户解读 */
export async function updateCaseUserInterpretation(
  id: string,
  userInterpretation: string
): Promise<void> {
  await db.cases.update(id, { userInterpretation, updatedAt: Date.now() });
}

/** Step5 保存：合并 title / slotCards / supplements / analysis / userInterpretation，保留案例其余字段 */
export async function saveCaseStep5(
  id: string,
  updates: Partial<Pick<Case, "title" | "slotCards" | "supplements" | "analysis" | "userInterpretation">>
): Promise<Case | undefined> {
  const existing = await db.cases.get(id);
  if (!existing) return undefined;
  const now = Date.now();
  const merged: Case = {
    ...existing,
    ...updates,
    updatedAt: now,
  };
  await db.cases.put(merged);
  return merged;
}

/** Step5 局部更新：仅更新 supplements 或 analysis 单字段（深合并），用于 onBlur 保存 */
export async function updateCaseStep5Partial(
  id: string,
  patch: { supplements?: Partial<Case["supplements"]>; analysis?: Partial<NonNullable<Case["analysis"]>> }
): Promise<Case | undefined> {
  const existing = await db.cases.get(id);
  if (!existing) return undefined;
  const now = Date.now();
  const supplements =
    patch.supplements != null
      ? { ...existing.supplements, ...patch.supplements }
      : existing.supplements;
  const analysis =
    patch.analysis != null
      ? { ...(existing.analysis ?? {}), ...patch.analysis }
      : existing.analysis;
  const merged: Case = {
    ...existing,
    ...(supplements !== undefined && { supplements }),
    ...(analysis !== undefined && { analysis }),
    updatedAt: now,
  };
  await db.cases.put(merged);
  return merged;
}

export async function listCases() {
  return db.cases.orderBy("createdAt").reverse().toArray();
}

export async function deleteCase(id: string) {
  return db.cases.delete(id);
}