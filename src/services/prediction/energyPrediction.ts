/**
 * Energy Prediction Service for Tata Nexon EV
 *
 * This service calculates predicted energy consumption based on:
 * - Route elevation profile
 * - Weather conditions (temperature, wind)
 * - Traffic conditions
 * - Vehicle settings (regen, HVAC)
 * - Driving style
 */

import { VehicleState, getAvailableEnergy } from "@/types/vehicle";
import {
  Route,
  RouteSegment,
  WeatherConditions,
  TrafficConditions,
  TripPrediction,
  ConsumptionBreakdown,
  ElevationPoint,
  RangePoint,
} from "@/types/route";

// Constants for energy calculations
const GRAVITY = 9.81; // m/s²
const AIR_DENSITY = 1.225; // kg/m³ at sea level
const NEXON_DRAG_COEFFICIENT = 0.35;
const NEXON_FRONTAL_AREA = 2.4; // m²
const NEXON_MASS_BASE = 1560; // kg (LR variant)
const ROLLING_RESISTANCE_COEFFICIENT = 0.01;

// Temperature coefficients (battery efficiency drops in extreme temps)
const TEMP_EFFICIENCY_MAP: Record<string, number> = {
  very_cold: 0.7, // Below 0°C
  cold: 0.85, // 0-15°C
  optimal: 1.0, // 15-30°C
  hot: 0.92, // 30-40°C
  very_hot: 0.85, // Above 40°C
};

// HVAC power consumption (kW)
const HVAC_POWER = {
  cooling: 2.5,
  heating: 4.0,
  off: 0,
};

// Traffic speed multipliers
const TRAFFIC_CONSUMPTION_FACTOR: Record<string, number> = {
  free_flow: 1.0,
  light: 1.05,
  moderate: 1.12,
  heavy: 1.25,
  congested: 1.4,
};

/**
 * Calculate temperature efficiency factor
 */
function getTemperatureEfficiency(tempC: number): number {
  if (tempC < 0) return TEMP_EFFICIENCY_MAP.very_cold;
  if (tempC < 15) return TEMP_EFFICIENCY_MAP.cold;
  if (tempC <= 30) return TEMP_EFFICIENCY_MAP.optimal;
  if (tempC <= 40) return TEMP_EFFICIENCY_MAP.hot;
  return TEMP_EFFICIENCY_MAP.very_hot;
}

/**
 * Calculate aerodynamic drag power at given speed
 */
function calculateAeroDragPower(
  speedKmh: number,
  headwindKmh: number = 0
): number {
  const effectiveSpeedMs = (speedKmh + headwindKmh) / 3.6;
  const dragForce =
    0.5 *
    AIR_DENSITY *
    NEXON_DRAG_COEFFICIENT *
    NEXON_FRONTAL_AREA *
    Math.pow(effectiveSpeedMs, 2);
  const speedMs = speedKmh / 3.6;
  return (dragForce * speedMs) / 1000; // kW
}

/**
 * Calculate elevation energy cost/gain
 * Positive = energy needed for uphill
 * Negative = energy recoverable downhill (limited by regen efficiency)
 */
function calculateElevationEnergy(
  elevationGainM: number,
  elevationLossM: number,
  vehicleMassKg: number,
  regenEfficiency: number
): { uphillEnergy: number; downhillRecovery: number } {
  // Energy needed to climb (Wh)
  const uphillEnergy = (vehicleMassKg * GRAVITY * elevationGainM) / 3600;

  // Energy recoverable going downhill (limited by regen efficiency)
  const potentialDownhillEnergy =
    (vehicleMassKg * GRAVITY * elevationLossM) / 3600;
  const downhillRecovery = potentialDownhillEnergy * regenEfficiency;

  return { uphillEnergy, downhillRecovery };
}

/**
 * Calculate speed-based consumption factor
 * Optimal efficiency around 50-70 km/h
 */
