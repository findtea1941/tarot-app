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
  { href: "/cases", label: "案例库" },
  { href: "/deck", label: "牌库 / 设置" }
];

export function TopTabs({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="text-lg font-semibold tracking-wide text-tarot-accent">
            塔罗案例助手
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
                      ? "border-tarot-accent bg-tarot-card text-tarot-accent"
                      : "border-transparent text-slate-300 hover:border-slate-600 hover:bg-slate-900"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="flex-1 mx-auto max-w-5xl w-full px-4 py-6">
        {children}
      </main>
    </div>
  );
}

