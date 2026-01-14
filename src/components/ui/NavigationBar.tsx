"use client";

import React from "react";
import { ChevronLeft, Zap } from "lucide-react";

interface NavigationBarProps {
  title: string;
  subtitle?: string;
  largeTitle?: boolean;
  leftButton?: React.ReactNode;
  rightButton?: React.ReactNode;
  onBack?: () => void;
  showBackButton?: boolean;
  transparent?: boolean;
  showBranding?: boolean;
}

export function NavigationBar({
  title,
  subtitle,
  largeTitle = false,
  leftButton,
  rightButton,
  onBack,
  showBackButton = false,
  transparent = false,
  showBranding = false,
}: NavigationBarProps) {
  return (
    <div
      className={`
        sticky top-0 z-50 safe-top
        ${
          transparent
            ? "bg-transparent"
            : "bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50"
        }
      `}
    >
      {/* Branded Header with Logo */}
      {showBranding ? (
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-sm">
                <Zap size={20} color="white" fill="white" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-xs text-gray-500">{subtitle}</p>
                )}
              </div>
            </div>
            {rightButton && (
              <div className="flex items-center">{rightButton}</div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Standard Navigation Bar */}
          <div className="flex items-center justify-between h-12 px-4">
            {/* Left Side */}
            <div className="flex items-center min-w-[70px]">
              {showBackButton && onBack ? (
                <button
                  onClick={onBack}
                  className="flex items-center text-ios-blue active:opacity-50 -ml-2 pr-2"
                >
                  <ChevronLeft size={28} strokeWidth={2.5} />
                  <span className="text-base">Back</span>
                </button>
              ) : (
                leftButton
              )}
            </div>

            {/* Center Title (only shown if not large title) */}
            {!largeTitle && (
              <h1 className="text-base font-semibold text-center truncate flex-1 px-2">
                {title}
              </h1>
            )}

            {/* Right Side */}
            <div className="flex items-center justify-end min-w-[70px]">
              {rightButton}
            </div>
          </div>

          {/* Large Title */}
          {largeTitle && (
            <div className="px-4 pb-2">
              <h1 className="text-3xl font-bold">{title}</h1>
              {subtitle && (
                <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
