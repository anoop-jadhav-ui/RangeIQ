// Route and Trip Types for Range Prediction

export interface Coordinate {
  lat: number;
  lng: number;
  elevation?: number; // meters above sea level
}

export interface RouteSegment {
  start: Coordinate;
  end: Coordinate;
  distance: number; // meters
  elevationGain: number; // meters
  elevationLoss: number; // meters
  averageGradient: number; // percentage
  roadType: RoadType;
  curvature: number; // 0-1, 0 = straight, 1 = very curvy
  speedLimit?: number; // km/h
}

export type RoadType = "highway" | "urban" | "rural" | "mountain" | "unknown";

export interface Route {
  id: string;
  name: string;
  origin: Coordinate;
  destination: Coordinate;
  waypoints: Coordinate[];
  segments: RouteSegment[];
  totalDistance: number; // km
  totalElevationGain: number; // meters
  totalElevationLoss: number; // meters
  estimatedDuration: number; // minutes
  polyline: Coordinate[];
}

export interface WeatherConditions {
  temperature: number; // Celsius
  humidity: number; // percentage
  windSpeed: number; // km/h
  windDirection: number; // degrees (0 = North, 90 = East)
  precipitation: number; // mm
  condition: WeatherType;
}

export type WeatherType =
  | "clear"
  | "cloudy"
  | "rain"
  | "heavy_rain"
  | "fog"
  | "hot"
  | "cold";

export interface TrafficConditions {
  density: TrafficDensity;
  averageSpeed: number; // km/h
  stopStartFrequency: number; // stops per km
}

export type TrafficDensity =
  | "free_flow"
  | "light"
  | "moderate"
  | "heavy"
  | "congested";

export interface TripPrediction {
  route: Route;
  weather: WeatherConditions;
  traffic: TrafficConditions;
  startSoC: number;
  predictedEndSoC: number;
  predictedRange: number; // km remaining at destination
  energyConsumption: number; // kWh for the trip
  consumptionPerKm: number; // Wh/km average
  canComplete: boolean;
  marginOfSafety: number; // km of buffer range
  breakdown: ConsumptionBreakdown;
  elevationProfile: ElevationPoint[];
  rangeAtPoints: RangePoint[];
}

export interface ConsumptionBreakdown {
  baseConsumption: number; // Wh
  elevationCost: number; // Wh (positive = uphill cost)
  temperatureCost: number; // Wh (HVAC + battery efficiency)
  speedCost: number; // Wh (aerodynamic drag)
  trafficCost: number; // Wh (stop-start losses)
  hvacCost: number; // Wh
  auxiliaryCost: number; // Wh (lights, etc.)
  regenRecovery: number; // Wh (negative = energy recovered)
  totalConsumption: number; // Wh
}

export interface ElevationPoint {
  distance: number; // km from start
  elevation: number; // meters
  gradient: number; // percentage
}

export interface RangePoint {
  distance: number; // km from start
  predictedSoC: number; // percentage
  predictedRange: number; // km remaining
}

export interface Trip {
  id: string;
  startTime: Date;
  endTime?: Date;
  route: Route;
  prediction?: TripPrediction;
  actual?: ActualTripData;
}

export interface ActualTripData {
  startSoC: number;
  endSoC: number;
  energyConsumed: number; // kWh
  actualConsumptionPerKm: number; // Wh/km
  averageSpeed: number; // km/h
  maxSpeed: number; // km/h
  distance: number; // km
  duration: number; // minutes
  regenRecovered: number; // kWh
}

// Trip history for learning
export interface TripHistory {
  trips: Trip[];
  averageConsumption: number; // Wh/km
  averageAccuracy: number; // percentage (how accurate predictions were)
  totalDistance: number; // km
  totalEnergy: number; // kWh
}
