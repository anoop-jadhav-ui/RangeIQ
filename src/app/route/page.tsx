"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Search,
  MapPin,
  Navigation,
  Clock,
  TrendingUp,
  Zap,
  AlertTriangle,
  ChevronRight,
  Gauge,
  Map,
  Settings,
} from "lucide-react";
import {
  NavigationBar,
  TabBar,
  Card,
  Button,
  ListGroup,
  ListItem,
} from "@/components/ui";
import { AppHeader } from "@/components/AppHeader";
import { useVehicleStore, useRouteStore } from "@/store";
import { TripPrediction, Route, Coordinate } from "@/types/route";

// Dynamically import map to avoid SSR issues
const RouteMap = dynamic(() => import("@/components/route/RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-ios-gray-6 dark:bg-background-dark-tertiary rounded-ios-md animate-pulse flex items-center justify-center">
      <Map size={32} className="text-ios-gray-3" />
    </div>
  ),
});

// Tab configuration
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

// Sample locations in Maharashtra
const SAMPLE_LOCATIONS = [
  { name: "Home", address: "Pune", lat: 18.5204, lng: 73.8567 },
  { name: "Work", address: "Hinjewadi, Pune", lat: 18.5912, lng: 73.738 },
  { name: "Mumbai", address: "Mumbai, Maharashtra", lat: 19.076, lng: 72.8777 },
  {
    name: "Lonavala",
    address: "Lonavala, Maharashtra",
    lat: 18.7546,
    lng: 73.4062,
  },
  {
    name: "Mahabaleshwar",
    address: "Mahabaleshwar, Maharashtra",
    lat: 17.9307,
    lng: 73.6477,
  },
];

