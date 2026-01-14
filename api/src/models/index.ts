/**
 * Cosmos DB Data Models for Nexon EV Range Prediction
 *
 * Containers:
 * 1. users - User preferences and vehicle config (partition key: /userId)
 * 2. trips - Individual trip records (partition key: /userId)
 * 3. crowdSegments - Anonymized crowd-sourced data (partition key: /geohash)
 */

// ============ USER MODELS ============

export interface UserProfile {
  id: string;
  userId: string; // Partition key
  email?: string;
  displayName?: string;
  vehicleConfig: VehicleConfig;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
  _etag?: string;
}

export interface VehicleConfig {
  variantId: "nexon_ev_mr" | "nexon_ev_lr";
  batteryHealth: number;
  manufacturingYear: number;
  odometer: number;
  defaultRegenLevel: 0 | 1 | 2 | 3;
  defaultTirePressure: number;
  defaultPayload: number;
}

export interface UserPreferences {
  units: "metric" | "imperial";
  temperatureUnit: "celsius" | "fahrenheit";
  shareAnonymousData: boolean;
  offlineMapsEnabled: boolean;
  preferredRegion: string; // e.g., 'maharashtra'
  notificationsEnabled: boolean;
}

// ============ TRIP MODELS ============

export interface Trip {
  id: string;
  tripId: string;
  userId: string; // Partition key
  startTime: string;
  endTime: string;
  distance: number; // km
  energyUsed: number; // kWh
  startSoC: number;
  endSoC: number;
  route: TripRoute;
  weather: TripWeather;
  vehicleState: TripVehicleState;
  consumption: ConsumptionMetrics;
  segments: TripSegment[];
  createdAt: string;
  synced: boolean;
}

export interface TripRoute {
  origin: Coordinate;
  destination: Coordinate;
  waypoints: Coordinate[];
  totalElevationGain: number; // meters
  totalElevationLoss: number; // meters
  polyline?: string; // Encoded polyline
}

export interface Coordinate {
  lat: number;
  lng: number;
  elevation?: number;
}

export interface TripWeather {
  avgTemperature: number;
  avgHumidity: number;
  avgWindSpeed: number;
  windDirection: number;
  conditions: string;
}

export interface TripVehicleState {
  variantId: string;
  regenLevel: number;
  hvacOn: boolean;
  hvacMode: "off" | "cooling" | "heating";
  hvacTemperature: number;
  payload: number;
  tirePressure: number;
  batteryHealth: number;
}

export interface ConsumptionMetrics {
  totalWhPerKm: number;
  hvacConsumption: number;
  drivetrainConsumption: number;
  regenRecovered: number;
  auxiliaryConsumption: number;
}

export interface TripSegment {
  startIndex: number;
  endIndex: number;
  geohash: string; // 6-char for anonymization
  distance: number;
  elevationChange: number;
  avgSpeed: number;
  whPerKm: number;
  roadType: "highway" | "city" | "rural";
  trafficLevel: "free" | "light" | "moderate" | "heavy";
}

// ============ CROWD-SOURCED MODELS ============

/**
 * Anonymized segment data aggregated from multiple trips
 * Uses 6-character geohash (±0.61 km precision) for privacy
 */
export interface CrowdSegment {
  id: string;
  geohash: string; // 6-char precision, partition key
  segmentHash: string; // Hash of from->to coordinates
  fromGeohash: string;
  toGeohash: string;
  distance: number;
  elevationChange: number;
  roadType: "highway" | "city" | "rural";

  // Aggregated consumption data
  aggregatedData: AggregatedConsumption;

  // Traffic patterns by day/hour
  trafficPatterns: TrafficPattern[];

  sampleCount: number;
  lastUpdated: string;
  confidence: number; // 0-1 based on sample count and variance
  _etag?: string;
}

export interface AggregatedConsumption {
  avgWhPerKm: number;
  minWhPerKm: number;
  maxWhPerKm: number;
  stdDeviation: number;

