import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  Coordinate,
  Route,
  TripPrediction,
  WeatherConditions,
  TrafficConditions,
} from "@/types/route";

interface RouteState {
  // Current route planning
  origin: Coordinate | null;
  destination: Coordinate | null;
  waypoints: Coordinate[];
  currentRoute: Route | null;

  // Conditions
  weather: WeatherConditions | null;
  traffic: TrafficConditions | null;

  // Prediction
  prediction: TripPrediction | null;

  // UI State
  isLoading: boolean;
  error: string | null;

  // Saved routes
  savedRoutes: Route[];
  recentRoutes: Route[];
}

interface RouteActions {
  setOrigin: (coord: Coordinate | null) => void;
  setDestination: (coord: Coordinate | null) => void;
  addWaypoint: (coord: Coordinate) => void;
  removeWaypoint: (index: number) => void;
  clearWaypoints: () => void;
  setRoute: (route: Route | null) => void;
  setWeather: (weather: WeatherConditions | null) => void;
  setTraffic: (traffic: TrafficConditions | null) => void;
  setPrediction: (prediction: TripPrediction | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  saveRoute: (route: Route) => void;
  addToRecent: (route: Route) => void;
  clearRoute: () => void;
}

export const useRouteStore = create<RouteState & RouteActions>()(
  persist(
    (set, get) => ({
      // Initial state
      origin: null,
      destination: null,
      waypoints: [],
      currentRoute: null,
      weather: null,
      traffic: null,
      prediction: null,
      isLoading: false,
      error: null,
      savedRoutes: [],
      recentRoutes: [],

      // Actions
      setOrigin: (coord) => set({ origin: coord }),

      setDestination: (coord) => set({ destination: coord }),

      addWaypoint: (coord) =>
        set((state) => ({
          waypoints: [...state.waypoints, coord],
        })),

      removeWaypoint: (index) =>
        set((state) => ({
          waypoints: state.waypoints.filter((_, i) => i !== index),
        })),

      clearWaypoints: () => set({ waypoints: [] }),

      setRoute: (route) => set({ currentRoute: route }),

      setWeather: (weather) => set({ weather }),

      setTraffic: (traffic) => set({ traffic }),

      setPrediction: (prediction) => set({ prediction }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      saveRoute: (route) =>
        set((state) => ({
          savedRoutes: [
            route,
            ...state.savedRoutes.filter((r) => r.id !== route.id),
          ].slice(0, 20),
        })),

      addToRecent: (route) =>
        set((state) => ({
          recentRoutes: [
            route,
            ...state.recentRoutes.filter((r) => r.id !== route.id),
          ].slice(0, 10),
        })),

      clearRoute: () =>
        set({
          origin: null,
          destination: null,
          waypoints: [],
          currentRoute: null,
          prediction: null,
          error: null,
        }),
    }),
    {
      name: "nexon-ev-route-state",
      partialize: (state) => ({
        savedRoutes: state.savedRoutes,
        recentRoutes: state.recentRoutes,
      }),
    }
  )
);
