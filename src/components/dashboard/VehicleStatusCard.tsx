"use client";

import React from "react";
import { Battery, Bluetooth, BluetoothOff, Gauge, Zap } from "lucide-react";
import { VehicleState, REGEN_LEVELS } from "@/types/vehicle";

interface VehicleStatusCardProps {
  vehicle: VehicleState;
  onConnect?: () => void;
}

export function VehicleStatusCard({
  vehicle,
  onConnect,
}: VehicleStatusCardProps) {
  return (
    <div className="bg-white dark:bg-background-dark-secondary rounded-ios-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-ios-headline text-gray-900 dark:text-white">
            {vehicle.variant.name}
          </h3>
          <p className="text-ios-caption1 text-ios-gray-1">
            {vehicle.variant.fullName}
          </p>
        </div>

        {/* Connection Status */}
        <button
          onClick={onConnect}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-full text-ios-caption1 font-medium
            ${
              vehicle.isConnected
                ? "bg-ios-green/10 text-ios-green"
                : "bg-ios-gray-6 dark:bg-background-dark-tertiary text-ios-gray-1"
            }
          `}
        >
          {vehicle.isConnected ? (
            <>
              <Bluetooth size={14} />
              <span>Connected</span>
            </>
          ) : (
            <>
              <BluetoothOff size={14} />
              <span>Connect OBD</span>
            </>
          )}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Battery Health */}
        <div className="bg-ios-gray-6 dark:bg-background-dark-tertiary rounded-ios-sm p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Battery size={14} className="text-ios-green" />
            <span className="text-ios-caption1 text-ios-gray-1">Health</span>
          </div>
          <span className="text-ios-title3 text-gray-900 dark:text-white">
            {vehicle.batteryHealth}%
          </span>
        </div>

        {/* Battery Temp */}
        <div className="bg-ios-gray-6 dark:bg-background-dark-tertiary rounded-ios-sm p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Gauge size={14} className="text-ios-orange" />
            <span className="text-ios-caption1 text-ios-gray-1">Temp</span>
          </div>
          <span className="text-ios-title3 text-gray-900 dark:text-white">
            {vehicle.batteryTemperature}°C
          </span>
        </div>

        {/* Regen Level */}
        <div className="bg-ios-gray-6 dark:bg-background-dark-tertiary rounded-ios-sm p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap size={14} className="text-ios-blue" />
            <span className="text-ios-caption1 text-ios-gray-1">Regen</span>
          </div>
          <span className="text-ios-title3 text-gray-900 dark:text-white">
            L{vehicle.regenLevel.level}
          </span>
        </div>
      </div>

      {/* HVAC Status */}
      {vehicle.hvacOn && (
        <div className="mt-3 px-3 py-2 bg-ios-blue/10 rounded-ios-sm">
          <div className="flex items-center justify-between">
            <span className="text-ios-footnote text-ios-blue">
              {vehicle.hvacMode === "cooling" ? "❄️ AC" : "🔥 Heating"} Active
            </span>
            <span className="text-ios-footnote text-ios-gray-1">
              Set to {vehicle.hvacTemperature}°C • ~10% range impact
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
