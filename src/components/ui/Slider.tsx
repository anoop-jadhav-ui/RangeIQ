"use client";

import React from "react";

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  showValue?: boolean;
  label?: string;
  unit?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  showValue = false,
  label,
  unit = "",
  leftIcon,
  rightIcon,
}: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-2">
          {label && <span className="text-sm text-gray-500">{label}</span>}
          {showValue && (
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {value}
              {unit}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        {leftIcon && (
          <div className="text-gray-400 flex-shrink-0">{leftIcon}</div>
        )}

        <div className="relative flex-1 h-7 flex items-center">
          {/* Track background */}
          <div className="absolute w-full h-1 bg-gray-200 dark:bg-gray-600 rounded-full" />

          {/* Track fill */}
          <div
            className="absolute h-1 bg-ios-blue rounded-full"
            style={{ width: `${percentage}%` }}
          />

          {/* Native input for accessibility */}
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="absolute w-full h-7 opacity-0 cursor-pointer z-10"
          />

          {/* Custom thumb */}
          <div
            className="absolute w-7 h-7 bg-white rounded-full shadow-lg pointer-events-none"
            style={{ left: `calc(${percentage}% - 14px)` }}
          />
        </div>

        {rightIcon && (
          <div className="text-gray-400 flex-shrink-0">{rightIcon}</div>
        )}
      </div>
    </div>
  );
}