function getSpeedConsumptionFactor(avgSpeedKmh: number): number {
  if (avgSpeedKmh <= 30) return 1.15; // Stop-start inefficiency
  if (avgSpeedKmh <= 50) return 1.0;
  if (avgSpeedKmh <= 70) return 1.0;
  if (avgSpeedKmh <= 90) return 1.12;
  if (avgSpeedKmh <= 110) return 1.28;
  if (avgSpeedKmh <= 130) return 1.45;
  return 1.6; // Very high speeds
}

/**
 * Main prediction function
 */
export function predictTripEnergy(
  route: Route,
  vehicle: VehicleState,
  weather: WeatherConditions | null,
  traffic: TrafficConditions | null
): TripPrediction {
  const distanceKm = route.totalDistance;
  const baseConsumptionWhKm = vehicle.variant.baseConsumption;

  // Get vehicle mass including payload
  const totalMassKg = NEXON_MASS_BASE + vehicle.payload;

  // Calculate duration and average speed
  const durationHours = route.estimatedDuration / 60;
  const avgSpeedKmh = traffic?.averageSpeed || distanceKm / durationHours;

  // 1. Base consumption
  const baseConsumptionWh = baseConsumptionWhKm * distanceKm;

  // 2. Elevation cost
  const { uphillEnergy, downhillRecovery } = calculateElevationEnergy(
    route.totalElevationGain,
    route.totalElevationLoss,
    totalMassKg,
    vehicle.regenLevel.recoveryEfficiency
  );
  const elevationCostWh = uphillEnergy * 1000; // Convert to Wh
  const regenRecoveryWh = downhillRecovery * 1000;

  // 3. Temperature impact
  const ambientTemp = weather?.temperature ?? 25;
  const tempEfficiency = getTemperatureEfficiency(ambientTemp);
  const tempCostWh = baseConsumptionWh * (1 - tempEfficiency);

  // 4. Speed impact
  const speedFactor = getSpeedConsumptionFactor(avgSpeedKmh);
  const speedCostWh = baseConsumptionWh * (speedFactor - 1);

  // 5. Traffic impact
  const trafficFactor = traffic
    ? TRAFFIC_CONSUMPTION_FACTOR[traffic.density]
    : 1.0;
  const trafficCostWh = baseConsumptionWh * (trafficFactor - 1);

  // 6. HVAC cost
  const hvacPowerKw = vehicle.hvacOn ? HVAC_POWER[vehicle.hvacMode] : 0;
  const hvacCostWh = hvacPowerKw * durationHours * 1000;

  // 7. Auxiliary systems (lights, infotainment, etc.)
  const auxiliaryCostWh = 0.15 * durationHours * 1000; // ~150W average

  // 8. Wind resistance adjustment
  const headwind = weather ? calculateHeadwind(avgSpeedKmh, weather) : 0;
  const windAdjustmentWh =
    headwind > 10 ? baseConsumptionWh * 0.08 * (headwind / 30) : 0;

  // Calculate total consumption
  const totalConsumptionWh =
    baseConsumptionWh +
    elevationCostWh +
    tempCostWh +
    speedCostWh +
    trafficCostWh +
    hvacCostWh +
    auxiliaryCostWh +
    windAdjustmentWh -
    regenRecoveryWh;

  const totalConsumptionKwh = totalConsumptionWh / 1000;
  const consumptionPerKm = totalConsumptionWh / distanceKm;

  // Calculate energy available
  const availableEnergyKwh = getAvailableEnergy(vehicle);

  // Calculate end state
  const energyUsedKwh = totalConsumptionKwh;
  const usableBatteryKwh =
    vehicle.variant.batteryCapacity * (vehicle.batteryHealth / 100);
  const endSoCPercent = Math.max(
    0,
    vehicle.currentSoC - (energyUsedKwh / usableBatteryKwh) * 100
  );

  // Calculate remaining range at destination
  const remainingEnergyKwh = availableEnergyKwh - energyUsedKwh;
  const remainingRange = Math.max(
    0,
    remainingEnergyKwh / (consumptionPerKm / 1000)
  );

  // Can complete trip?
  const canComplete = endSoCPercent >= 5; // 5% safety buffer
  const marginOfSafety = remainingRange;

  // Build breakdown
  const breakdown: ConsumptionBreakdown = {
    baseConsumption: baseConsumptionWh,
    elevationCost: elevationCostWh,
    temperatureCost: tempCostWh,
    speedCost: speedCostWh,
    trafficCost: trafficCostWh,
    hvacCost: hvacCostWh,
    auxiliaryCost: auxiliaryCostWh,
    regenRecovery: regenRecoveryWh,
    totalConsumption: totalConsumptionWh,
  };

  // Generate elevation profile points
  const elevationProfile = generateElevationProfile(route);

  // Generate range points along route
  const rangeAtPoints = generateRangePoints(
    route,
    vehicle.currentSoC,
    consumptionPerKm,
    usableBatteryKwh
  );

  return {
    route,
    weather: weather!,
    traffic: traffic!,
    startSoC: vehicle.currentSoC,
    predictedEndSoC: Math.round(endSoCPercent),
    predictedRange: Math.round(remainingRange),
    energyConsumption: totalConsumptionKwh,
    consumptionPerKm,
    canComplete,
    marginOfSafety,
    breakdown,
    elevationProfile,
    rangeAtPoints,
  };
}

