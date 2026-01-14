"use client";

import React from "react";
import {
  Thermometer,
  Wind,
  CloudRain,
  Sun,
  Cloud,
  CloudFog,
  Snowflake,
} from "lucide-react";
import { WeatherConditions, WeatherType } from "@/types/route";

interface WeatherCardProps {
  weather: WeatherConditions | null;
  isLoading?: boolean;
}

const weatherIcons: Record<WeatherType, React.ReactNode> = {
  clear: <Sun size={24} className="text-ios-yellow" />,
  cloudy: <Cloud size={24} className="text-ios-gray-1" />,
  rain: <CloudRain size={24} className="text-ios-blue" />,
  heavy_rain: <CloudRain size={24} className="text-ios-blue" />,
  fog: <CloudFog size={24} className="text-ios-gray-2" />,
  hot: <Sun size={24} className="text-ios-orange" />,
  cold: <Snowflake size={24} className="text-ios-teal" />,
};

export function WeatherCard({ weather, isLoading }: WeatherCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-background-dark-secondary rounded-2xl p-4 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
          <div className="space-y-2 flex-1">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
          </div>
        </div>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="bg-white dark:bg-background-dark-secondary rounded-2xl p-4">
        <p className="text-base text-gray-500">
          Location access required for weather
        </p>
      </div>
    );
  }

  // Calculate impact on range
  const getImpactText = () => {
    const impacts: string[] = [];

    if (weather.temperature < 10) {
      impacts.push("Cold: -15% range");
    } else if (weather.temperature > 35) {
      impacts.push("Hot: -10% range");
    }

    if (weather.windSpeed > 30) {
      impacts.push("Wind: -8% range");
    }

    if (weather.precipitation > 0) {
      impacts.push("Wet: -5% range");
    }

    return impacts.length > 0 ? impacts.join(" • ") : "Optimal conditions";
  };

  return (
    <div className="bg-white dark:bg-background-dark-secondary rounded-2xl p-4">
      <div className="flex items-center gap-4">
        {/* Weather condition icon */}
        <div className="w-12 h-12 bg-gray-100 dark:bg-background-dark-tertiary rounded-full flex items-center justify-center shrink-0">
          {weatherIcons[weather.condition] || <Sun size={24} />}
        </div>

        {/* Weather details */}
        <div className="flex-1">
          <div className="flex items-center gap-4">
            {/* Temperature with icon */}
            <div className="flex items-center gap-1.5">
              <Thermometer size={18} className="text-ios-orange" />
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {weather.temperature}°C
              </span>
            </div>
            {/* Wind with icon */}
            <div className="flex items-center gap-1.5">
              <Wind size={18} className="text-ios-teal" />
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {weather.windSpeed} km/h
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-1">{getImpactText()}</p>
        </div>
      </div>
    </div>
  );
}
