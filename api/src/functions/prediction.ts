import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { getRouteSegments, getOrCreateUser } from "../services/cosmosDb.js";
import {
  PredictionRequest,
  PredictionResponse,
  CrowdSegment,
  calculateGeohash,
  Coordinate,
} from "../models/index.js";

// Nexon EV variant specifications
const VARIANTS = {
  nexon_ev_mr: {
    batteryCapacity: 30.2,
    baseConsumption: 130, // Wh/km
    motorEfficiency: 0.92,
  },
  nexon_ev_lr: {
    batteryCapacity: 40.5,
    baseConsumption: 140, // Wh/km
    motorEfficiency: 0.91,
  },
};

// Regen efficiency by level
const REGEN_EFFICIENCY = {
  0: 0,
  1: 0.1,
  2: 0.18,
  3: 0.25,
};

/**
 * POST /api/predict
 * Get energy consumption prediction for a route
 */
app.http("predictConsumption", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "predict",
  handler: async (
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit> => {
    context.log("Prediction request received");

    try {
      const body = (await request.json()) as PredictionRequest;

      if (!body.origin || !body.destination || !body.vehicleState) {
        return {
          status: 400,
          jsonBody: { error: "Missing origin, destination, or vehicleState" },
        };
      }

      // Build route coordinates
      const coordinates: Coordinate[] = [
        body.origin,
        ...(body.waypoints || []),
        body.destination,
      ];

      // Get crowd data for route
      const crowdSegments = await getRouteSegments(coordinates);
      const crowdDataMap = new Map(crowdSegments.map((s) => [s.geohash, s]));

      // Get variant specs
      const variant =
        VARIANTS[body.vehicleState.variantId as keyof typeof VARIANTS] ||
        VARIANTS.nexon_ev_mr;
      const regenEfficiency =
        REGEN_EFFICIENCY[
          body.vehicleState.regenLevel as keyof typeof REGEN_EFFICIENCY
        ] || 0.18;

      // Calculate prediction for each segment
      let totalEnergyWh = 0;
      let elevationImpact = 0;
      let weatherImpact = 0;
      let trafficImpact = 0;
      let hvacConsumption = 0;
      let regenRecovery = 0;
      let baseConsumption = 0;

      const segmentPredictions = [];
      let crowdDataUsedCount = 0;

      for (let i = 0; i < coordinates.length - 1; i++) {
        const from = coordinates[i];
        const to = coordinates[i + 1];
        const geohash = calculateGeohash(from.lat, from.lng, 6);
        const crowdData = crowdDataMap.get(geohash);

        // Calculate segment distance (Haversine)
        const distance = calculateDistance(from, to);

        let segmentWhPerKm: number;
        let confidence: number;
        let usedCrowd = false;

        if (crowdData && crowdData.confidence > 0.5) {
          // Use crowd data with variant-specific adjustment
          const variantData =
            crowdData.aggregatedData.byVariant[body.vehicleState.variantId];
          if (variantData) {
            segmentWhPerKm = variantData.avgWhPerKm;
          } else {
            segmentWhPerKm = crowdData.aggregatedData.avgWhPerKm;
          }
          confidence = crowdData.confidence;
          usedCrowd = true;
          crowdDataUsedCount++;
        } else {
          // Use model-based prediction
          segmentWhPerKm = calculateModelPrediction(
            from,
            to,
            body.vehicleState,
            variant
          );
          confidence = 0.3; // Lower confidence for model-only
        }

        // Apply HVAC overhead
        const hvacOverhead = calculateHvacConsumption(body.vehicleState);

        // Calculate segment energy
        const segmentEnergy = (segmentWhPerKm + hvacOverhead) * distance;
        totalEnergyWh += segmentEnergy;

        // Track for breakdown
        baseConsumption += variant.baseConsumption * distance;
        hvacConsumption += hvacOverhead * distance;

        // Estimate elevation impact
        if (from.elevation !== undefined && to.elevation !== undefined) {
          const elevChange = to.elevation - from.elevation;
          const elevEnergy = calculateElevationEnergy(
            elevChange,
            distance,
            regenEfficiency
          );
          elevationImpact += elevEnergy;

          if (elevEnergy < 0) {
            regenRecovery += Math.abs(elevEnergy);
          }
        }

        // Traffic impact estimation (if crowd data available)
        if (crowdData) {
          const trafficEstimate = estimateTrafficImpact(
            crowdData,
            body.departureTime
          );
          trafficImpact += trafficEstimate * distance;
        }

        segmentPredictions.push({
          geohash,
          distance: Math.round(distance * 100) / 100,
          estimatedWhPerKm: Math.round(segmentWhPerKm),
          confidence: Math.round(confidence * 100) / 100,
          crowdDataUsed: usedCrowd,
          trafficLevel:
            (crowdData?.trafficPatterns?.[0]?.avgTrafficLevel ?? 0) > 2
              ? "heavy"
              : "light",
        });
      }

      // Calculate estimated range
      const totalDistance = segmentPredictions.reduce(
        (sum, s) => sum + s.distance,
        0
      );
      const avgWhPerKm = totalEnergyWh / totalDistance;
      const estimatedRangeKm = (variant.batteryCapacity * 1000) / avgWhPerKm;

      // Calculate overall confidence
      const overallConfidence =
        crowdDataUsedCount > 0
          ? (crowdDataUsedCount / segmentPredictions.length) * 0.7 + 0.3
          : 0.4;

      const response: PredictionResponse = {
        estimatedEnergyWh: Math.round(totalEnergyWh),
        estimatedRangeKm: Math.round(estimatedRangeKm),
        confidence: Math.round(overallConfidence * 100) / 100,
        breakdown: {
          baseConsumption: Math.round(baseConsumption),
          elevationImpact: Math.round(elevationImpact),
          weatherImpact: Math.round(weatherImpact),
          trafficImpact: Math.round(trafficImpact),
          hvacConsumption: Math.round(hvacConsumption),
          regenRecovery: Math.round(regenRecovery),
        },
        crowdDataAvailable: crowdDataUsedCount > 0,
        segments: segmentPredictions,
      };

      return {
        status: 200,
        jsonBody: response,
      };
    } catch (error) {
      context.error("Error calculating prediction:", error);
      return {
        status: 500,
        jsonBody: { error: "Internal server error" },
      };
    }
  },
});

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(from: Coordinate, to: Coordinate): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) *
      Math.cos(toRad(to.lat)) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Model-based prediction without crowd data
 */
