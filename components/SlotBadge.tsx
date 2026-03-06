"use client";

/**
 * 牌背/卡位徽标：圈内编号 + 换行位置名称，可访问性 aria-label
 */
export function SlotBadge({
  index,
  name,
  dimmed = false,
}: {
  index: string;
  name: string;
  dimmed?: boolean;
}) {
  return (
    <div
      className={`absolute top-2 left-2 z-10 pointer-events-none flex flex-col items-center ${
        dimmed ? "opacity-60 hover:opacity-100 focus-within:opacity-100" : ""
      }`}
      aria-label={`位置${index} ${name}`}
      role="img"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-500 bg-slate-800/90 text-xs font-medium text-slate-200">
        {index}
      </span>
      <span className="mt-0.5 max-w-[4rem] truncate text-center text-[10px] leading-tight text-slate-300">
        {name}
      </span>
    </div>
  );
}
