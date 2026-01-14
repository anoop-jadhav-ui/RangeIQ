"use client";

import React from "react";

interface SegmentedControlProps {
  segments: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

export function SegmentedControl({
  segments,
  selectedIndex,
  onChange,
}: SegmentedControlProps) {
  return (
    <div className="flex bg-gray-100 dark:bg-background-dark-tertiary rounded-lg p-[2px]">
      {segments.map((segment, index) => (
        <button
          key={segment}
          onClick={() => onChange(index)}
          className={`
            flex-1 py-2 px-3 text-center text-sm font-medium rounded-md
            transition-all duration-200
            ${
              selectedIndex === index
                ? "bg-white dark:bg-background-dark-secondary shadow-sm text-gray-900 dark:text-white"
                : "text-gray-500"
            }
          `}
        >
          {segment}
        </button>
      ))}
    </div>
  );
}
