/** 塔罗基础信息页草稿的 sessionStorage 键，用于浏览器后退时恢复 */
const TAROT_DRAFT_KEY = "tarot-basic-draft";
const TAROT_LAST_DRAFT_ID_KEY = "tarot-last-draft-id";
const TAROT_RETURN_DRAFT_ID_KEY = "tarot-return-draft-id";
const TAROT_RETURN_DRAFT_TTL_MS = 60_000;

type TarotReturnDraftMarker = {
  caseId: string;
  createdAt: number;
};

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

/** 标记当前塔罗草稿是从牌阵页返回基础信息页时要恢复的目标 */
export function markTarotReturnDraftId(caseId: string) {
  if (typeof window === "undefined") return;
  try {
    const marker: TarotReturnDraftMarker = { caseId, createdAt: Date.now() };
    sessionStorage.setItem(TAROT_RETURN_DRAFT_ID_KEY, JSON.stringify(marker));
  } catch {
    // ignore
  }
}

export function getTarotReturnDraftId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(TAROT_RETURN_DRAFT_ID_KEY);
    if (!raw) return null;
    const marker = JSON.parse(raw) as TarotReturnDraftMarker;
    if (!marker?.caseId || !marker?.createdAt) {
      sessionStorage.removeItem(TAROT_RETURN_DRAFT_ID_KEY);
      return null;
    }
    if (Date.now() - marker.createdAt > TAROT_RETURN_DRAFT_TTL_MS) {
      sessionStorage.removeItem(TAROT_RETURN_DRAFT_ID_KEY);
      return null;
    }
    return marker.caseId;
  } catch {
    return null;
  }
}

/** 仅在基础信息页挂载时消费一次，避免 stale 标记长期影响新建页 */
export function consumeTarotReturnDraftId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = getTarotReturnDraftId();
    sessionStorage.removeItem(TAROT_RETURN_DRAFT_ID_KEY);
    return value;
  } catch {
    return null;
  }
}
