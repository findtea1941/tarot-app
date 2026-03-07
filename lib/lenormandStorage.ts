/** 步骤二录入草稿的 sessionStorage 键 */
const DRAFT_STORAGE_KEY = "lenormand-entry-draft";

export function loadLenormandDraftFromStorage(caseId: string) {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${DRAFT_STORAGE_KEY}-${caseId}`);
    if (!raw) return null;
    return JSON.parse(raw) as {
      question: string;
      background: string;
      drawDate: string;
      categories: string[];
      cardsInput: string;
      optionAInput: string;
      optionALabel: string;
      optionBInput: string;
      optionBLabel: string;
    };
  } catch {
    return null;
  }
}

export function saveLenormandDraftToStorage(
  caseId: string,
  data: {
    question: string;
    background: string;
    drawDate: string;
    categories: string[];
    cardsInput: string;
    optionAInput: string;
    optionALabel: string;
    optionBInput: string;
    optionBLabel: string;
  }
) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      `${DRAFT_STORAGE_KEY}-${caseId}`,
      JSON.stringify(data)
    );
  } catch {
    // ignore
  }
}

export function clearLenormandDraftStorage(caseId: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(`${DRAFT_STORAGE_KEY}-${caseId}`);
  } catch {
    // ignore
  }
}
