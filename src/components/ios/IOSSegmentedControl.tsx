"use client";

import React from "react";

interface IOSSegmentedControlProps {
  segments: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

export function IOSSegmentedControl({
  segments,
  selectedIndex,
  onChange,
}: IOSSegmentedControlProps) {
  return (
    <div className="flex bg-ios-gray-6 dark:bg-background-dark-tertiary rounded-[9px] p-[2px]">
      {segments.map((segment, index) => (
        <button
          key={segment}
          onClick={() => onChange(index)}
          className={`
            flex-1 py-1.5 px-3 text-center text-ios-subhead font-medium rounded-[7px]
            transition-all duration-200
            ${
              selectedIndex === index
                ? "bg-white dark:bg-background-dark-secondary shadow-ios-sm"
                : "text-ios-gray-1"
            }
          `}
        >
          {segment}
        </button>
      ))}
    </div>
  );
}
