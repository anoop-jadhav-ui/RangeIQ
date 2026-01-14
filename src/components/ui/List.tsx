"use client";

import React from "react";
import { ChevronRight } from "lucide-react";

interface ListGroupProps {
  header?: string;
  footer?: string;
  children: React.ReactNode;
  inset?: boolean;
}

export function ListGroup({
  header,
  footer,
  children,
  inset = true,
}: ListGroupProps) {
  return (
    <div className={inset ? "px-4" : ""}>
      {header && (
        <div
          className={`text-xs font-medium text-gray-500 uppercase tracking-wide pb-2 pt-4 ${
            inset ? "px-4" : ""
          }`}
        >
          {header}
        </div>
      )}
      <div className="bg-white dark:bg-background-dark-secondary rounded-xl overflow-hidden">
        {children}
      </div>
      {footer && (
        <div className={`text-xs text-gray-500 pt-2 ${inset ? "px-4" : ""}`}>
          {footer}
        </div>
      )}
    </div>
  );
}

interface ListItemProps {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  showChevron?: boolean;
  onClick?: () => void;
  destructive?: boolean;
}

export function ListItem({
  title,
  subtitle,
  leading,
  trailing,
  showChevron = false,
  onClick,
  destructive = false,
}: ListItemProps) {
  const baseClasses = `
    w-full flex items-center gap-3 px-4 py-3.5
    border-b border-gray-100 dark:border-gray-800 last:border-b-0
    ${destructive ? "text-ios-red" : ""}
  `;

  const clickableClasses =
    "active:bg-gray-50 dark:active:bg-gray-800 transition-colors cursor-pointer hover:bg-gray-50/50";

  const content = (
    <>
      {leading && <div className="flex-shrink-0">{leading}</div>}

      <div className="flex-1 min-w-0 text-left">
        <div
          className={`text-base ${
            destructive ? "text-ios-red" : "text-gray-900 dark:text-white"
          }`}
        >
          {title}
        </div>
        {subtitle && (
          <div className="text-sm text-gray-500 truncate mt-0.5">
            {subtitle}
          </div>
        )}
      </div>

      {trailing && (
        <div className="flex-shrink-0 text-gray-500">{trailing}</div>
      )}

      {showChevron && (
        <ChevronRight size={18} className="text-gray-400 flex-shrink-0" />
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
interface ListToggleProps {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  value: boolean;
  onChange: (value: boolean) => void;
}

export function ListToggle({
  title,
  subtitle,
  leading,
  value,
  onChange,
}: ListToggleProps) {
  return (
    <div className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
      {leading && <div className="flex-shrink-0">{leading}</div>}

      <div className="flex-1 min-w-0">
        <div className="text-base text-gray-900 dark:text-white">{title}</div>
        {subtitle && (
          <div className="text-sm text-gray-500 mt-0.5">{subtitle}</div>
        )}
      </div>

      <button
        onClick={() => onChange(!value)}
        className={`
          relative w-[51px] h-[31px] rounded-full transition-colors duration-300
          ${value ? "bg-ios-green" : "bg-gray-300 dark:bg-gray-600"}
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
interface ListPickerProps {
  title: string;
  value: string;
  onClick: () => void;
}

export function ListPicker({ title, value, onClick }: ListPickerProps) {
  return (
    <ListItem
      title={title}
      trailing={<span className="text-gray-500">{value}</span>}
      showChevron
      onClick={onClick}
    />
  );
}
