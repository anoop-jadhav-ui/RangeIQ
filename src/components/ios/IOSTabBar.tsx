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

interface IOSTabBarProps {
  tabs: TabItem[];
}

export function IOSTabBar({ tabs }: IOSTabBarProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      <div className="bg-white/80 dark:bg-black/80 backdrop-blur-ios border-t border-ios-gray-5/50 dark:border-gray-800/50">
        <div className="flex items-center justify-around h-[49px] max-w-lg mx-auto">
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
                  ${isActive ? "text-ios-blue" : "text-ios-gray-1"}
                `}
              >
                <Icon
                  size={24}
                  strokeWidth={isActive ? 2 : 1.5}
                  fill={isActive ? "currentColor" : "none"}
                />
                <span className="text-[10px] font-medium mt-0.5">
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
      {/* Extra padding for home indicator on iPhone */}
      <div className="h-[env(safe-area-inset-bottom)] bg-white/80 dark:bg-black/80 backdrop-blur-ios" />
    </nav>
  );
}
