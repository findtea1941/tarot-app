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
                  className={`px-3 py-1.5 rounded-full border-0 transition-colors ${
                    active
                      ? "bg-[#e5f3f0] font-bold text-[#009769]"
                      : "bg-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="min-h-[calc(100vh-56px)] w-full flex-1 bg-gradient-to-b from-white via-[#fafdfc] to-[#f5faf9]">
        <div className="mx-auto max-w-[1800px] px-4 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}

