import {
  CosmosClient,
  Container,
  Database,
  CosmosClientOptions,
} from "@azure/cosmos";
import {
  UserProfile,
  Trip,
  CrowdSegment,
  SyncTripsRequest,
  SyncTripsResponse,
  calculateGeohash,
  createSegmentHash,
  calculateConfidence,
  AggregatedConsumption,
} from "../models/index.js";

let client: CosmosClient | null = null;
let database: Database | null = null;
let usersContainer: Container | null = null;
let tripsContainer: Container | null = null;
let crowdContainer: Container | null = null;

/**
 * Initialize Cosmos DB connection
 */
export async function initializeCosmosDb(): Promise<void> {
  const connectionString = process.env.COSMOS_DB_CONNECTION_STRING;
  const databaseName = process.env.COSMOS_DB_DATABASE_NAME || "nexon-ev-db";

  if (!connectionString) {
    throw new Error(
      "COSMOS_DB_CONNECTION_STRING environment variable is not set"
    );
  }

  const options: CosmosClientOptions = {
    connectionPolicy: {
      requestTimeout: 10000,
      retryOptions: {
        maxRetryAttemptCount: 9,
        fixedRetryIntervalInMilliseconds: 0,
        maxWaitTimeInSeconds: 30,
      },
    },
  };

  client = new CosmosClient(connectionString);
  database = client.database(databaseName);

  usersContainer = database.container(
    process.env.COSMOS_DB_USERS_CONTAINER || "users"
  );
  tripsContainer = database.container(
    process.env.COSMOS_DB_TRIPS_CONTAINER || "trips"
  );
  crowdContainer = database.container(
    process.env.COSMOS_DB_CROWD_CONTAINER || "crowdSegments"
  );
}

/**
 * Get or create user profile
 */
