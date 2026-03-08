export type Arcana = "major" | "minor";

export type SuitZh = "权杖" | "星币" | "宝剑" | "圣杯";

export type CaseCategory =
  | "情感"
  | "事业"
  | "学业"
  | "健康"
  | "灵性"
  | "运势"
  | "其他"
  | "开放式问题"
  | "封闭式问题";

export type SpreadType =
  | "六芒星"
  | "四元素"
  | "二择一"
  | "身心灵"
  | "圣三角"
  | "时间流"
  | "无牌阵"
  | "年运";

export interface Card {
  id: string;
  name: string;
  arcana: Arcana;
  suit: SuitZh | null;
  rank: string | null;
  number: number | null;
  element?: string | null;
  qualities?: string[];
  yinYang?: string | null;
  stage?: string | null;
  trait?: string | null;
  zodiac?: string[];
  houses?: number[];
  planets?: string[];
  planetNeedsSupplement: boolean;
}

export interface DeckSchemaMeta {
  planetNeedsSupplementRule?: string;
  qualitiesSplitRule?: string;
  multiValueRule?: string;
  [key: string]: unknown;
}

export interface Deck {
  deckId: string;
  version: number;
  source?: string;
  schema?: DeckSchemaMeta;
  cards: Card[];
}

export interface PlanetSupplement {
  cardId: string;
  cardName: string;
  positionIndex: number;
  planet: string | null;
  planetNeedsSupplement: boolean;
}

export interface Draw {
  positionIndex: number;
  positionName: string;
  rawInput: string;
  cardName: string | null;
  reversed: boolean | null;
  cardId?: string | null;
}

export interface AnalysisResult {
  generatedAt: string;
  tableRows: unknown[];
  summary: string;
}

export interface ExtraInfo {
  planetOverrideByPosition: Record<number, PlanetSupplement | undefined>;
  significatorsRaw: string;
  significatorsParsed: {
    cardId: string | null;
    cardName: string;
    reversed: boolean;
  }[];
  significatorsTitle: string;
}

export interface Case {
  id: string;
  type: "tarot";
  title: string;
  question: string;
  background?: string;
  category: CaseCategory;
  drawTime: string;
  spreadType: SpreadType;
  spreadVariant?: string | null;
  cards: Draw[];
  extra: ExtraInfo | null;
  analysis: AnalysisResult | null;
  userInterpretation: string;
  createdAt: string;
  updatedAt: string;
}

// spec/data_models.ts

export type DivinationType = "tarot" | "lenormand";

export type Category =
  | "情感"
  | "事业"
  | "学业"
  | "健康"
  | "灵性"
  | "运势"
  | "其他"
  | "开放式问题"
  | "封闭式问题";

/** 与上方 SpreadType 区分：此处为带「牌阵」后缀的规格用命名 */
export type SpreadTypeSpec =
  | "六芒星牌阵"
  | "四元素牌阵"
  | "二择一牌阵"
  | "身心灵牌阵"
  | "圣三角牌阵"
  | "时间流牌阵"
  | "无牌阵";

export interface CardDraw {
  positionIndex: number;      // 1..N
  positionName: string;       // e.g., "过去/现状/未来" or "火/土/风/水"
  rawInput: string;           // e.g., "女皇-"
  cardName: string;           // e.g., "女皇"
  reversed: boolean;          // true if rawInput endsWith "-"
}

/** 与上方 ExtraInfo 区分：规格用扩展信息 */
export interface ExtraInfoSpec {
  // key 用 positionIndex，最简单不出错
  planetOverrideByPosition?: Record<number, string>;

  significatorsTitle?: string; // default "指示牌"
  significatorsRaw?: string;   // e.g., "恋人; 皇帝-"
  significatorsParsed?: { cardName: string; reversed: boolean }[];
}

export interface AnalysisRow {
  positionIndex: number;
  positionName: string;
  displayCardName: string; // "女皇" or "女皇-"
  cardNumber: number | null;
  signedNumber: number | null; // reversed => -cardNumber
}

export interface AnalysisSummary {
  numberSumSigned?: number | null;
  numberSumAbs?: number | null;
  mod22?: number | null;

  // 下面这些先留接口，算法章节完善后再填
  elementCounts?: Record<string, number>;
  elementAfterCancel?: Record<string, number>;
  dominantElement?: string | null;

  yinYangCounts?: Record<string, number>;
  yinYangAfterCancel?: Record<string, number>;
  dominantYinYang?: string | null;
}

/** 与上方 AnalysisResult 区分：规格用分析结果 */
export interface AnalysisResultSpec {
  generatedAt: string; // ISO datetime
  tableRows: AnalysisRow[];
  summary: AnalysisSummary;
}

export interface CaseRecord {
  id: string;
  type: DivinationType; // tarot for now
  title: string;

  question: string;
  background?: string;
  category: Category;
  drawTime: string; // ISO datetime
  spreadType: SpreadTypeSpec;
  spreadVariant?: string;

  cards: CardDraw[];
  extra?: ExtraInfoSpec;

  analysis?: AnalysisResultSpec;
  userInterpretation: string;

  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}