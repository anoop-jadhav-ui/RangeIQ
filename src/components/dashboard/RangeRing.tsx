"use client";

import React from "react";

interface RangeRingProps {
  currentSoC: number; // 0-100
  predictedRange: number; // km
  maxRange: number; // km (based on variant)
  size?: number;
  strokeWidth?: number;
  isCharging?: boolean;
}

export function RangeRing({
  currentSoC,
  predictedRange,
  maxRange,
  size = 240,
  strokeWidth = 12,
  isCharging = false,
}: RangeRingProps) {
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (currentSoC / 100) * circumference;

  // Get color based on SoC
  const getColor = (soc: number) => {
    if (soc >= 60) return "#34C759"; // Green
    if (soc >= 40) return "#30D158"; // Light Green
    if (soc >= 25) return "#FFCC00"; // Yellow
    if (soc >= 10) return "#FF9500"; // Orange
    return "#FF3B30"; // Red
  };

  const ringColor = getColor(currentSoC);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Background Ring */}
      <svg width={size} height={size} className="absolute transform -rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-ios-gray-5 dark:text-gray-700"
        />
      </svg>

      {/* Progress Ring */}
      <svg width={size} height={size} className="absolute transform -rotate-90">
        <defs>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={ringColor} />
            <stop offset="100%" stopColor={ringColor} stopOpacity={0.7} />
          </linearGradient>
        </defs>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="url(#ringGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
          style={{
            filter: "drop-shadow(0 0 8px " + ringColor + "40)",
          }}
        />
      </svg>

      {/* Pulsing effect when charging */}
      {isCharging && (
        <svg
          width={size}
          height={size}
          className="absolute transform -rotate-90 animate-pulse-ring"
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth + 4}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            opacity={0.3}
          />
        </svg>
      )}

      {/* Center Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* Range Value */}
        <div className="relative">
          <span className="text-[32px] font-bold leading-none text-gray-900 dark:text-white">
            {predictedRange}
          </span>
          <span className="absolute -right-7 bottom-1 text-base font-medium text-gray-500">
            km
          </span>
        </div>

        {/* Max Range Reference */}
        <span className="text-xs text-gray-400 mt-2">of {maxRange} km max</span>

        {/* SoC Percentage */}
        <div className="flex items-center justify-center gap-1.5 mt-1">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: ringColor }}
          />
          <span className="text-sm text-gray-500">
            {currentSoC}%{isCharging && " ⚡"}
          </span>
        </div>
      </div>
    </div>
  );
}