function calculateModelPrediction(
  from: Coordinate,
  to: Coordinate,
  vehicleState: PredictionRequest["vehicleState"],
  variant: (typeof VARIANTS)["nexon_ev_mr"]
): number {
  let consumption = variant.baseConsumption;

  // Payload adjustment (0.5% per 10kg over 150kg)
  if (vehicleState.payload > 150) {
    consumption *= 1 + ((vehicleState.payload - 150) / 10) * 0.005;
  }

  // Tire pressure adjustment (-1% per PSI below optimal 35)
  if (vehicleState.tirePressure < 35) {
    consumption *= 1 + (35 - vehicleState.tirePressure) * 0.01;
  }

  // Battery health degradation
  if (vehicleState.batteryHealth < 100) {
    consumption *= 100 / vehicleState.batteryHealth;
  }

  return consumption;
}

/**
 * Calculate HVAC consumption based on mode and temperature difference
 */
function calculateHvacConsumption(
  vehicleState: PredictionRequest["vehicleState"]
): number {
  if (!vehicleState.hvacOn) return 0;

  // Base HVAC consumption in Wh/km
  const baseHvac = vehicleState.hvacMode === "heating" ? 25 : 20;

  // Temperature differential impact
  const ambientTemp = 28; // Assume average ambient
  const tempDiff = Math.abs(vehicleState.hvacTemperature - ambientTemp);

  return baseHvac * (1 + tempDiff * 0.02);
}

/**
 * Calculate energy impact from elevation change
 */
function calculateElevationEnergy(
  elevChange: number,
  distance: number,
  regenEfficiency: number
): number {
  // Energy = mgh, simplified for EV
  // Assume 1600kg vehicle mass
  const mass = 1600;
  const g = 9.81;

  // Potential energy change in Wh
  const potentialEnergy = (mass * g * elevChange) / 3600;

  if (elevChange > 0) {
    // Climbing - consume energy
    return potentialEnergy / 0.85; // Motor efficiency loss
  } else {
    // Descending - recover with regen
    return potentialEnergy * regenEfficiency;
  }
}

/**
 * Estimate traffic impact based on crowd data patterns
 */
function estimateTrafficImpact(
  crowdData: CrowdSegment,
  departureTime: string
): number {
  const date = new Date(departureTime);
  const dayOfWeek = date.getDay();
  const hour = date.getHours();

  // Find matching pattern
  const pattern = crowdData.trafficPatterns.find(
    (p) => p.dayOfWeek === dayOfWeek && p.hourOfDay === hour
  );

  if (!pattern) return 0;

  // Traffic level impact (0-3 scale)
  // Each level adds ~10 Wh/km due to stop-and-go
  return pattern.avgTrafficLevel * 10;
}
