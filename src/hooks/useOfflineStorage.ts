/**
 * IndexedDB Hook for Offline Storage
 * Stores trips, routes, and settings locally
 */

"use client";

import { useCallback, useEffect, useState } from "react";

const DB_NAME = "nexon-ev-db";
const DB_VERSION = 1;

interface DBStores {
  trips: IDBObjectStore;
  routes: IDBObjectStore;
  crowdData: IDBObjectStore;
  settings: IDBObjectStore;
}

let dbInstance: IDBDatabase | null = null;

// Initialize database
function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error("Failed to open IndexedDB"));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Trips store - offline trip records
      if (!db.objectStoreNames.contains("trips")) {
        const tripsStore = db.createObjectStore("trips", { keyPath: "id" });
        tripsStore.createIndex("userId", "userId", { unique: false });
        tripsStore.createIndex("synced", "synced", { unique: false });
        tripsStore.createIndex("startTime", "startTime", { unique: false });
      }

      // Routes store - saved and recent routes
      if (!db.objectStoreNames.contains("routes")) {
        const routesStore = db.createObjectStore("routes", { keyPath: "id" });
        routesStore.createIndex("userId", "userId", { unique: false });
        routesStore.createIndex("type", "type", { unique: false });
      }

      // Crowd data store - cached crowd segments
      if (!db.objectStoreNames.contains("crowdData")) {
        const crowdStore = db.createObjectStore("crowdData", {
          keyPath: "geohash",
        });
        crowdStore.createIndex("lastUpdated", "lastUpdated", { unique: false });
      }

      // Settings store - user preferences
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "key" });
      }
    };
  });
}

