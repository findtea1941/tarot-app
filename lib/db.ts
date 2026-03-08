import Dexie, { Table } from "dexie";
import type { SpreadSlotState } from "@/lib/spreadTypes";

/** 分类 */
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

/** 牌阵类型 */
export type SpreadType =
  | "六芒星"
  | "四元素"
  | "二择一"
  | "身心灵"
  | "圣三角"
  | "时间流"
  | "无牌阵"
  | "年运"
  | "星运";

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
  /** 案例类型 */
  type?: "tarot" | "lenormand";
  /** 状态：未完成草稿 / 已确认保存；塔罗与雷诺曼共用 */
  status?: "draft" | "completed";
  /** 雷诺曼专用：牌阵类型 */
  lenormandSpreadType?: "linear-3" | "linear-5" | "nine-grid";
  /** 雷诺曼专用：是否二择一 */
  lenormandIsChoice?: boolean;
  /** 雷诺曼专用：类型标签（多选） */
  lenormandCategories?: string[];
  /** 雷诺曼专用：主牌阵牌名数组（按顺序） */
  lenormandCards?: string[];
  /** 雷诺曼专用：二择一选项A牌名 */
  lenormandOptionACards?: string[];
  /** 雷诺曼专用：二择一选项B牌名 */
  lenormandOptionBCards?: string[];
  /** 雷诺曼专用：二择一选项A名称 */
  lenormandOptionALabel?: string;
  /** 雷诺曼专用：二择一选项B名称 */
  lenormandOptionBLabel?: string;
  /** 雷诺曼专用：录入日期 YYYY-MM-DD */
  lenormandDrawDate?: string;
  /** 雷诺曼专用：步骤3分析内容，entryId -> 用户填写文本 */
  lenormandAnalysis?: Record<string, string>;
  background?: string;
  category?: CaseCategory;
  /** 塔罗分类（多选），与 category 兼容旧数据 */
  tarotCategories?: string[];
  drawTime?: string; // datetime-local 值，如 "2025-03-06T14:30"
  spreadType?: SpreadType;
  /** 六芒星/时间流专用：1–3 号位名称变体，如 past-present-future（过去-现在-未来） */
  timeAxisVariant?: string;
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
  /** 案例库复盘与反馈（从案例库进入时填写） */
  reviewFeedback?: string;
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