/**
 * Calculate effective headwind based on wind direction and travel direction
 */
function calculateHeadwind(
  travelSpeedKmh: number,
  weather: WeatherConditions
): number {
  // Simplified: assume 50% headwind on average
  return weather.windSpeed * 0.5;
}

/**
 * Generate elevation profile points from route
 */
function generateElevationProfile(route: Route): ElevationPoint[] {
  const points: ElevationPoint[] = [];
  let cumulativeDistance = 0;

  // Add starting point
  points.push({
    distance: 0,
    elevation: route.origin.elevation ?? 0,
    gradient: 0,
  });

  // Add points for each segment
  route.segments.forEach((segment) => {
    cumulativeDistance += segment.distance / 1000; // Convert to km
    points.push({
      distance: cumulativeDistance,
      elevation: segment.end.elevation ?? 0,
      gradient: segment.averageGradient,
    });
  });

  return points;
}

/**
 * Generate range prediction points along route
 */
function generateRangePoints(
  route: Route,
  startSoC: number,
  consumptionPerKm: number,
  batteryCapacityKwh: number
): RangePoint[] {
  const points: RangePoint[] = [];
  const totalDistance = route.totalDistance;
  const numPoints = Math.min(20, Math.ceil(totalDistance));

  for (let i = 0; i <= numPoints; i++) {
    const distance = (i / numPoints) * totalDistance;
    const energyUsedKwh = (distance * consumptionPerKm) / 1000;
    const socUsed = (energyUsedKwh / batteryCapacityKwh) * 100;
    const currentSoC = Math.max(0, startSoC - socUsed);
    const remainingEnergy = (currentSoC / 100) * batteryCapacityKwh;
    const remainingRange = remainingEnergy / (consumptionPerKm / 1000);

    points.push({
      distance,
      predictedSoC: Math.round(currentSoC),
      predictedRange: Math.round(remainingRange),
    });
  }

  return points;
}

/**
 * Get a simple range estimate without route data
 */
export function getSimpleRangeEstimate(vehicle: VehicleState): number {
  const availableEnergy = getAvailableEnergy(vehicle);
  let consumption = vehicle.variant.baseConsumption / 1000; // kWh/km

  // Apply HVAC factor
  if (vehicle.hvacOn) {
    consumption *= vehicle.hvacMode === "heating" ? 1.25 : 1.15;
  }

  return Math.round(availableEnergy / consumption);
}
