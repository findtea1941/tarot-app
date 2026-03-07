'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

interface TabItem {
  href: string;
  label: string;
}

const tabs: TabItem[] = [
  { href: "/tarot", label: "塔罗" },
  { href: "/lenormand", label: "雷诺曼" },
  { href: "/cases", label: "案例库" }
];

export function TopTabs({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b border-[#e4efe9] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between px-4 py-3">
          <div className="text-lg font-semibold tracking-wide text-tarot-green">
            占卜案例助手
          </div>
          <nav className="flex gap-2 text-sm">
            {tabs.map((tab) => {
              const active =
                pathname === tab.href ||
                (tab.href !== "/" && pathname.startsWith(tab.href));
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-3 py-1.5 rounded-full border transition-colors ${
                    active
                      ? "border-[#c8e9d8] bg-[#ecf8f2] text-tarot-green"
                      : "border-transparent text-slate-500 hover:border-[#d5e9e0] hover:bg-[#f4fbf8] hover:text-slate-700"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto flex-1 w-full max-w-[1800px] px-4 py-6">
        {children}
      </main>
    </div>
  );
}

