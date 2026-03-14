"use client";

import { useState } from "react";
import { getDeck, matchCardByDisplayName } from "@/lib/deck";
import type { SpreadSlotState } from "@/lib/spreadTypes";
import { getAnnualHouseDates } from "@/layouts/annual";

const SLOT_NAMES: Record<string, string> = {
  sun: "太阳位", moon: "月亮位", mercury: "水星位", venus: "金星位", mars: "火星位", jupiter: "木星位", saturn: "土星位",
  "1": "一宫", "2": "二宫", "3": "三宫", "4": "四宫", "5": "五宫", "6": "六宫",
  "7": "七宫", "8": "八宫", "9": "九宫", "10": "十宫", "11": "十一宫", "12": "十二宫",
  fire: "火元素", earth: "土元素", air: "风元素", water: "水元素",
};

/** 钟面角度：与年运一致 */
const CLOCK_ANGLE: Record<string, number> = {
  "1": 180,
  "2": 210, "3": 240, "4": 270, "5": 300, "6": 330,
  "7": 0,
  "8": 30, "9": 60, "10": 90, "11": 120, "12": 150,
};
const RADIUS_X_PCT = 42;
const RADIUS_Y_PCT = 36;
const CENTER_X_PCT = 50;
const CENTER_Y_PCT = 58;

const VERT_OFFSET_PCT: Record<string, number> = {
  "2": -1.5, "3": 1.5, "5": 1.5, "6": -1.5, "7": 0.5, "8": 1.5, "11": 1.5, "12": 2.5,
};
const HORZ_OFFSET_PCT: Record<string, number> = { "11": 1 };

type SlotPlace = { id: string; leftPct: number; topPct: number };

function clockPosition(slotId: string): SlotPlace | null {
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
  if (slotId === "air") return { id: slotId, leftPct: 12, topPct: 12 };
  if (slotId === "water") return { id: slotId, leftPct: 88, topPct: 12 };
  if (slotId === "earth") return { id: slotId, leftPct: 12, topPct: 106 };
  if (slotId === "fire") return { id: slotId, leftPct: 88, topPct: 106 };
  return null;
}

/** 星运中心七张行星盘：每张牌宽足够 4 字+正负号，牌与牌之间保持空隙，且不重叠十二宫 */
const SEVEN_PLANET_IDS = ["jupiter", "saturn", "mercury", "venus", "mars", "sun", "moon"] as const;
const SEVEN_CENTER_PLACES: SlotPlace[] = [
  { id: "jupiter", leftPct: 40.8, topPct: 44 },
  { id: "saturn", leftPct: 59.2, topPct: 44 },
  { id: "mercury", leftPct: 31.8, topPct: 58 },
  { id: "venus", leftPct: 50, topPct: 58 },
  { id: "mars", leftPct: 68.2, topPct: 58 },
  { id: "sun", leftPct: 40.8, topPct: 72 },
  { id: "moon", leftPct: 59.2, topPct: 72 },
];

const ORDERED_SLOTS: SlotPlace[] = [
  ...["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map((id) => clockPosition(id)!),
  ...SEVEN_CENTER_PLACES,
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

const IS_SEVEN_CENTER = new Set(SEVEN_PLANET_IDS);

type StarFortuneReviewBoardProps = {
  slotStates: Record<string, SpreadSlotState>;
  clientBirthday?: string;
  readingStartMonth?: string;
  supplements?: { planetByCardKey?: Record<string, string>; planetBySlotId?: Record<string, string> };
  detailOpen?: boolean;
  onClose?: () => void;
};

/** 星运牌阵回顾：十二宫钟面 + 圈内七张行星盘（木土/水金火/日月）+ 四元素四角；点击看大图 */
export function StarFortuneReviewBoard({
  slotStates,
  clientBirthday = "",
  readingStartMonth = "",
  supplements = {},
  detailOpen: controlledDetailOpen,
  onClose,
}: StarFortuneReviewBoardProps) {
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
    const isCenterSeven = IS_SEVEN_CENTER.has(slotId as (typeof SEVEN_PLANET_IDS)[number]);
    const boxClass = isCenterSeven
      ? "flex flex-col items-center justify-center rounded-xl border-2 border-[#a8d9c8] bg-white px-2 py-1 shadow-[0_4px_10px_rgba(5,150,105,0.10)]"
      : "flex flex-col items-center justify-center rounded-xl border-2 border-[#a8d9c8] bg-white px-2.5 py-2 shadow-[0_4px_10px_rgba(5,150,105,0.10)]";
    const sizeClass = isModal
      ? "h-[78px] w-[98px]"
      : isCenterSeven
        ? "h-[56px] min-w-[72px] w-[72px]"
        : "h-[78px] w-[98px]";
    const textClass = isModal ? "text-xs" : isCenterSeven ? "text-[10px]" : "text-xs";

    if (isModal) {
      const planet = getPlanet(slotId, cardName);
      const modalBoxClass = "flex flex-col items-center justify-center rounded-xl border-2 border-[#a8d9c8] bg-white px-2.5 py-2 shadow-[0_4px_10px_rgba(5,150,105,0.10)]";
      return (
        <div className={`${modalBoxClass} ${sizeClass}`}>
          <span className={`whitespace-nowrap font-semibold leading-tight text-tarot-green ${textClass}`}>{position}</span>
          <span className={`mt-0.5 whitespace-nowrap text-center leading-tight text-slate-700 ${textClass}`}>{cardName}</span>
          {planet ? <span className="mt-0.5 whitespace-nowrap text-xs font-normal leading-tight text-slate-500">{planet}</span> : null}
          {dateStr ? <span className="mt-0.5 whitespace-nowrap text-[11px] leading-tight text-slate-500">{dateStr}</span> : null}
        </div>
      );
    }
    return (
      <>
        <span className={`font-semibold leading-tight text-tarot-green ${textClass}`}>{position}</span>
        <span className={`mt-0.5 w-full text-center leading-tight text-slate-700 ${isCenterSeven ? "whitespace-nowrap" : "break-words line-clamp-2"} ${textClass}`}>{cardName}</span>
        {dateStr && <span className="mt-1 text-[8px] leading-tight text-slate-500">{dateStr}</span>}
      </>
    );
  };

  const cardSizeClass = (slotId: string) =>
    IS_SEVEN_CENTER.has(slotId as (typeof SEVEN_PLANET_IDS)[number])
      ? "h-[56px] min-w-[72px] w-[72px]"
      : "h-[68px] w-[84px]";

  return (
    <div className="w-full">
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
            className={`absolute flex flex-col items-center justify-center rounded-xl border-2 border-[#a8d9c8] bg-white px-2 py-1.5 shadow-[0_4px_10px_rgba(5,150,105,0.10)] ${cardSizeClass(place.id)}`}
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
