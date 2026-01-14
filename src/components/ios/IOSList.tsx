"use client";

import React from "react";
import { ChevronRight } from "lucide-react";

interface IOSListGroupProps {
  header?: string;
  footer?: string;
  children: React.ReactNode;
  inset?: boolean;
}

export function IOSListGroup({
  header,
  footer,
  children,
  inset = true,
}: IOSListGroupProps) {
  return (
    <div className={inset ? "px-4" : ""}>
      {header && (
        <div className="text-ios-footnote text-ios-gray-1 uppercase px-4 pb-1.5 pt-4">
          {header}
        </div>
      )}
      <div className="bg-white dark:bg-background-dark-secondary rounded-ios-md overflow-hidden">
        {children}
      </div>
      {footer && (
        <div className="text-ios-footnote text-ios-gray-1 px-4 pt-1.5">
          {footer}
        </div>
      )}
    </div>
  );
}

interface IOSListItemProps {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  showChevron?: boolean;
  onClick?: () => void;
  destructive?: boolean;
}

export function IOSListItem({
  title,
  subtitle,
  leading,
  trailing,
  showChevron = false,
  onClick,
  destructive = false,
}: IOSListItemProps) {
  const baseClasses = `
    w-full flex items-center gap-3 px-4 py-3
    border-b border-ios-gray-5 dark:border-gray-800 last:border-b-0
    ${destructive ? "text-ios-red" : ""}
  `;

  const clickableClasses =
    "active:bg-ios-gray-6 dark:active:bg-gray-800 transition-colors cursor-pointer hover:bg-ios-gray-6/50";

  const content = (
    <>
      {leading && <div className="flex-shrink-0">{leading}</div>}

      <div className="flex-1 min-w-0 text-left">
        <div className={`text-ios-body ${destructive ? "text-ios-red" : ""}`}>
          {title}
        </div>
        {subtitle && (
          <div className="text-ios-footnote text-ios-gray-1 truncate">
            {subtitle}
          </div>
        )}
      </div>

      {trailing && (
        <div className="flex-shrink-0 text-ios-gray-1">{trailing}</div>
      )}

      {showChevron && (
        <ChevronRight size={18} className="text-ios-gray-3 flex-shrink-0" />
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClasses} ${clickableClasses}`}
      >
        {content}
      </button>
    );
  }

  return <div className={baseClasses}>{content}</div>;
}

// Toggle variant
interface IOSListToggleProps {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  value: boolean;
  onChange: (value: boolean) => void;
}

export function IOSListToggle({
  title,
  subtitle,
  leading,
  value,
  onChange,
}: IOSListToggleProps) {
  return (
    <div className="w-full flex items-center gap-3 px-4 py-3 border-b border-ios-gray-5 dark:border-gray-800 last:border-b-0">
      {leading && <div className="flex-shrink-0">{leading}</div>}

      <div className="flex-1 min-w-0">
        <div className="text-ios-body">{title}</div>
        {subtitle && (
          <div className="text-ios-footnote text-ios-gray-1">{subtitle}</div>
        )}
      </div>

      <button
        onClick={() => onChange(!value)}
        className={`
          relative w-[51px] h-[31px] rounded-full transition-colors duration-300
          ${value ? "bg-ios-green" : "bg-ios-gray-4"}
        `}
      >
        <div
          className={`
            absolute top-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-md
            transition-transform duration-300
            ${value ? "translate-x-[22px]" : "translate-x-[2px]"}
          `}
        />
      </button>
    </div>
  );
}

// Picker variant
interface IOSListPickerProps {
  title: string;
  value: string;
  onClick: () => void;
}

export function IOSListPicker({ title, value, onClick }: IOSListPickerProps) {
  return (
    <IOSListItem
      title={title}
      trailing={<span className="text-ios-gray-1">{value}</span>}
      showChevron
      onClick={onClick}
    />
  );
}
