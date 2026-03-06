import Dexie, { Table } from "dexie";
import type { SpreadSlotState } from "@/lib/spreadTypes";

/** 分类：情感/事业/学业/其他 */
export type CaseCategory = "情感" | "事业" | "学业" | "其他";

/** 牌阵类型 */
export type SpreadType =
  | "六芒星"
  | "四元素"
  | "二择一"
  | "身心灵"
  | "圣三角"
  | "时间流"
  | "无牌阵";

/** 中国省市地点（code + name + label；区县字段仅兼容旧数据） */
export interface Location {
  provinceCode: string;
  provinceName: string;
  cityCode: string;
  cityName: string;
  /** 兼容旧数据，现阶段固定为空字符串 */
  districtCode: string;
  /** 兼容旧数据，现阶段固定为空字符串 */
  districtName: string;
  /** 展示用，如 "上海市-上海市" */
  label: string;
}

export interface Case {
  id: string;
  title: string;
  question?: string;
  createdAt: number;
  updatedAt: number;
  /** 塔罗草稿专用字段 */
  type?: "tarot";
  /** 状态：未完成草稿 / 已确认保存；仅塔罗案例使用 */
  status?: "draft" | "completed";
  background?: string;
  category?: CaseCategory;
  drawTime?: string; // datetime-local 值，如 "2025-03-06T14:30"
  spreadType?: SpreadType;
  /** 地点（中国省市两级；区县字段仅兼容旧数据） */
  location?: Location;
  /** 展示用，与 location.label 一致，兼容旧数据 */
  locationLabel?: string;
  /** 牌阵各卡位状态（slotId -> card/interpretation），与 spreadType 对应 layout 的 slots 一致 */
  cards?: SpreadSlotState[];
  /** Step3 录入：每个卡位原始输入 Record<slotId, string>，用于保存与回填 */
  slotInputs?: Record<string, string>;
  /** Step4 补充：需补充行星的卡位 slotId -> 行星选项 value */
  planetSupplements?: Record<string, string>;
  /** Step4 指示牌原始输入（多张用英文分号 ; 分隔） */
  significatorInput?: string;
  /** Step5 保存结构：slotId -> 牌信息（与 cards 一致，便于导出/分析） */
  slotCards?: Record<string, { cardId: string; cardKey: string; reversed: boolean }>;
  /** Step5 保存结构：行星补充、指示牌等 */
  supplements?: {
    planetByCardKey?: Record<string, string>;
    planetBySlotId?: Record<string, string>;
    signifierTitle?: string;
    /** 指示牌列标题，与列一一对应；未设置则默认 指示牌1、指示牌2… */
    signifierTitles?: string[];
    signifierCards?: unknown;
  };
  /** Step5 保存结构：用户解读与表格状态 */
  analysis?: { userNotes: string; tableState?: unknown; manualNumberNote?: string };
  extra?: unknown;
  /** 兼容：用户解读，与 analysis.userNotes 同步 */
  userInterpretation?: string;
}

export type DeckKind = "tarot" | "lenormand";

export interface DrawCard {
  cardId: string;
  reversed: boolean;
  position?: string; // 例如：过去/现在/未来
}

export interface Draw {
  id: string;
  caseId: string;
  deck: DeckKind;
  spreadId: string; // 例如：three-card
  cards: DrawCard[];
  note?: string;
  createdAt: number;
}

class TarotDb extends Dexie {
  cases!: Table<Case, string>;
  draws!: Table<Draw, string>;

  constructor() {
    super("tarotAppDb");
    this.version(1).stores({
      cases: "id, createdAt",
    });

    this.version(2).stores({
      cases: "id, createdAt",
      draws: "id, caseId, createdAt",
    });
  }
}

export const db = new TarotDb();