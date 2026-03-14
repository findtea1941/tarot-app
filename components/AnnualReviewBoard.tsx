"use client";

import { useState } from "react";
import { getDeck, matchCardByDisplayName } from "@/lib/deck";
import type { SpreadSlotState } from "@/lib/spreadTypes";
import { getAnnualHouseDates } from "@/layouts/annual";

const SLOT_NAMES: Record<string, string> = {
  significator: "个人指示牌",
  "1": "一宫", "2": "二宫", "3": "三宫", "4": "四宫", "5": "五宫", "6": "六宫",
  "7": "七宫", "8": "八宫", "9": "九宫", "10": "十宫", "11": "十一宫", "12": "十二宫",
  fire: "火元素", earth: "土元素", air: "风元素", water: "水元素",
};

/** 钟面角度：0°=3点钟(七宫)，90°=12点，180°=9点钟(一宫)；逆时针排列，2@8h、3@7h、4@6h、5@5h、6@4h，8@4h、9@3h、10@2h、11@1h、12@12h */
const CLOCK_ANGLE: Record<string, number> = {
  "1": 180,
  "2": 210, "3": 240, "4": 270, "5": 300, "6": 330,
  "7": 0,
  "8": 30, "9": 60, "10": 90, "11": 120, "12": 150,
};
/** 扁椭圆：水平半径、垂直半径；整体纵向拉长，圈略下移 */
const RADIUS_X_PCT = 42;
const RADIUS_Y_PCT = 36;
const CENTER_X_PCT = 50;
const CENTER_Y_PCT = 58;

/** 二宫三宫、五宫六宫、七宫八宫、十一十二宫：仅垂直微调；十二宫、八宫与二宫、六宫垂直镜像 */
const VERT_OFFSET_PCT: Record<string, number> = {
  "2": -1.5, "3": 1.5, "5": 1.5, "6": -1.5, "7": 0.5, "8": 1.5, "11": 1.5, "12": 2.5,
};
/** 宫位水平微调（十一宫往右移 1） */
const HORZ_OFFSET_PCT: Record<string, number> = { "11": 1 };

/** 宫位/指示牌/四元素：用于绝对定位的配置 */
type SlotPlace = { id: string; leftPct: number; topPct: number };
function clockPosition(slotId: string): SlotPlace | null {
  if (slotId === "significator") {
    return { id: slotId, leftPct: CENTER_X_PCT, topPct: CENTER_Y_PCT };
  }
  const angle = CLOCK_ANGLE[slotId];
  if (angle != null) {
    const rad = (angle * Math.PI) / 180;
    let leftPct = CENTER_X_PCT + RADIUS_X_PCT * Math.cos(rad);
    let topPct = CENTER_Y_PCT - RADIUS_Y_PCT * Math.sin(rad);
    const vOffset = VERT_OFFSET_PCT[slotId];
    if (vOffset != null) topPct += vOffset;
    const hOffset = HORZ_OFFSET_PCT[slotId];
    if (hOffset != null) leftPct += hOffset;
    return { id: slotId, leftPct, topPct };
  }
  /* 四元素略向垂直中轴线水平内移，与最近牌保留空隙 */
  if (slotId === "air") return { id: slotId, leftPct: 12, topPct: 12 };
  if (slotId === "water") return { id: slotId, leftPct: 88, topPct: 12 };
  /* 土、火在下方 */
  if (slotId === "earth") return { id: slotId, leftPct: 12, topPct: 106 };
  if (slotId === "fire") return { id: slotId, leftPct: 88, topPct: 106 };
  return null;
}