export async function getOrCreateUser(userId: string): Promise<UserProfile> {
  if (!usersContainer) await initializeCosmosDb();

  try {
    const { resource } = await usersContainer!
      .item(userId, userId)
      .read<UserProfile>();
    if (resource) return resource;
  } catch (error: any) {
    if (error.code !== 404) throw error;
  }

  // Create default profile
  const newProfile: UserProfile = {
    id: userId,
    userId,
    vehicleConfig: {
      variantId: "nexon_ev_mr",
      batteryHealth: 100,
      manufacturingYear: new Date().getFullYear(),
      odometer: 0,
      defaultRegenLevel: 2,
      defaultTirePressure: 35,
      defaultPayload: 150,
    },
    preferences: {
      units: "metric",
      temperatureUnit: "celsius",
      shareAnonymousData: true,
      offlineMapsEnabled: false,
      preferredRegion: "maharashtra",
      notificationsEnabled: false,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await usersContainer!.items.create(newProfile);
  return newProfile;
}

/**
 * Update user profile
 */
export async function updateUser(
  userId: string,
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  if (!usersContainer) await initializeCosmosDb();

  const current = await getOrCreateUser(userId);
  const updated: UserProfile = {
    ...current,
    ...updates,
    id: userId,
    userId,
    updatedAt: new Date().toISOString(),
  };

  const { resource } = await usersContainer!.items.upsert(updated);
  if (!resource) {
    throw new Error(`Failed to update user profile for userId: ${userId}`);
  }
  return resource as unknown as UserProfile;
}

/**
 * Save a trip record
 */
export async function saveTrip(trip: Trip): Promise<Trip> {
  if (!tripsContainer) await initializeCosmosDb();

  const tripWithMeta: Trip = {
    ...trip,
    createdAt: new Date().toISOString(),
    synced: true,
  };

  const { resource } = await tripsContainer!.items.upsert(tripWithMeta);
  if (!resource) {
    throw new Error(`Failed to save trip: ${trip.tripId}`);
  }
  return resource as unknown as Trip;
}

/**
 * Get trips for a user
 */
export async function getUserTrips(
  userId: string,
  limit: number = 50,
  continuationToken?: string
): Promise<{ trips: Trip[]; continuationToken?: string }> {
  if (!tripsContainer) await initializeCosmosDb();

  const query = {
    query: "SELECT * FROM c WHERE c.userId = @userId ORDER BY c.startTime DESC",
    parameters: [{ name: "@userId", value: userId }],
  };

  const { resources, continuationToken: nextToken } =
    await tripsContainer!.items
      .query<Trip>(query, {
        maxItemCount: limit,
        continuationToken,
      })
      .fetchNext();

  return { trips: resources, continuationToken: nextToken };
}

/**
 * Sync trips and update crowd data
 */
export async function syncTrips(
  request: SyncTripsRequest
): Promise<SyncTripsResponse> {
  if (!tripsContainer || !crowdContainer) await initializeCosmosDb();

  let syncedCount = 0;
  let newSegmentsCreated = 0;
  let crowdUpdatesApplied = 0;

  for (const trip of request.trips) {
    // Save the trip
    await saveTrip({ ...trip, userId: request.userId });
    syncedCount++;

    // Update crowd data from segments if user opted in
    const user = await getOrCreateUser(request.userId);
    if (user.preferences.shareAnonymousData && trip.segments) {
      for (const segment of trip.segments) {
        const result = await updateCrowdSegment(segment, trip);
        if (result.created) newSegmentsCreated++;
        if (result.updated) crowdUpdatesApplied++;
      }
    }
  }

  return {
    syncedCount,
    newSegmentsCreated,
    crowdUpdatesApplied,
    syncTimestamp: new Date().toISOString(),
  };
}

/**
 * Update crowd segment with trip data
 */
async function updateCrowdSegment(
  segment: Trip["segments"][0],
  trip: Trip
): Promise<{ created: boolean; updated: boolean }> {
  if (!crowdContainer) await initializeCosmosDb();

  const segmentId = `${segment.geohash}-${segment.startIndex}`;
  let created = false;
  let updated = false;

  try {
    // Try to read existing segment
    const { resource: existing } = await crowdContainer!
      .item(segmentId, segment.geohash)
      .read<CrowdSegment>();

    if (existing) {
      // Update existing segment
      const newCount = existing.sampleCount + 1;
      const variantId = trip.vehicleState.variantId;

      // Running average update
      const newAvg =
        existing.aggregatedData.avgWhPerKm +
        (segment.whPerKm - existing.aggregatedData.avgWhPerKm) / newCount;

      existing.aggregatedData.avgWhPerKm = Math.round(newAvg * 100) / 100;
      existing.aggregatedData.minWhPerKm = Math.min(
        existing.aggregatedData.minWhPerKm,
        segment.whPerKm
      );
      existing.aggregatedData.maxWhPerKm = Math.max(
        existing.aggregatedData.maxWhPerKm,
        segment.whPerKm
      );
      existing.sampleCount = newCount;
      existing.lastUpdated = new Date().toISOString();
      existing.confidence = calculateConfidence(
        newCount,
        existing.aggregatedData.stdDeviation
      );

      // Update by variant
      if (!existing.aggregatedData.byVariant[variantId]) {
        existing.aggregatedData.byVariant[variantId] = {
          avgWhPerKm: segment.whPerKm,
          sampleCount: 1,
        };
      } else {
        const variantData = existing.aggregatedData.byVariant[variantId];
        variantData.avgWhPerKm =
          variantData.avgWhPerKm +
          (segment.whPerKm - variantData.avgWhPerKm) /
            (variantData.sampleCount + 1);
        variantData.sampleCount++;
      }

      await crowdContainer!.items.upsert(existing);
      updated = true;
    }
  } catch (error: any) {
    if (error.code === 404) {
      // Create new segment
      const newSegment: CrowdSegment = {
        id: segmentId,
        geohash: segment.geohash,
        segmentHash: createSegmentHash(segment.geohash, segment.geohash),
        fromGeohash: segment.geohash,
        toGeohash: segment.geohash,
        distance: segment.distance,
        elevationChange: segment.elevationChange,
        roadType: segment.roadType,
        aggregatedData: {
          avgWhPerKm: segment.whPerKm,
          minWhPerKm: segment.whPerKm,
          maxWhPerKm: segment.whPerKm,
          stdDeviation: 0,
          byVariant: {
            [trip.vehicleState.variantId]: {
              avgWhPerKm: segment.whPerKm,
              sampleCount: 1,
            },
          },
          byTemperatureRange: {
            cold: { avg: 0, count: 0 },
            moderate: { avg: 0, count: 0 },
            hot: { avg: 0, count: 0 },
          },
          byRegenLevel: {},
        },
        trafficPatterns: [],
        sampleCount: 1,
        lastUpdated: new Date().toISOString(),
        confidence: 0.1,
      };

      await crowdContainer!.items.create(newSegment);
      created = true;
    } else {
      throw error;
    }
  }

  return { created, updated };
}

/**
 * Get crowd data for segments
 */
export async function getCrowdData(
  geohashes: string[]
): Promise<CrowdSegment[]> {
  if (!crowdContainer) await initializeCosmosDb();

  if (geohashes.length === 0) return [];

  // Query for segments matching any of the geohashes
  const placeholders = geohashes.map((_, i) => `@geohash${i}`).join(", ");
  const query = {
    query: `SELECT * FROM c WHERE c.geohash IN (${placeholders})`,
    parameters: geohashes.map((gh, i) => ({ name: `@geohash${i}`, value: gh })),
  };

  const { resources } = await crowdContainer!.items
    .query<CrowdSegment>(query)
    .fetchAll();
  return resources;
}

/**
 * Get high-confidence segments for a route
 */
export async function getRouteSegments(
  coordinates: { lat: number; lng: number }[]
): Promise<CrowdSegment[]> {
  const geohashes = coordinates.map((c) => calculateGeohash(c.lat, c.lng, 6));
  const uniqueGeohashes = [...new Set(geohashes)];

  return getCrowdData(uniqueGeohashes);
}
