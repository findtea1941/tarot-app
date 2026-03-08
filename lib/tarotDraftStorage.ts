/** 塔罗基础信息页草稿的 sessionStorage 键，用于浏览器后退时恢复 */
const TAROT_DRAFT_KEY = "tarot-basic-draft";
const TAROT_LAST_DRAFT_ID_KEY = "tarot-last-draft-id";

export type TarotDraftStored = {
  question: string;
  background: string;
  categories: string[];
  drawDate: string;
  drawTime: string;
  spreadType: string;
  timeAxisVariant?: string;
  provinceCode: string;
  cityCode: string;
  /** 年运牌阵：案主出生日期 MM-DD */
  clientBirthday?: string;
  /** 年运牌阵：看盘起始月 YYYY-MM */
  readingStartMonth?: string;
};

export function loadTarotDraftFromStorage(caseId: string): TarotDraftStored | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${TAROT_DRAFT_KEY}-${caseId}`);
    if (!raw) return null;
    return JSON.parse(raw) as TarotDraftStored;
  } catch {
    return null;
  }
}

export function saveTarotDraftToStorage(caseId: string, data: TarotDraftStored) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`${TAROT_DRAFT_KEY}-${caseId}`, JSON.stringify(data));
    sessionStorage.setItem(TAROT_LAST_DRAFT_ID_KEY, caseId);
  } catch {
    // ignore
  }
}

/** 取最近一次保存的 caseId，用于 URL 无 caseId 时的兜底（如后退后 useSearchParams 未更新） */
export function getLastTarotDraftId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(TAROT_LAST_DRAFT_ID_KEY);
  } catch {
    return null;
  }
}
