"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon } from "lucide-react";

interface TabItem {
  href: string;
  label: string;
  icon: LucideIcon;
  activeIcon?: LucideIcon;
}

interface TabBarProps {
  tabs: TabItem[];
}

export function TabBar({ tabs }: TabBarProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      <div className="bg-white/80 dark:bg-black/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-800/50">
        <div className="flex items-center justify-around h-[52px] max-w-lg mx-auto">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            const Icon = isActive && tab.activeIcon ? tab.activeIcon : tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`
                  flex flex-col items-center justify-center flex-1 h-full
                  transition-colors duration-150
                  ${isActive ? "text-ios-blue" : "text-gray-400"}
                `}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 1.5} />
                <span className="text-[11px] font-medium mt-0.5">
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
      {/* Extra padding for home indicator on iPhone */}
      <div className="h-[env(safe-area-inset-bottom)] bg-white/80 dark:bg-black/80 backdrop-blur-xl" />
    </nav>
  );
}
