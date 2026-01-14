"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Car,
  Battery,
  Zap,
  Thermometer,
  Gauge,
  Wind,
  Users,
  Bluetooth,
  Info,
  ChevronRight,
  Map,
  Settings as SettingsIcon,
} from "lucide-react";
import {
  TabBar,
  ListGroup,
  ListItem,
  ListToggle,
  ListPicker,
  Sheet,
  Slider,
} from "@/components/ui";
import { AppHeader } from "@/components/AppHeader";
import { useVehicleStore } from "@/store";
import {
  NEXON_EV_VARIANTS,
  REGEN_LEVELS,
  NexonEVVariant,
  RegenLevel,
} from "@/types/vehicle";
import { useOBD, OBDStatusCard } from "@/services/obd";

// Tab configuration
const tabs = [
  { href: "/", label: "Dashboard", icon: Gauge, activeIcon: Gauge },
  { href: "/route", label: "Route", icon: Map, activeIcon: Map },
  {
    href: "/settings",
    label: "Settings",
    icon: SettingsIcon,
    activeIcon: SettingsIcon,
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const vehicle = useVehicleStore();

  const [showVariantPicker, setShowVariantPicker] = useState(false);
  const [showRegenPicker, setShowRegenPicker] = useState(false);

  const handleVariantSelect = (variant: NexonEVVariant) => {
    vehicle.setVariant(variant);
    setShowVariantPicker(false);
  };

  const handleRegenSelect = (regen: RegenLevel) => {
    vehicle.setRegenLevel(regen);
    setShowRegenPicker(false);
  };

  return (
    <div className="min-h-screen bg-background-primary dark:bg-background-dark-primary pb-24">
      {/* Navigation Bar */}
      <AppHeader
        title="Settings"
        showBackButton
        onBack={() => router.push("/")}
      />

      <div className="px-4 pt-4 space-y-4">
        {/* Vehicle Section */}
        <ListGroup
          header="Vehicle"
          footer="Select your EV variant for accurate range predictions."
          inset={false}
        >
          <ListPicker
            title="Variant"
            value={vehicle.variant.name}
            onClick={() => setShowVariantPicker(true)}
          />
          <ListItem
            title="Battery Capacity"
            trailing={`${vehicle.variant.batteryCapacity} kWh`}
          />
          <ListItem
            title="Official Range"
            trailing={`${vehicle.variant.officialRange} km`}
          />
        </ListGroup>

        {/* Battery Section */}
        <ListGroup header="Battery" inset={false}>
          <div className="px-4 py-4">
            <Slider
              label="State of Charge"
              value={vehicle.currentSoC}
              min={0}
              max={100}
              onChange={(v) => vehicle.setSoC(v)}
              showValue
              unit="%"
            />
          </div>
          <div className="px-4 py-4 border-t border-ios-gray-5 dark:border-gray-800">
            <Slider
              label="Battery Health"
              value={vehicle.batteryHealth}
              min={70}
              max={100}
              onChange={(v) => vehicle.setBatteryHealth(v)}
              showValue
              unit="%"
            />
          </div>
          <div className="px-4 py-4 border-t border-ios-gray-5 dark:border-gray-800">
            <Slider
              label="Battery Temperature"
              value={vehicle.batteryTemperature}
              min={-10}
              max={50}
              onChange={(v) => vehicle.setBatteryTemperature(v)}
              showValue
              unit="°C"
            />
          </div>
        </ListGroup>

        {/* Driving Settings */}
        <ListGroup header="Driving" inset={false}>
          <ListPicker
            title="Regen Level"
            value={`Level ${vehicle.regenLevel.level} - ${vehicle.regenLevel.name}`}
            onClick={() => setShowRegenPicker(true)}
          />
          <div className="px-4 py-4 border-t border-ios-gray-5 dark:border-gray-800">
            <Slider
              label="Payload (passengers + cargo)"
              value={vehicle.payload}
              min={0}
              max={400}
              step={25}
              onChange={(v) => vehicle.setPayload(v)}
              showValue
              unit=" kg"
            />
          </div>
          <div className="px-4 py-4 border-t border-ios-gray-5 dark:border-gray-800">
            <Slider
              label="Tire Pressure"
              value={vehicle.tirePressure}
              min={28}
              max={40}
              onChange={(v) => vehicle.setTirePressure(v)}
              showValue
              unit=" PSI"
            />
          </div>
        </ListGroup>

        {/* Climate Control */}
        <ListGroup
          header="Climate Control"
          footer="HVAC can reduce range by 10-25% depending on settings."
          inset={false}
        >
          <ListToggle
            title="Air Conditioning"
            subtitle={
              vehicle.hvacOn ? `Set to ${vehicle.hvacTemperature}°C` : "Off"
            }
            value={vehicle.hvacOn}
            onChange={(v) =>
              vehicle.setHvac(v, v ? "cooling" : "off", vehicle.hvacTemperature)
            }
          />
          {vehicle.hvacOn && (
            <div className="px-4 py-4 border-t border-ios-gray-5 dark:border-gray-800">
              <Slider
                label="Temperature"
                value={vehicle.hvacTemperature}
                min={16}
                max={30}
                onChange={(v) => vehicle.setHvac(true, vehicle.hvacMode, v)}
                showValue
                unit="°C"
              />
            </div>
          )}
        </ListGroup>

        {/* OBD Connection */}
        <ListGroup
          header="OBD-II Connection"
          footer="Connect to your vehicle via Bluetooth OBD adapter for real-time data. Recommended: drivepro ELM327 BLE (₹419 on Flipkart)."
          inset={false}
        >
          <div className="px-4 py-4">
            <OBDStatusCard />
          </div>
        </ListGroup>

        {/* About */}
        <ListGroup header="About" inset={false}>
          <ListItem title="Version" trailing="1.0.0" />
          <ListItem title="Supported Vehicles" trailing="Electric Vehicles" />
          <ListItem
            title="Data Sources"
            subtitle="OpenStreetMap, WeatherAPI, Open Topo Data"
            showChevron
            onClick={() => {}}
          />
        </ListGroup>

        {/* Reset */}
        <ListGroup inset={false}>
          <ListItem
            title="Reset to Defaults"
            destructive
            onClick={() => {
              if (confirm("Reset all settings to defaults?")) {
                vehicle.reset();
              }
            }}
          />
        </ListGroup>
      </div>

      {/* Variant Picker Sheet */}
      <Sheet
        isOpen={showVariantPicker}
        onClose={() => setShowVariantPicker(false)}
        title="Select Variant"
      >
        <div className="p-4">
          {Object.values(NEXON_EV_VARIANTS).map((variant) => (
            <button
              key={variant.id}
              onClick={() => handleVariantSelect(variant)}
              className={`
                w-full p-4 mb-2 rounded-ios-md text-left transition-colors
                ${
                  vehicle.variant.id === variant.id
                    ? "bg-ios-blue/10 border-2 border-ios-blue"
                    : "bg-ios-gray-6 dark:bg-background-dark-tertiary"
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-ios-headline">{variant.name}</h4>
                  <p className="text-ios-subhead text-ios-gray-1">
                    {variant.fullName}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-ios-headline">
                    {variant.batteryCapacity} kWh
                  </div>
                  <div className="text-ios-footnote text-ios-gray-1">
                    {variant.realWorldRange} km range
                  </div>
                </div>
              </div>
              <div className="flex gap-4 mt-3 text-ios-footnote text-ios-gray-1">
                <span>{variant.motorPower} PS</span>
                <span>{variant.torque} Nm</span>
                <span>0-100: {variant.acceleration0to100}s</span>
              </div>
            </button>
          ))}
        </div>
      </Sheet>

      {/* Regen Picker Sheet */}
      <Sheet
        isOpen={showRegenPicker}
        onClose={() => setShowRegenPicker(false)}
        title="Regeneration Level"
      >
        <div className="p-4">
          {REGEN_LEVELS.map((regen) => (
            <button
              key={regen.level}
              onClick={() => handleRegenSelect(regen)}
              className={`
                w-full p-4 mb-2 rounded-ios-md text-left transition-colors
                ${
                  vehicle.regenLevel.level === regen.level
                    ? "bg-ios-blue/10 border-2 border-ios-blue"
                    : "bg-ios-gray-6 dark:bg-background-dark-tertiary"
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-ios-headline">
                    Level {regen.level} - {regen.name}
                  </h4>
                  <p className="text-ios-subhead text-ios-gray-1">
                    {regen.description}
                  </p>
                </div>
                <div className="text-ios-headline text-ios-green">
                  {Math.round(regen.recoveryEfficiency * 100)}%
                </div>
              </div>
            </button>
          ))}
          <p className="text-ios-footnote text-ios-gray-1 text-center mt-4">
            Higher regen levels recover more energy during braking and
            deceleration.
          </p>
        </div>
      </Sheet>

      {/* Tab Bar */}
      <TabBar tabs={tabs} />
    </div>
  );
}
