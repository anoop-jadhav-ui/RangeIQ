"use client";

import React from "react";
import { Navigation, Clock, TrendingUp, ArrowRight } from "lucide-react";
import { Route, TripPrediction } from "@/types/route";

interface QuickTripCardProps {
  route: Route;
  prediction?: TripPrediction;
  onClick: () => void;
}

export function QuickTripCard({
  route,
  prediction,
  onClick,
}: QuickTripCardProps) {
  const canComplete = prediction?.canComplete ?? true;

  return (
    <button
      onClick={onClick}
      className="w-full bg-white dark:bg-background-dark-secondary rounded-ios-card p-4 text-left
        active:scale-[0.98] transition-transform duration-150"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`
          flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0
          ${canComplete ? "bg-ios-green/10" : "bg-ios-orange/10"}
        `}
        >
          <Navigation
            size={20}
            className={canComplete ? "text-ios-green" : "text-ios-orange"}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-ios-headline truncate">{route.name}</h4>

          <div className="flex items-center gap-3 mt-1">
            <span className="text-ios-subhead text-ios-gray-1">
              {route.totalDistance.toFixed(1)} km
            </span>
            <span className="text-ios-subhead text-ios-gray-1">
              ~{route.estimatedDuration} min
            </span>
          </div>

          {prediction && (
            <div className="flex items-center gap-2 mt-2">
              <div
                className={`
                px-2 py-0.5 rounded text-ios-caption1 font-medium
                ${
                  canComplete
                    ? "bg-ios-green/10 text-ios-green"
                    : "bg-ios-orange/10 text-ios-orange"
                }
              `}
              >
                {prediction.predictedEndSoC}% at arrival
              </div>
              <span className="text-ios-caption1 text-ios-gray-2">
                {prediction.consumptionPerKm.toFixed(0)} Wh/km
              </span>
            </div>
          )}
        </div>

        {/* Arrow */}
        <ArrowRight size={20} className="text-ios-gray-3 flex-shrink-0 mt-2" />
      </div>
    </button>
  );
}

// Recent/Saved Routes Section
interface RecentRoutesProps {
  routes: Route[];
  onRouteClick: (route: Route) => void;
}

export function RecentRoutes({ routes, onRouteClick }: RecentRoutesProps) {
  if (routes.length === 0) {
    return (
      <div className="text-center py-8">
        <Navigation size={32} className="text-ios-gray-3 mx-auto mb-2" />
        <p className="text-ios-subhead text-ios-gray-1">No recent routes</p>
        <p className="text-ios-footnote text-ios-gray-2">
          Plan a trip to see it here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {routes.slice(0, 3).map((route) => (
        <QuickTripCard
          key={route.id}
          route={route}
          onClick={() => onRouteClick(route)}
        />
      ))}
    </div>
  );
}
