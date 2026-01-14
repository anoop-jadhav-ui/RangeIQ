import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { syncTrips, getUserTrips } from "../services/cosmosDb.js";
import { SyncTripsRequest, Trip } from "../models/index.js";

/**
 * POST /api/trips/sync
 * Sync offline trips and update crowd data
 */
app.http("syncTrips", {
  methods: ["POST"],
  authLevel: "anonymous", // In production, use 'function' or JWT validation
  route: "trips/sync",
  handler: async (
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit> => {
    context.log("Sync trips request received");

    try {
      const body = (await request.json()) as SyncTripsRequest;

      if (!body.userId || !body.trips) {
        return {
          status: 400,
          jsonBody: { error: "Missing userId or trips in request body" },
        };
      }

      const result = await syncTrips(body);

      context.log(
        `Synced ${result.syncedCount} trips, created ${result.newSegmentsCreated} segments`
      );

      return {
        status: 200,
        jsonBody: result,
      };
    } catch (error) {
      context.error("Error syncing trips:", error);
      return {
        status: 500,
        jsonBody: { error: "Internal server error" },
      };
    }
  },
});

/**
 * GET /api/trips
 * Get user's trip history
 */
app.http("getTrips", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "trips",
  handler: async (
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit> => {
    context.log("Get trips request received");

    try {
      const userId = request.query.get("userId");
      const limit = parseInt(request.query.get("limit") || "50");
      const continuationToken =
        request.query.get("continuationToken") || undefined;

      if (!userId) {
        return {
          status: 400,
          jsonBody: { error: "Missing userId query parameter" },
        };
      }

      const result = await getUserTrips(userId, limit, continuationToken);

      return {
        status: 200,
        jsonBody: result,
      };
    } catch (error) {
      context.error("Error getting trips:", error);
      return {
        status: 500,
        jsonBody: { error: "Internal server error" },
      };
    }
  },
});
