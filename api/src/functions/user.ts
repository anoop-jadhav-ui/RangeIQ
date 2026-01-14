import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { getOrCreateUser, updateUser } from "../services/cosmosDb.js";
import {
  UserProfile,
  VehicleConfig,
  UserPreferences,
} from "../models/index.js";

/**
 * GET /api/user/:userId
 * Get user profile
 */
app.http("getUser", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "user/{userId}",
  handler: async (
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit> => {
    const userId = request.params.userId;
    context.log(`Get user profile: ${userId}`);

    try {
      if (!userId) {
        return {
          status: 400,
          jsonBody: { error: "Missing userId parameter" },
        };
      }

      const user = await getOrCreateUser(userId);

      return {
        status: 200,
        jsonBody: user,
      };
    } catch (error) {
      context.error("Error getting user:", error);
      return {
        status: 500,
        jsonBody: { error: "Internal server error" },
      };
    }
  },
});

/**
 * PUT /api/user/:userId
 * Update user profile
 */
app.http("updateUser", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "user/{userId}",
  handler: async (
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit> => {
    const userId = request.params.userId;
    context.log(`Update user profile: ${userId}`);

    try {
      if (!userId) {
        return {
          status: 400,
          jsonBody: { error: "Missing userId parameter" },
        };
      }

      const body = (await request.json()) as Partial<UserProfile>;

      // Don't allow changing id or userId
      delete body.id;
      delete body.userId;

      const updated = await updateUser(userId, body);

      return {
        status: 200,
        jsonBody: updated,
      };
    } catch (error) {
      context.error("Error updating user:", error);
      return {
        status: 500,
        jsonBody: { error: "Internal server error" },
      };
    }
  },
});

/**
 * PUT /api/user/:userId/vehicle
 * Update vehicle configuration
 */
app.http("updateVehicleConfig", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "user/{userId}/vehicle",
  handler: async (
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit> => {
    const userId = request.params.userId;
    context.log(`Update vehicle config: ${userId}`);

    try {
      if (!userId) {
        return {
          status: 400,
          jsonBody: { error: "Missing userId parameter" },
        };
      }

      const vehicleConfig = (await request.json()) as Partial<VehicleConfig>;
      const current = await getOrCreateUser(userId);

      const updated = await updateUser(userId, {
        vehicleConfig: { ...current.vehicleConfig, ...vehicleConfig },
      });

      return {
        status: 200,
        jsonBody: updated.vehicleConfig,
      };
    } catch (error) {
      context.error("Error updating vehicle config:", error);
      return {
        status: 500,
        jsonBody: { error: "Internal server error" },
      };
    }
  },
});

/**
 * PUT /api/user/:userId/preferences
 * Update user preferences
 */
app.http("updatePreferences", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "user/{userId}/preferences",
  handler: async (
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit> => {
    const userId = request.params.userId;
    context.log(`Update preferences: ${userId}`);

    try {
      if (!userId) {
        return {
          status: 400,
          jsonBody: { error: "Missing userId parameter" },
        };
      }

      const preferences = (await request.json()) as Partial<UserPreferences>;
      const current = await getOrCreateUser(userId);

      const updated = await updateUser(userId, {
        preferences: { ...current.preferences, ...preferences },
      });

      return {
        status: 200,
        jsonBody: updated.preferences,
      };
    } catch (error) {
      context.error("Error updating preferences:", error);
      return {
        status: 500,
        jsonBody: { error: "Internal server error" },
      };
    }
  },
});
