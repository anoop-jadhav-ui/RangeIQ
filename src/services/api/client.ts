/**
 * API Client for Nexon EV Backend
 * Connects to Azure Functions API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error: data.error || "Request failed",
        status: response.status,
      };
    }

    return {
      data,
      status: response.status,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Network error",
      status: 0,
    };
  }
}

// ============ USER API ============

export interface UserProfile {
  id: string;
  userId: string;
  vehicleConfig: VehicleConfig;
  preferences: UserPreferences;
}

export interface VehicleConfig {
  variantId: string;
  batteryHealth: number;
  manufacturingYear: number;
  odometer: number;
  defaultRegenLevel: number;
  defaultTirePressure: number;
  defaultPayload: number;
}

export interface UserPreferences {
  units: "metric" | "imperial";
  temperatureUnit: "celsius" | "fahrenheit";
  shareAnonymousData: boolean;
  offlineMapsEnabled: boolean;
  preferredRegion: string;
  notificationsEnabled: boolean;
}

export const userApi = {
  async getProfile(userId: string): Promise<ApiResponse<UserProfile>> {
    return apiRequest(`/user/${userId}`);
  },

  async updateProfile(
    userId: string,
    updates: Partial<UserProfile>
  ): Promise<ApiResponse<UserProfile>> {
    return apiRequest(`/user/${userId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  async updateVehicleConfig(
    userId: string,
    config: Partial<VehicleConfig>
  ): Promise<ApiResponse<VehicleConfig>> {
    return apiRequest(`/user/${userId}/vehicle`, {
      method: "PUT",
      body: JSON.stringify(config),
    });
  },

  async updatePreferences(
    userId: string,
    prefs: Partial<UserPreferences>
  ): Promise<ApiResponse<UserPreferences>> {
    return apiRequest(`/user/${userId}/preferences`, {
      method: "PUT",
      body: JSON.stringify(prefs),
    });
  },
};

// ============ TRIPS API ============

export interface Trip {
  id: string;
  tripId: string;
  userId: string;
  startTime: string;
  endTime: string;
  distance: number;
  energyUsed: number;
  startSoC: number;
  endSoC: number;
  consumption: {
    totalWhPerKm: number;
  };
}

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

export const tripsApi = {
  async getTrips(
    userId: string,
    limit = 50
  ): Promise<ApiResponse<{ trips: Trip[] }>> {
    return apiRequest(`/trips?userId=${userId}&limit=${limit}`);
  },

  async syncTrips(
    request: SyncTripsRequest
  ): Promise<ApiResponse<SyncTripsResponse>> {
    return apiRequest("/trips/sync", {
      method: "POST",
      body: JSON.stringify(request),
    });
  },
};

// ============ CROWD DATA API ============

export interface CrowdSegment {
  id: string;
  geohash: string;
  distance: number;
  elevationChange: number;
  aggregatedData: {
    avgWhPerKm: number;
    minWhPerKm: number;
    maxWhPerKm: number;
  };
  sampleCount: number;
  confidence: number;
}

export const crowdApi = {
  async getSegments(
    geohashes: string[]
  ): Promise<ApiResponse<{ segments: CrowdSegment[] }>> {
    return apiRequest("/crowd/segments", {
      method: "POST",
      body: JSON.stringify({ segmentHashes: geohashes }),
    });
  },

  async getRouteData(coordinates: { lat: number; lng: number }[]): Promise<
    ApiResponse<{
      segments: CrowdSegment[];
      statistics: {
        totalSegments: number;
        coverageRatio: number;
        averageConfidence: number;
      };
    }>
  > {
    return apiRequest("/crowd/route", {
      method: "POST",
      body: JSON.stringify({ coordinates }),
    });
  },
};

// ============ PREDICTION API ============

export interface PredictionRequest {
  userId?: string;
  origin: { lat: number; lng: number; elevation?: number };
  destination: { lat: number; lng: number; elevation?: number };
  waypoints?: { lat: number; lng: number }[];
  vehicleState: {
    variantId: string;
    regenLevel: number;
    hvacOn: boolean;
    hvacMode: "off" | "cooling" | "heating";
    hvacTemperature: number;
    payload: number;
    tirePressure: number;
    batteryHealth: number;
  };
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
}

export const predictionApi = {
  async predict(
    request: PredictionRequest
  ): Promise<ApiResponse<PredictionResponse>> {
    return apiRequest("/predict", {
      method: "POST",
      body: JSON.stringify(request),
    });
  },
};

// ============ OFFLINE SYNC ============

const PENDING_TRIPS_KEY = "nexon-ev-pending-trips";

export const offlineSync = {
  // Store trip for later sync
  storePendingTrip(trip: Trip): void {
    const pending = this.getPendingTrips();
    pending.push(trip);
    localStorage.setItem(PENDING_TRIPS_KEY, JSON.stringify(pending));
  },

  // Get all pending trips
  getPendingTrips(): Trip[] {
    try {
      const stored = localStorage.getItem(PENDING_TRIPS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  // Clear pending trips after sync
  clearPendingTrips(): void {
    localStorage.removeItem(PENDING_TRIPS_KEY);
  },

  // Sync all pending trips
  async syncPending(userId: string): Promise<SyncTripsResponse | null> {
    const pending = this.getPendingTrips();
    if (pending.length === 0) return null;

    const result = await tripsApi.syncTrips({
      userId,
      trips: pending,
    });

    if (result.data) {
      this.clearPendingTrips();
      return result.data;
    }

    return null;
  },

  // Check if online
  isOnline(): boolean {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  },
};

export default {
  user: userApi,
  trips: tripsApi,
  crowd: crowdApi,
  prediction: predictionApi,
  offline: offlineSync,
};