// Generic store operations
async function getFromStore<T>(
  storeName: string,
  key: IDBValidKey
): Promise<T | undefined> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllFromStore<T>(
  storeName: string,
  indexName?: string,
  query?: IDBValidKey | IDBKeyRange
): Promise<T[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const target = indexName ? store.index(indexName) : store;
    const request = query ? target.getAll(query) : target.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putInStore<T>(
  storeName: string,
  value: T
): Promise<IDBValidKey> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.put(value);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function deleteFromStore(
  storeName: string,
  key: IDBValidKey
): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function clearStore(storeName: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Trip-specific types
export interface OfflineTrip {
  id: string;
  tripId: string;
  userId: string;
  startTime: string;
  endTime: string;
  distance: number;
  energyUsed: number;
  startSoC: number;
  endSoC: number;
  synced: boolean;
  segments: TripSegment[];
}

interface TripSegment {
  geohash: string;
  distance: number;
  whPerKm: number;
  avgSpeed: number;
}

// Hook for offline trips
export function useOfflineTrips(userId: string) {
  const [trips, setTrips] = useState<OfflineTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unsyncedCount, setUnsyncedCount] = useState(0);

  // Load trips
  useEffect(() => {
    const loadTrips = async () => {
      try {
        const allTrips = await getAllFromStore<OfflineTrip>(
          "trips",
          "userId",
          userId
        );
        setTrips(
          allTrips.sort(
            (a, b) =>
              new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
          )
        );
        setUnsyncedCount(allTrips.filter((t) => !t.synced).length);
      } catch (error) {
        console.error("[IDB] Failed to load trips:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTrips();
  }, [userId]);

  // Save trip
  const saveTrip = useCallback(async (trip: OfflineTrip) => {
    await putInStore("trips", trip);
    setTrips((prev) => [trip, ...prev.filter((t) => t.id !== trip.id)]);
    if (!trip.synced) {
      setUnsyncedCount((c) => c + 1);
    }
  }, []);

  // Mark trip as synced
  const markSynced = useCallback(
    async (tripId: string) => {
      const trip = trips.find((t) => t.id === tripId);
      if (trip) {
        await putInStore("trips", { ...trip, synced: true });
        setTrips((prev) =>
          prev.map((t) => (t.id === tripId ? { ...t, synced: true } : t))
        );
        setUnsyncedCount((c) => Math.max(0, c - 1));
      }
    },
    [trips]
  );

  // Get unsynced trips
  const getUnsyncedTrips = useCallback(async (): Promise<OfflineTrip[]> => {
    return getAllFromStore<OfflineTrip>(
      "trips",
      "synced",
      IDBKeyRange.only(false)
    );
  }, []);

  // Delete trip
  const deleteTrip = useCallback(async (tripId: string) => {
    await deleteFromStore("trips", tripId);
    setTrips((prev) => prev.filter((t) => t.id !== tripId));
  }, []);

  return {
    trips,
    isLoading,
    unsyncedCount,
    saveTrip,
    markSynced,
    getUnsyncedTrips,
    deleteTrip,
  };
}

// Route cache types
export interface CachedRoute {
  id: string;
  userId: string;
  type: "saved" | "recent";
  name: string;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  distance: number;
  duration: number;
  createdAt: string;
}

// Hook for cached routes
export function useCachedRoutes(userId: string) {
  const [savedRoutes, setSavedRoutes] = useState<CachedRoute[]>([]);
  const [recentRoutes, setRecentRoutes] = useState<CachedRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load routes
  useEffect(() => {
    const loadRoutes = async () => {
      try {
        const allRoutes = await getAllFromStore<CachedRoute>(
          "routes",
          "userId",
          userId
        );
        setSavedRoutes(allRoutes.filter((r) => r.type === "saved"));
        setRecentRoutes(
          allRoutes
            .filter((r) => r.type === "recent")
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            )
            .slice(0, 10)
        );
      } catch (error) {
        console.error("[IDB] Failed to load routes:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRoutes();
  }, [userId]);

  // Save route
  const saveRoute = useCallback(async (route: CachedRoute) => {
    await putInStore("routes", route);
    if (route.type === "saved") {
      setSavedRoutes((prev) => [
        route,
        ...prev.filter((r) => r.id !== route.id),
      ]);
    } else {
      setRecentRoutes((prev) =>
        [route, ...prev.filter((r) => r.id !== route.id)].slice(0, 10)
      );
    }
  }, []);

  // Delete route
  const deleteRoute = useCallback(async (routeId: string) => {
    await deleteFromStore("routes", routeId);
    setSavedRoutes((prev) => prev.filter((r) => r.id !== routeId));
    setRecentRoutes((prev) => prev.filter((r) => r.id !== routeId));
  }, []);

  return {
    savedRoutes,
    recentRoutes,
    isLoading,
    saveRoute,
    deleteRoute,
  };
}

// Crowd data cache
export interface CachedCrowdSegment {
  geohash: string;
  avgWhPerKm: number;
  sampleCount: number;
  confidence: number;
  lastUpdated: string;
}

// Hook for crowd data cache
export function useCrowdDataCache() {
  // Get cached segment
  const getCachedSegment = useCallback(
    async (geohash: string): Promise<CachedCrowdSegment | undefined> => {
      return getFromStore<CachedCrowdSegment>("crowdData", geohash);
    },
    []
  );

  // Cache segment
  const cacheSegment = useCallback(async (segment: CachedCrowdSegment) => {
    await putInStore("crowdData", segment);
  }, []);

  // Cache multiple segments
  const cacheSegments = useCallback(async (segments: CachedCrowdSegment[]) => {
    for (const segment of segments) {
      await putInStore("crowdData", segment);
    }
  }, []);

  // Clear old cache entries
  const pruneCache = useCallback(
    async (maxAgeMs: number = 7 * 24 * 60 * 60 * 1000) => {
      const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
      const allSegments = await getAllFromStore<CachedCrowdSegment>(
        "crowdData"
      );

      for (const segment of allSegments) {
        if (segment.lastUpdated < cutoff) {
          await deleteFromStore("crowdData", segment.geohash);
        }
      }
    },
    []
  );

  return {
    getCachedSegment,
    cacheSegment,
    cacheSegments,
    pruneCache,
  };
}

// Settings storage
export function useOfflineSettings() {
  const getSetting = useCallback(
    async <T>(key: string): Promise<T | undefined> => {
      const result = await getFromStore<{ key: string; value: T }>(
        "settings",
        key
      );
      return result?.value;
    },
    []
  );

  const setSetting = useCallback(async <T>(key: string, value: T) => {
    await putInStore("settings", { key, value });
  }, []);

  const deleteSetting = useCallback(async (key: string) => {
    await deleteFromStore("settings", key);
  }, []);

  return {
    getSetting,
    setSetting,
    deleteSetting,
  };
}

export { initDB, clearStore };
