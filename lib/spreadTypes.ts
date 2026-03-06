/**
 * 牌阵布局与卡位类型（引擎化）
 */

export interface Grid {
  cols: number;
  rows: number;
  gapPx: number;
}

export interface SlotAt {
  col: number;
  row: number;
  colSpan?: number;
  rowSpan?: number;
}

export interface SlotDef {
  id: string;
  name: string;
  meaning: string;
  at: SlotAt;
}

export interface SpreadLayout {
  id: string;
  name: string;
  grid: Grid;
  slots: SlotDef[];
}

/** 单个卡位当前状态（存 Dexie case.cards[i]） */
export interface SpreadSlotState {
  slotId: string;
  cardId?: string;
  cardName?: string;
  reversed?: boolean;
  interpretation?: string;
}