  // By variant
  byVariant: {
    [variantId: string]: {
      avgWhPerKm: number;
      sampleCount: number;
    };
  };

  // By conditions
  byTemperatureRange: {
    cold: { avg: number; count: number }; // < 15°C
    moderate: { avg: number; count: number }; // 15-30°C
    hot: { avg: number; count: number }; // > 30°C
  };

  // By regen level
  byRegenLevel: {
    [level: number]: {
      avgWhPerKm: number;
      avgRecovery: number;
      sampleCount: number;
    };
  };
}

export interface TrafficPattern {
  dayOfWeek: number; // 0-6, Sunday = 0
  hourOfDay: number; // 0-23
  avgTrafficLevel: number; // 0-3 (free, light, moderate, heavy)
  avgSpeedKmh: number;
  sampleCount: number;
}

// ============ API REQUEST/RESPONSE TYPES ============

export interface SyncTripsRequest {
  userId: string;
  trips: Trip[];
  lastSyncTimestamp?: string;
}

export interface SyncTripsResponse {
  syncedCount: number;
  newSegmentsCreated: number;
  crowdUpdatesApplied: number;
  syncTimestamp: string;
}

export interface GetCrowdDataRequest {
  segmentHashes: string[];
}

export interface GetCrowdDataResponse {
  segments: CrowdSegment[];
  notFound: string[];
}

export interface PredictionRequest {
  userId?: string;
  origin: Coordinate;
  destination: Coordinate;
  waypoints?: Coordinate[];
  vehicleState: TripVehicleState;
  departureTime: string;
}

export interface PredictionResponse {
  estimatedEnergyWh: number;
  estimatedRangeKm: number;
  confidence: number;
  breakdown: {
    baseConsumption: number;
    elevationImpact: number;
    weatherImpact: number;
    trafficImpact: number;
    hvacConsumption: number;
    regenRecovery: number;
  };
  crowdDataAvailable: boolean;
  segments: SegmentPrediction[];
}

export interface SegmentPrediction {
  geohash: string;
  distance: number;
  estimatedWhPerKm: number;
  confidence: number;
  crowdDataUsed: boolean;
  trafficLevel: string;
}

// ============ UTILITY FUNCTIONS ============

/**
 * Calculate geohash from coordinates
 * 6-char precision = ~1.2km x 0.6km area
 */
export function calculateGeohash(
  lat: number,
  lng: number,
  precision: number = 6
): string {
  const base32 = "0123456789bcdefghjkmnpqrstuvwxyz";
  let minLat = -90,
    maxLat = 90;
  let minLng = -180,
    maxLng = 180;
  let hash = "";
  let bit = 0;
  let ch = 0;
  let isLng = true;

  while (hash.length < precision) {
    if (isLng) {
      const mid = (minLng + maxLng) / 2;
      if (lng >= mid) {
        ch = (ch << 1) | 1;
        minLng = mid;
      } else {
        ch = ch << 1;
        maxLng = mid;
      }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat >= mid) {
        ch = (ch << 1) | 1;
        minLat = mid;
      } else {
        ch = ch << 1;
        maxLat = mid;
      }
    }
    isLng = !isLng;
    bit++;
    if (bit === 5) {
      hash += base32[ch];
      ch = 0;
      bit = 0;
    }
  }
  return hash;
}

/**
 * Create segment hash for from->to pair
 */
export function createSegmentHash(
  fromGeohash: string,
  toGeohash: string
): string {
  const combined = `${fromGeohash}-${toGeohash}`;
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Calculate confidence score based on sample size and variance
 */
export function calculateConfidence(
  sampleCount: number,
  stdDeviation: number
): number {
  // Base confidence from sample count (asymptotic approach to 1)
  const sampleConfidence = 1 - Math.exp(-sampleCount / 50);

  // Reduce confidence if high variance (stdDev > 50 Wh/km is high)
  const varianceMultiplier = Math.max(0.3, 1 - stdDeviation / 100);

  return Math.round(sampleConfidence * varianceMultiplier * 100) / 100;
}
