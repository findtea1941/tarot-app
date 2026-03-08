'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

const tabs = [
  { href: "/tarot?new=1", label: "塔罗" },
  { href: "/lenormand", label: "雷诺曼" },
  { href: "/cases", label: "案例库" },
] as const;

export function TopTabs({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const currentPath = pathname ?? "";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b border-[#e4efe9] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between px-4 py-3">
          <div className="text-lg font-semibold tracking-wide text-tarot-green">
            占卜案例助手
          </div>
          <nav className="flex gap-2 text-sm">
            {tabs.map((tab) => {
              const pathOnly = tab.href.split("?")[0];
              const active =
                currentPath === pathOnly ||
                currentPath.startsWith(pathOnly + "/");
              return (
                <Link
                  key={pathOnly}
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
        {currentPath.match(/^\/tarot\/[^/]+\/spread$/)
          ? <div className="w-full">{children}</div>
          : currentPath.match(/^\/tarot\/[^/]+\/result$/)
            ? <div className="mx-auto max-w-[1800px] px-4 pt-0 pb-6">{children}</div>
            : (
              <div className="mx-auto max-w-[1800px] px-4 py-6">
                {children}
              </div>
            )}
      </main>
    </div>
  );
}

