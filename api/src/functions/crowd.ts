import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { getCrowdData, getRouteSegments } from "../services/cosmosDb.js";
import { GetCrowdDataRequest, calculateGeohash } from "../models/index.js";

/**
 * POST /api/crowd/segments
 * Get crowd-sourced data for specific segment hashes
 */
app.http("getCrowdSegments", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "crowd/segments",
  handler: async (
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit> => {
    context.log("Get crowd segments request received");

    try {
      const body = (await request.json()) as GetCrowdDataRequest;

      if (!body.segmentHashes || !Array.isArray(body.segmentHashes)) {
        return {
          status: 400,
          jsonBody: {
            error: "Missing or invalid segmentHashes in request body",
          },
        };
      }

      const segments = await getCrowdData(body.segmentHashes);
      const foundHashes = segments.map((s) => s.geohash);
      const notFound = body.segmentHashes.filter(
        (h) => !foundHashes.includes(h)
      );

      return {
        status: 200,
        jsonBody: {
          segments,
          notFound,
        },
      };
    } catch (error) {
      context.error("Error getting crowd segments:", error);
      return {
        status: 500,
        jsonBody: { error: "Internal server error" },
      };
    }
  },
});

/**
 * POST /api/crowd/route
 * Get crowd-sourced data for a route (array of coordinates)
 */
app.http("getCrowdDataForRoute", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "crowd/route",
  handler: async (
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit> => {
    context.log("Get crowd data for route request received");

    try {
      const body = (await request.json()) as {
        coordinates: { lat: number; lng: number }[];
      };

      if (!body.coordinates || !Array.isArray(body.coordinates)) {
        return {
          status: 400,
          jsonBody: { error: "Missing or invalid coordinates in request body" },
        };
      }

      const segments = await getRouteSegments(body.coordinates);

      // Calculate coverage statistics
      const totalPoints = body.coordinates.length;
      const uniqueGeohashes = new Set(
        body.coordinates.map((c) => calculateGeohash(c.lat, c.lng, 6))
      );
      const coveredGeohashes = segments.map((s) => s.geohash);
      const coverage = coveredGeohashes.length / uniqueGeohashes.size;

      // Average confidence
      const avgConfidence =
        segments.length > 0
          ? segments.reduce((sum, s) => sum + s.confidence, 0) / segments.length
          : 0;

      return {
        status: 200,
        jsonBody: {
          segments,
          statistics: {
            totalSegments: segments.length,
            totalRoutePoints: totalPoints,
            uniqueGeohashes: uniqueGeohashes.size,
            coverageRatio: Math.round(coverage * 100) / 100,
            averageConfidence: Math.round(avgConfidence * 100) / 100,
            highConfidenceSegments: segments.filter((s) => s.confidence > 0.7)
              .length,
          },
        },
      };
    } catch (error) {
      context.error("Error getting crowd data for route:", error);
      return {
        status: 500,
        jsonBody: { error: "Internal server error" },
      };
    }
  },
});

/**
 * GET /api/crowd/geohash/:geohash
 * Get crowd data for a specific geohash
 */
app.http("getCrowdDataByGeohash", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "crowd/geohash/{geohash}",
  handler: async (
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit> => {
    const geohash = request.params.geohash;
    context.log(`Get crowd data for geohash: ${geohash}`);

    try {
      if (!geohash || geohash.length < 4 || geohash.length > 8) {
        return {
          status: 400,
          jsonBody: { error: "Invalid geohash. Must be 4-8 characters." },
        };
      }

      const segments = await getCrowdData([geohash]);

      if (segments.length === 0) {
        return {
          status: 404,
          jsonBody: { error: "No crowd data found for this geohash" },
        };
      }

      return {
        status: 200,
        jsonBody: segments[0],
      };
    } catch (error) {
      context.error("Error getting crowd data by geohash:", error);
      return {
        status: 500,
        jsonBody: { error: "Internal server error" },
      };
    }
  },
});