const ORDERED_SLOTS: SlotPlace[] = [
  ...["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map((id) => clockPosition(id)!),
  clockPosition("significator")!,
  clockPosition("air")!,
  clockPosition("water")!,
  clockPosition("earth")!,
  clockPosition("fire")!,
];

function shrinkTowardCenter(value: number, scale: number): number {
  return 50 + (value - 50) * scale;
}

function getModalPlace(place: SlotPlace): SlotPlace {
  return {
    ...place,
    leftPct: shrinkTowardCenter(place.leftPct, 0.82),
    topPct: shrinkTowardCenter(place.topPct, 0.78) - 7,
  };
}

type AnnualReviewBoardProps = {
  slotStates: Record<string, SpreadSlotState>;
  clientBirthday?: string;
  readingStartMonth?: string;
  supplements?: { planetByCardKey?: Record<string, string>; planetBySlotId?: Record<string, string> };
  /** 受控弹窗：由父级（如整块淡绿区）控制打开/关闭 */
  detailOpen?: boolean;
  onClose?: () => void;
};

/** 年运牌阵回顾：5×6 图形 + 点击弹窗详图（位置/牌名/行星） */
export function AnnualReviewBoard({
  slotStates,
  clientBirthday = "",
  readingStartMonth = "",
  supplements = {},
  detailOpen: controlledDetailOpen,
  onClose,
}: AnnualReviewBoardProps) {
  const [internalDetailOpen, setInternalDetailOpen] = useState(false);
  const isControlled = controlledDetailOpen !== undefined;
  const detailOpen = isControlled ? controlledDetailOpen : internalDetailOpen;
  const handleClose = isControlled ? (onClose ?? (() => {})) : () => setInternalDetailOpen(false);
  const handleOpen = isControlled ? (onClose ? () => {} : () => {}) : () => setInternalDetailOpen(true);
  const houseDates =
    clientBirthday && readingStartMonth
      ? getAnnualHouseDates(clientBirthday, readingStartMonth)
      : {};

  const getCardDisplay = (slotId: string) => {
    const state = slotStates[slotId];
    const cardName = state?.cardName ? (state.reversed ? `${state.cardName}-` : state.cardName) : "—";
    return { position: SLOT_NAMES[slotId] ?? slotId, cardName };
  };

  const getPlanet = (slotId: string, cardName: string) => {
    if (cardName === "—") return "";
    const bySlot = supplements.planetBySlotId?.[slotId];
    if (bySlot) return bySlot;
    const normalizedName = cardName.replace(/-$/, "");
    const byCardKey =
      supplements.planetByCardKey?.[normalizedName] ?? supplements.planetByCardKey?.[cardName] ?? "";
    if (byCardKey) return byCardKey;

    const deckCard = matchCardByDisplayName(getDeck(), normalizedName);
    return deckCard?.planets?.filter(Boolean).join(" ") ?? "";
  };

  const renderCard = (slotId: string, isModal: boolean) => {
    const { position, cardName } = getCardDisplay(slotId);
    const rawDate = /^\d+$/.test(slotId) ? (houseDates[slotId] ?? "") : "";
    const dateStr = rawDate.length >= 10 ? `${rawDate.slice(2, 4)}-${rawDate.slice(5, 10)}` : rawDate;
    if (isModal) {
      const planet = getPlanet(slotId, cardName);
      return (
        <div className="flex h-[78px] w-[98px] flex-col items-center justify-center rounded-xl border-2 border-[#a8d9c8] bg-white px-2.5 py-2 shadow-[0_4px_10px_rgba(5,150,105,0.10)]">
          <span className="whitespace-nowrap text-xs font-semibold leading-tight text-tarot-green">{position}</span>
          <span className="mt-0.5 whitespace-nowrap text-center text-xs leading-tight text-slate-700">{cardName}</span>
          {planet ? <span className="mt-0.5 whitespace-nowrap text-xs font-normal leading-tight text-slate-500">{planet}</span> : null}
          {dateStr ? <span className="mt-0.5 whitespace-nowrap text-[11px] leading-tight text-slate-500">{dateStr}</span> : null}
        </div>
      );
    }
    return (
      <>
        <span className="text-xs font-semibold leading-tight text-tarot-green">{position}</span>
        <span className="mt-0.5 w-full text-center text-xs leading-tight text-slate-700 break-words line-clamp-2">{cardName}</span>
        {dateStr && <span className="mt-1 text-[8px] leading-tight text-slate-500">{dateStr}</span>}
      </>
    );
  };

  return (
    <div className="w-full">
      {/* 牌阵：扁椭圆往中心收拢，一宫七宫中轴线，指示牌正中，四元素在四角 */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleOpen}
        onKeyDown={(e) => e.key === "Enter" && handleOpen()}
        className="relative mx-auto w-full max-w-[500px] cursor-pointer transition opacity-90 hover:opacity-100"
        style={{ aspectRatio: "1 / 1" }}
        aria-label="点击查看牌阵详图"
      >
        {ORDERED_SLOTS.map((place) => (
          <div
            key={place.id}
            className="absolute flex h-[68px] w-[84px] flex-col items-center justify-center rounded-xl border-2 border-[#a8d9c8] bg-white px-2 py-1.5 shadow-[0_4px_10px_rgba(5,150,105,0.10)]"
            style={{
              left: `${place.leftPct}%`,
              top: `${place.topPct}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {renderCard(place.id, false)}
          </div>
        ))}
      </div>

      {/* 弹窗：同钟面布局 */}
      {detailOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2"
          onClick={(e) => { e.stopPropagation(); handleClose(); }}
          role="dialog"
          aria-modal="true"
          aria-label="牌阵详图"
        >
          <div
            className="relative flex h-[min(90vh,85vw)] w-[min(90vh,85vw)] max-h-[min(90vh,85vw)] max-w-[min(90vh,85vw)] items-center justify-center overflow-hidden rounded-2xl border-2 border-[#a8d9c8] bg-[#f5fbf8] p-3 shadow-[0_4px_10px_rgba(5,150,105,0.10)]"
            style={{ aspectRatio: "1 / 1" }}
            onClick={(e) => e.stopPropagation()}
          >
            {ORDERED_SLOTS.map((rawPlace) => {
              const place = getModalPlace(rawPlace);
              return (
              <div
                key={`d-${place.id}`}
                className="absolute flex flex-col items-center justify-center"
                style={{
                  left: `${place.leftPct}%`,
                  top: `${place.topPct}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                {renderCard(place.id, true)}
              </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleClose(); }}
            className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-sm text-slate-600 shadow hover:bg-white"
          >
            关闭
          </button>
        </div>
      )}
    </div>
  );
}