export default function RoutePage() {
  const router = useRouter();
  const vehicle = useVehicleStore();
  const routeStore = useRouteStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchType, setSearchType] = useState<"origin" | "destination">(
    "destination"
  );
  const [prediction, setPrediction] = useState<TripPrediction | null>(null);

  // Track selected locations with names
  const [originLocation, setOriginLocation] = useState<
    (typeof SAMPLE_LOCATIONS)[0] | null
  >(
    SAMPLE_LOCATIONS[0] // Default to "Home" (Pune)
  );
  const [destinationLocation, setDestinationLocation] = useState<
    (typeof SAMPLE_LOCATIONS)[0] | null
  >(null);

  // Demo route for display
  const [demoRoute, setDemoRoute] = useState<Route | null>(null);

  const handleLocationSelect = (
    location: (typeof SAMPLE_LOCATIONS)[0],
    type: "origin" | "destination"
  ) => {
    const coord: Coordinate = {
      lat: location.lat,
      lng: location.lng,
      elevation: 0,
    };

    if (type === "origin") {
      setOriginLocation(location);
      routeStore.setOrigin(coord);

      // If destination is already set, create route
      if (destinationLocation) {
        const destCoord: Coordinate = {
          lat: destinationLocation.lat,
          lng: destinationLocation.lng,
          elevation: 0,
        };
        createDemoRoute(coord, destCoord, destinationLocation.name);
      }
    } else {
      setDestinationLocation(location);
      routeStore.setDestination(coord);

      // Use current origin or default
      const currentOrigin = originLocation || SAMPLE_LOCATIONS[0];
      const originCoord: Coordinate = {
        lat: currentOrigin.lat,
        lng: currentOrigin.lng,
        elevation: 0,
      };
      createDemoRoute(originCoord, coord, location.name);
    }

    setShowSearch(false);
    setSearchQuery("");
  };

  const createDemoRoute = (
    origin: Coordinate,
    destination: Coordinate,
    name: string
  ) => {
    // Calculate approximate distance (Haversine formula simplified)
    const R = 6371; // Earth's radius in km
    const dLat = ((destination.lat - origin.lat) * Math.PI) / 180;
    const dLng = ((destination.lng - origin.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((origin.lat * Math.PI) / 180) *
        Math.cos((destination.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Create demo route
    const route: Route = {
      id: `route-${Date.now()}`,
      name: name,
      origin,
      destination,
      waypoints: [],
      segments: [],
      totalDistance: Math.round(distance),
      totalElevationGain: Math.round(distance * 5), // Demo: 5m gain per km
      totalElevationLoss: Math.round(distance * 3), // Demo: 3m loss per km
      estimatedDuration: Math.round(distance * 1.5), // Demo: 1.5 min per km
      polyline: [origin, destination],
    };

    setDemoRoute(route);
    routeStore.setRoute(route);

    // Create demo prediction
    const energyPerKm = vehicle.variant.baseConsumption;
    const totalEnergy = (energyPerKm * distance) / 1000; // kWh
    const usableBattery =
      vehicle.variant.batteryCapacity * (vehicle.batteryHealth / 100);
    const energyUsedPercent = (totalEnergy / usableBattery) * 100;
    const endSoC = Math.max(0, vehicle.currentSoC - energyUsedPercent);
    const remainingEnergy = (endSoC / 100) * usableBattery;
    const remainingRange = remainingEnergy / (energyPerKm / 1000);

    setPrediction({
      route,
      weather: {
        temperature: 28,
        humidity: 65,
        windSpeed: 12,
        windDirection: 270,
        precipitation: 0,
        condition: "clear",
      },
      traffic: { density: "moderate", averageSpeed: 45, stopStartFrequency: 2 },
      startSoC: vehicle.currentSoC,
      predictedEndSoC: Math.round(endSoC),
      predictedRange: Math.round(remainingRange),
      energyConsumption: totalEnergy,
      consumptionPerKm: energyPerKm,
      canComplete: endSoC >= 5,
      marginOfSafety: remainingRange,
      breakdown: {
        baseConsumption: energyPerKm * distance,
        elevationCost: distance * 8,
        temperatureCost: 0,
        speedCost: distance * 5,
        trafficCost: distance * 10,
        hvacCost: vehicle.hvacOn ? distance * 15 : 0,
        auxiliaryCost: distance * 2,
        regenRecovery: distance * 5 * vehicle.regenLevel.recoveryEfficiency,
        totalConsumption: totalEnergy * 1000,
      },
      elevationProfile: [],
      rangeAtPoints: [],
    });
  };

  const handleStartNavigation = () => {
    if (demoRoute) {
      routeStore.addToRecent(demoRoute);
      // In production, this would open native maps or in-app navigation
      alert(
        "Navigation would start here. In production, this opens Apple/Google Maps with the route."
      );
    }
  };

  return (
    <div className="min-h-screen bg-background-primary dark:bg-background-dark-primary pb-24">
      {/* Navigation Bar */}
      <AppHeader
        title="Plan Route"
        showBackButton
        onBack={() => router.push("/")}
      />

      <div className="px-4 pt-4 space-y-4">
        {/* Search Inputs */}
        <Card padding="sm">
          {/* Origin */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("Origin button clicked");
              setSearchType("origin");
              setShowSearch(true);
            }}
            className="w-full flex items-center gap-3 p-3 text-left cursor-pointer active:bg-ios-gray-6 hover:bg-ios-gray-6/50"
          >
            <div className="w-8 h-8 rounded-full bg-ios-green/10 flex items-center justify-center">
              <MapPin size={16} className="text-ios-green" />
            </div>
            <div className="flex-1">
              <div className="text-ios-footnote text-ios-gray-1">From</div>
              <div className="text-ios-body">
                {originLocation ? originLocation.name : "Choose starting point"}
              </div>
            </div>
            <ChevronRight size={18} className="text-ios-gray-3" />
          </button>

          <div className="h-px bg-ios-gray-5 dark:bg-gray-700 ml-14" />

          {/* Destination */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("Destination button clicked");
              setSearchType("destination");
              setShowSearch(true);
            }}
            className="w-full flex items-center gap-3 p-3 text-left cursor-pointer active:bg-ios-gray-6 hover:bg-ios-gray-6/50"
          >
            <div className="w-8 h-8 rounded-full bg-ios-red/10 flex items-center justify-center">
              <MapPin size={16} className="text-ios-red" />
            </div>
            <div className="flex-1">
              <div className="text-ios-footnote text-ios-gray-1">To</div>
              <div className="text-ios-body">
                {destinationLocation
                  ? destinationLocation.name
                  : "Choose destination"}
              </div>
            </div>
            <ChevronRight size={18} className="text-ios-gray-3" />
          </button>
        </Card>

        {/* Map Preview */}
        {demoRoute && (
          <div className="rounded-ios-md overflow-hidden">
            <RouteMap
              origin={demoRoute.origin}
              destination={demoRoute.destination}
              height={200}
            />
          </div>
        )}

        {/* Trip Prediction */}
        {prediction && (
          <>
            {/* Summary Card */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-ios-title3">{demoRoute?.name}</h3>
                  <p className="text-ios-subhead text-ios-gray-1">
                    {demoRoute?.totalDistance} km • ~
                    {demoRoute?.estimatedDuration} min
                  </p>
                </div>
                <div
                  className={`
                  px-3 py-1.5 rounded-full text-ios-subhead font-semibold
                  ${
                    prediction.canComplete
                      ? "bg-ios-green/10 text-ios-green"
                      : "bg-ios-red/10 text-ios-red"
                  }
                `}
                >
                  {prediction.canComplete ? "✓ Can Complete" : "⚠ Low Range"}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-ios-gray-6 dark:bg-background-dark-tertiary rounded-ios-sm p-3 text-center">
                  <Zap size={18} className="text-ios-blue mx-auto mb-1" />
                  <div className="text-ios-headline">
                    {prediction.predictedEndSoC}%
                  </div>
                  <div className="text-ios-caption2 text-ios-gray-1">
                    At Arrival
                  </div>
                </div>

                <div className="bg-ios-gray-6 dark:bg-background-dark-tertiary rounded-ios-sm p-3 text-center">
                  <TrendingUp
                    size={18}
                    className="text-ios-orange mx-auto mb-1"
                  />
                  <div className="text-ios-headline">
                    {Math.round(prediction.consumptionPerKm)}
                  </div>
                  <div className="text-ios-caption2 text-ios-gray-1">Wh/km</div>
                </div>

                <div className="bg-ios-gray-6 dark:bg-background-dark-tertiary rounded-ios-sm p-3 text-center">
                  <Navigation
                    size={18}
                    className="text-ios-green mx-auto mb-1"
                  />
                  <div className="text-ios-headline">
                    {prediction.predictedRange}
                  </div>
                  <div className="text-ios-caption2 text-ios-gray-1">
                    km left
                  </div>
                </div>
              </div>
            </Card>

            {/* Energy Breakdown */}
            <ListGroup header="Energy Breakdown" inset={false}>
              <ListItem
                title="Base consumption"
                trailing={`${Math.round(
                  prediction.breakdown.baseConsumption
                )} Wh`}
              />
              <ListItem
                title="Elevation impact"
                trailing={`+${Math.round(
                  prediction.breakdown.elevationCost
                )} Wh`}
              />
              <ListItem
                title="Traffic impact"
                trailing={`+${Math.round(prediction.breakdown.trafficCost)} Wh`}
              />
              {vehicle.hvacOn && (
                <ListItem
                  title="HVAC usage"
                  trailing={`+${Math.round(prediction.breakdown.hvacCost)} Wh`}
                />
              )}
              <ListItem
                title="Regen recovery"
                leading={<Zap size={18} className="text-ios-green" />}
                trailing={
                  <span className="text-ios-green">
                    -{Math.round(prediction.breakdown.regenRecovery)} Wh
                  </span>
                }
              />
            </ListGroup>

            {/* Warning if low range */}
            {!prediction.canComplete && (
              <div className="flex items-start gap-3 p-4 bg-ios-red/10 rounded-ios-md">
                <AlertTriangle
                  size={20}
                  className="text-ios-red flex-shrink-0 mt-0.5"
                />
                <div>
                  <h4 className="text-ios-headline text-ios-red">
                    Insufficient Range
                  </h4>
                  <p className="text-ios-subhead text-ios-gray-1 mt-1">
                    You may not have enough charge to complete this trip.
                    Consider charging before departure or finding a charging
                    station along the route.
                  </p>
                </div>
              </div>
            )}

            {/* Start Navigation Button */}
            <Button variant="primary" fullWidth onClick={handleStartNavigation}>
              <div className="flex items-center justify-center gap-2">
                <Navigation size={20} />
                <span>Start Navigation</span>
              </div>
            </Button>
          </>
        )}

        {/* Quick Destinations */}
        {!demoRoute && (
          <>
            {/* Recent Routes */}
            {routeStore.recentRoutes.length > 0 && (
              <ListGroup header="Recent Routes" inset={false}>
                {routeStore.recentRoutes.slice(0, 5).map((route) => (
                  <ListItem
                    key={route.id}
                    title={route.name}
                    subtitle={`${route.totalDistance} km`}
                    leading={
                      <div className="w-8 h-8 rounded-full bg-ios-orange/10 flex items-center justify-center">
                        <Clock size={16} className="text-ios-orange" />
                      </div>
                    }
                    showChevron
                    onClick={() => {
                      setDemoRoute(route);
                      routeStore.setRoute(route);
                      routeStore.setOrigin(route.origin);
                      routeStore.setDestination(route.destination);

                      // Recreate prediction
                      const distance = route.totalDistance;
                      const energyPerKm = vehicle.variant.baseConsumption;
                      const totalEnergy = (energyPerKm * distance) / 1000;
                      const usableBattery =
                        vehicle.variant.batteryCapacity *
                        (vehicle.batteryHealth / 100);
                      const energyUsedPercent =
                        (totalEnergy / usableBattery) * 100;
                      const endSoC = Math.max(
                        0,
                        vehicle.currentSoC - energyUsedPercent
                      );
                      const remainingEnergy = (endSoC / 100) * usableBattery;
                      const remainingRange =
                        remainingEnergy / (energyPerKm / 1000);

                      setPrediction({
                        route,
                        weather: {
                          temperature: 28,
                          humidity: 65,
                          windSpeed: 12,
                          windDirection: 270,
                          precipitation: 0,
                          condition: "clear",
                        },
                        traffic: {
                          density: "moderate",
                          averageSpeed: 45,
                          stopStartFrequency: 2,
                        },
                        startSoC: vehicle.currentSoC,
                        predictedEndSoC: Math.round(endSoC),
                        predictedRange: Math.round(remainingRange),
                        energyConsumption: totalEnergy,
                        consumptionPerKm: energyPerKm,
                        canComplete: endSoC >= 5,
                        marginOfSafety: remainingRange,
                        breakdown: {
                          baseConsumption: energyPerKm * distance,
                          elevationCost: distance * 8,
                          temperatureCost: 0,
                          speedCost: distance * 5,
                          trafficCost: distance * 10,
                          hvacCost: vehicle.hvacOn ? distance * 15 : 0,
                          auxiliaryCost: distance * 2,
                          regenRecovery:
                            distance *
                            5 *
                            vehicle.regenLevel.recoveryEfficiency,
                          totalConsumption: totalEnergy * 1000,
                        },
                        elevationProfile: [],
                        rangeAtPoints: [],
                      });
                    }}
                  />
                ))}
              </ListGroup>
            )}

            <ListGroup header="Suggested Destinations" inset={false}>
              {SAMPLE_LOCATIONS.map((location) => (
                <ListItem
                  key={location.name}
                  title={location.name}
                  subtitle={location.address}
                  leading={
                    <div className="w-8 h-8 rounded-full bg-ios-blue/10 flex items-center justify-center">
                      <MapPin size={16} className="text-ios-blue" />
                    </div>
                  }
                  showChevron
                  onClick={() => handleLocationSelect(location, "destination")}
                />
              ))}
            </ListGroup>
          </>
        )}
      </div>

      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 bg-background-primary dark:bg-background-dark-primary z-[1000]">
          <NavigationBar
            title={
              searchType === "origin" ? "Choose Start" : "Choose Destination"
            }
            showBackButton
            onBack={() => {
              setShowSearch(false);
              setSearchQuery("");
            }}
          />

          <div className="px-4 pt-4 space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ios-gray-1 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search location..."
                value={searchQuery}
                onChange={(e) => {
                  console.log("Search input changed:", e.target.value);
                  setSearchQuery(e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-full pl-10 pr-4 py-3 bg-ios-gray-6 dark:bg-background-dark-tertiary rounded-ios-md
                  text-ios-body placeholder:text-ios-gray-1 outline-none focus:ring-2 focus:ring-ios-blue"
                autoFocus
              />
            </div>

            {/* Results */}
            <ListGroup
              header={searchQuery ? "Search Results" : "Locations"}
              inset={false}
            >
              {SAMPLE_LOCATIONS.filter(
                (loc) =>
                  searchQuery === "" ||
                  loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  loc.address.toLowerCase().includes(searchQuery.toLowerCase())
              ).map((location) => (
                <ListItem
                  key={location.name}
                  title={location.name}
                  subtitle={location.address}
                  leading={<MapPin size={18} className="text-ios-blue" />}
                  onClick={() => {
                    console.log(
                      "Location selected:",
                      location.name,
                      "Type:",
                      searchType
                    );
                    handleLocationSelect(location, searchType);
                  }}
                />
              ))}
            </ListGroup>
          </div>
        </div>
      )}

      {/* Tab Bar */}
      <TabBar tabs={tabs} />
    </div>
  );
}
