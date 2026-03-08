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

/** 年运牌阵专用：案主生日、看盘起始月 */
export type AnnualExtra = {
  clientBirthday: string; // MM-DD
  readingStartMonth: string; // YYYY-MM
};

/** 创建塔罗案例草稿，仅当用户点击「下一步：进入牌阵」时调用 */
export async function createTarotDraft(input: {
  question: string;
  background?: string;
  categories: string[];
  drawTime: string;
  spreadType: SpreadType;
  timeAxisVariant?: string;
  location: Location;
  annual?: AnnualExtra;
}): Promise<Case> {
  const now = Date.now();
  const dateStr = input.drawTime.slice(0, 10); // YYYY-MM-DD
  const catLabel = input.categories.length > 0 ? input.categories.join("、") : "";
  const title = `${dateStr} | ${catLabel} | ${input.question.trim().slice(0, 30)}${input.question.length > 30 ? "…" : ""}`;
  const item: Case = {
    id: crypto.randomUUID(),
    type: "tarot",
    status: "draft",
    title,
    question: input.question.trim(),
    background: input.background?.trim() || undefined,
    category: (input.categories[0] as CaseCategory) || undefined,
    tarotCategories: input.categories,
    drawTime: input.drawTime,
    spreadType: input.spreadType,
    location: input.location,
    locationLabel: input.location.label,
    cards: [],
    extra: input.annual ? { annual: input.annual } : undefined,
    analysis: undefined,
    userInterpretation: "",
    createdAt: now,
    updatedAt: now,
  };
  if (input.timeAxisVariant != null && input.timeAxisVariant !== "") {
    item.timeAxisVariant = input.timeAxisVariant;
  }
  await db.cases.add(item);
  return item;
}

/** 当基础信息草稿已存在但案例记录缺失时，用指定 id 重建塔罗草稿 */
export async function restoreTarotDraft(
  id: string,
  input: {
    question: string;
    background?: string;
    categories: string[];
    drawTime: string;
    spreadType: SpreadType;
    timeAxisVariant?: string;
    location: Location;
    annual?: AnnualExtra;
  }
): Promise<Case> {
  const now = Date.now();
  const dateStr = input.drawTime.slice(0, 10);
  const catLabel = input.categories.length > 0 ? input.categories.join("、") : "";
  const title = `${dateStr} | ${catLabel} | ${input.question.trim().slice(0, 30)}${input.question.length > 30 ? "…" : ""}`;
  const item: Case = {
    id,
    type: "tarot",
    status: "draft",
    title,
    question: input.question.trim(),
    background: input.background?.trim() || undefined,
    category: (input.categories[0] as CaseCategory) || undefined,
    tarotCategories: input.categories,
    drawTime: input.drawTime,
    spreadType: input.spreadType,
    location: input.location,
    locationLabel: input.location.label,
    cards: [],
    extra: input.annual ? { annual: input.annual } : undefined,
    analysis: undefined,
    userInterpretation: "",
    createdAt: now,
    updatedAt: now,
  };
  if (input.timeAxisVariant != null && input.timeAxisVariant !== "") {
    item.timeAxisVariant = input.timeAxisVariant;
  }
  await db.cases.put(item);
  return item;
}

/** 更新塔罗草稿基础信息（返回修改时用） */
export async function updateTarotDraft(
  id: string,
  input: Partial<{
    question: string;
    background: string;
    categories: string[];
    drawTime: string;
    spreadType: SpreadType;
    timeAxisVariant: string;
    location: Location;
    extra: Case["extra"];
  }>
): Promise<void> {
  const now = Date.now();
  const existing = await db.cases.get(id);
  if (!existing) return;
  const merged = { ...existing, ...input, updatedAt: now };
  if (input.categories !== undefined) {
    merged.tarotCategories = input.categories;
    merged.category = (input.categories[0] as CaseCategory) || undefined;
  }
  if (input.question !== undefined || input.categories !== undefined || input.drawTime !== undefined) {
    const dateStr = (merged.drawTime || "").slice(0, 10);
    const cats = merged.tarotCategories ?? (merged.category ? [merged.category] : []);
    const catLabel = cats.join("、");
    merged.title = `${dateStr} | ${catLabel} | ${(merged.question || "").trim().slice(0, 30)}`;
  }
  if (input.location !== undefined) {
    merged.locationLabel = input.location.label;
  }
  if (input.extra !== undefined) {
    merged.extra = input.extra;
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

/** Step5 保存：合并 title / slotCards / supplements / analysis / userInterpretation / reviewFeedback，保留案例其余字段 */
export async function saveCaseStep5(
  id: string,
  updates: Partial<Pick<Case, "title" | "slotCards" | "supplements" | "analysis" | "userInterpretation" | "reviewFeedback">>
): Promise<Case | undefined> {
  const existing = await db.cases.get(id);
  if (!existing) return undefined;
  const now = Date.now();
  const merged: Case = {
    ...existing,
    ...updates,
    ...(existing.type === "tarot" && existing.status !== "completed"
      ? { status: "completed" as const }
      : {}),
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
      ? {
          ...(existing.analysis ?? {}),
          ...patch.analysis,
          userNotes: patch.analysis.userNotes ?? existing.analysis?.userNotes ?? "",
        }
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
  const all = await db.cases.orderBy("createdAt").reverse().toArray();
  return all.filter((c) => {
    if (c.type === "tarot" || c.type === "lenormand") {
      return c.status === "completed";
    }
    return true;
  });
}

/** 草稿列表（塔罗 + 雷诺曼混合，按更新时间倒序；未点击保存的均为草稿） */
export async function listDrafts(): Promise<Case[]> {
  const all = await db.cases.toArray();
  return all
    .filter(
      (c) =>
        (c.type === "tarot" || c.type === "lenormand") &&
        c.status !== "completed"
    )
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

/** 按类型筛选案例（塔罗 / 雷诺曼） */
export async function listCasesByType(
  type: "tarot" | "lenormand"
): Promise<Case[]> {
  const all = await listCases();
  return all.filter((c) => c.type === type);
}

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

/** 按分类和牌名搜索案例（混合塔罗与雷诺曼） */
export async function searchCases(query: string): Promise<Case[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const all = await listCases();
  return all.filter((c) => {
    const catMatch = CATEGORIES.some(
      (cat) =>
        cat === q &&
        (c.category === cat ||
          c.tarotCategories?.includes(cat) ||
          c.lenormandCategories?.includes(cat))
    );
    if (catMatch) return true;
    const tarotCardNames = [
      ...Object.values(c.slotCards ?? {}).map((s) => s.cardKey ?? ""),
      ...(c.cards ?? []).map((s) => s.cardName ?? ""),
    ].filter(Boolean);
    const cardMatch =
      (c.type === "tarot" && tarotCardNames.some((n) => n.toLowerCase().includes(q))) ||
      (c.type === "lenormand" &&
        [
          ...(c.lenormandCards ?? []),
          ...(c.lenormandOptionACards ?? []),
          ...(c.lenormandOptionBCards ?? []),
        ].some((name) => name?.toLowerCase().includes(q)));
    return cardMatch;
  });
}

/** 更新案例复盘与反馈 */
export async function updateCaseReviewFeedback(
  id: string,
  reviewFeedback: string
): Promise<void> {
  await db.cases.update(id, { reviewFeedback, updatedAt: Date.now() });
}

export async function deleteCase(id: string) {
  return db.cases.delete(id);
}