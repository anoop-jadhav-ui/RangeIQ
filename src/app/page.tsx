"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Navigation,
  ChevronRight,
  Battery,
  Thermometer,
  Zap,
  Gauge,
  Map,
  Settings,
  Plug,
} from "lucide-react";
import { TabBar, Card } from "@/components/ui";
import { AppHeader } from "@/components/AppHeader";
import { RangeRing, WeatherCard, RecentRoutes } from "@/components/dashboard";
import { useVehicleStore, useRouteStore } from "@/store";
import { useOBD } from "@/services/obd";
import { getSimpleRangeEstimate } from "@/services/prediction";
import { WeatherConditions } from "@/types/route";

const tabs = [
  { href: "/", label: "Dashboard", icon: Gauge, activeIcon: Gauge },
  { href: "/route", label: "Route", icon: Map, activeIcon: Map },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    activeIcon: Settings,
  },
];

// Skeleton component for loading states
function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${
        className || ""
      }`}
    />
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const vehicle = useVehicleStore();
  const { recentRoutes } = useRouteStore();
  const { isConnected, isConnecting, connect, disconnect } = useOBD();

  const [weather, setWeather] = useState<WeatherConditions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const predictedRange = getSimpleRangeEstimate(vehicle);

  useEffect(() => {
    // Simulate initial data load
    setTimeout(() => {
      setWeather({
        temperature: 28,
        humidity: 65,
        windSpeed: 12,
        windDirection: 270,
        precipitation: 0,
        condition: "clear",
      });
      setIsLoading(false);
    }, 600);
  }, []);

  const handlePlanTrip = () => router.push("/route");

  return (
    <div className="min-h-screen bg-background-primary dark:bg-background-dark-primary pb-20">
      {/* Header */}
      <AppHeader
        rightButton={
          <button
            onClick={handlePlanTrip}
            className="w-9 h-9 rounded-full bg-ios-blue/10 flex items-center justify-center text-ios-blue"
          >
            <Plus size={20} />
          </button>
        }
      />

      <div className="px-4 pt-4 space-y-4">
        {/* Vehicle Name */}
        <div className="flex items-center justify-between">
          <div>
            {isLoading ? (
              <>
                <Skeleton className="h-7 w-40 mb-1" />
                <Skeleton className="h-4 w-24" />
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {vehicle.variant.fullName}
                </h1>
                <p className="text-sm text-ios-gray-1">
                  {vehicle.variant.batteryCapacity} kWh Battery
                </p>
              </>
            )}
          </div>
          {/* OBD Connection Button */}
          <button
            onClick={isConnected ? disconnect : connect}
            disabled={isConnecting}
            className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
              isConnected
                ? "bg-ios-green/10 text-ios-green"
                : isConnecting
                ? "bg-ios-gray-4 text-ios-gray-2"
                : "bg-ios-blue/10 text-ios-blue"
            }`}
          >
            <Plug size={16} />
            <span className="hidden sm:inline">
              {isConnected
                ? "Connected"
                : isConnecting
                ? "Connecting..."
                : "Connect OBD"}
            </span>
          </button>
        </div>

        {/* Main Range Card */}
        <Card className="py-6">
          {isLoading ? (
            <div className="flex justify-center">
              <Skeleton className="w-[200px] h-[200px] rounded-full" />
            </div>
          ) : (
            <div className="flex justify-center">
              <RangeRing
                currentSoC={vehicle.currentSoC}
                predictedRange={predictedRange}
                maxRange={vehicle.variant.realWorldRange}
                size={200}
              />
            </div>
          )}

          <div className="flex justify-center mt-5">
            <button
              onClick={handlePlanTrip}
              className="flex items-center gap-2 px-5 py-2.5 bg-ios-blue text-white rounded-full text-sm font-medium"
            >
              <Navigation size={16} />
              Plan Trip
            </button>
          </div>
        </Card>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <Battery size={20} className="mx-auto mb-1.5 text-ios-green" />
            <p className="text-xs text-gray-500 mb-0.5">Health</p>
            {isLoading ? (
              <Skeleton className="h-6 w-12 mx-auto" />
            ) : (
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {vehicle.batteryHealth}%
              </p>
            )}
          </Card>
          <Card className="p-3 text-center">
            <Thermometer size={20} className="mx-auto mb-1.5 text-ios-orange" />
            <p className="text-xs text-gray-500 mb-0.5">Batt Temp</p>
            {isLoading ? (
              <Skeleton className="h-6 w-12 mx-auto" />
            ) : (
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {vehicle.batteryTemperature}°C
              </p>
            )}
          </Card>
          <Card className="p-3 text-center">
            <Zap size={20} className="mx-auto mb-1.5 text-ios-blue" />
            <p className="text-xs text-gray-500 mb-0.5">Regen</p>
            {isLoading ? (
              <Skeleton className="h-6 w-12 mx-auto" />
            ) : (
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                L{vehicle.regenLevel.level}
              </p>
            )}
          </Card>
        </div>

        {/* Last Connection Message */}
        {!isConnected && !isLoading && (
          <p className="text-center text-xs text-ios-gray-1">
            Showing last synced data • Connect OBD for live updates
          </p>
        )}

        {/* Weather */}
        <WeatherCard weather={weather} isLoading={isLoading} />

        {/* Recent Routes */}
        {recentRoutes.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Recent Routes
              </h3>
              <button
                onClick={() => router.push("/route/history")}
                className="flex items-center text-ios-blue text-sm"
              >
                See All
                <ChevronRight size={14} />
              </button>
            </div>
            <RecentRoutes
              routes={recentRoutes}
              onRouteClick={(route) => {
                useRouteStore.getState().setRoute(route);
                router.push("/route");
              }}
            />
          </div>
        )}
      </div>

      <TabBar tabs={tabs} />
    </div>
  );
}
