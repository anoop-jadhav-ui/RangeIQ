"use client";

import React, { useEffect, useState } from "react";

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  showHandle?: boolean;
  height?: "auto" | "half" | "full";
}

export function Sheet({
  isOpen,
  onClose,
  children,
  title,
  showHandle = true,
  height = "auto",
}: SheetProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      setTimeout(() => setIsVisible(false), 300);
    }
  }, [isOpen]);

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/40 z-[60] transition-opacity duration-300
          ${isAnimating ? "opacity-100" : "opacity-0"}
        `}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`
          fixed bottom-0 left-0 right-0 z-[60]
          bg-white dark:bg-background-dark-secondary
          rounded-t-3xl
          transform transition-transform duration-300 ease-out
          ${isAnimating ? "translate-y-0" : "translate-y-full"}
        `}
        style={{ maxHeight: "80vh" }}
      >
        {/* Handle */}
        {showHandle && (
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-9 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>
        )}

        {/* Title */}
        {title && (
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-base font-semibold text-center">{title}</h2>
          </div>
        )}

        {/* Content */}
        <div
          className="overflow-y-auto overscroll-contain"
          style={{ maxHeight: "calc(80vh - 120px)", paddingBottom: "100px" }}
        >
          {children}
        </div>
      </div>
    </>
  );
}

// Action Sheet variant
interface ActionSheetAction {
  label: string;
  onClick: () => void;
  destructive?: boolean;
}

interface ActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  actions: ActionSheetAction[];
  cancelLabel?: string;
}

export function ActionSheet({
  isOpen,
  onClose,
  title,
  message,
  actions,
  cancelLabel = "Cancel",
}: ActionSheetProps) {
  return (
    <Sheet isOpen={isOpen} onClose={onClose} showHandle={false}>
      <div className="p-2">
        {/* Actions group */}
        <div className="bg-gray-100/90 dark:bg-background-dark-tertiary/90 rounded-xl overflow-hidden mb-2">
          {(title || message) && (
            <div className="px-4 py-3 text-center border-b border-gray-200/50 dark:border-gray-700/50">
              {title && (
                <div className="text-sm text-gray-500 font-semibold">
                  {title}
                </div>
              )}
              {message && (
                <div className="text-sm text-gray-500 mt-0.5">{message}</div>
              )}
            </div>
          )}

          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.onClick();
                onClose();
              }}
              className={`
                w-full py-4 text-center text-lg font-normal
                border-b border-gray-200/50 dark:border-gray-700/50 last:border-b-0
                active:bg-gray-200 dark:active:bg-gray-700
                ${action.destructive ? "text-ios-red" : "text-ios-blue"}
              `}
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* Cancel button */}
        <button
          onClick={onClose}
          className="w-full py-4 text-center text-lg font-semibold text-ios-blue 
                     bg-white dark:bg-background-dark-secondary rounded-xl
                     active:bg-gray-100 dark:active:bg-gray-800"
        >
          {cancelLabel}
        </button>
      </div>
    </Sheet>
  );
}
