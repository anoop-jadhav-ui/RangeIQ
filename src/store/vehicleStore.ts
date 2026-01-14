import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  VehicleState,
  NexonEVVariant,
  RegenLevel,
  NEXON_EV_VARIANTS,
  REGEN_LEVELS,
  DEFAULT_VEHICLE_STATE,
  getAvailableEnergy,
} from "@/types/vehicle";

interface VehicleStore extends VehicleState {
  // Actions
  setVariant: (variant: NexonEVVariant) => void;
  setSoC: (soc: number) => void;
  setBatteryHealth: (health: number) => void;
  setBatteryTemperature: (temp: number) => void;
  setRegenLevel: (level: RegenLevel) => void;
  setHvac: (
    on: boolean,
    mode?: "off" | "cooling" | "heating",
    temp?: number
  ) => void;
  setTirePressure: (pressure: number) => void;
  setPayload: (kg: number) => void;
  setConnected: (connected: boolean) => void;
  updateFromOBD: (data: Partial<VehicleState>) => void;
  reset: () => void;

  // Computed
  getAvailableEnergy: () => number;
  getSimpleRange: () => number;
}

export const useVehicleStore = create<VehicleStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_VEHICLE_STATE,

      setVariant: (variant) => set({ variant }),

      setSoC: (soc) => set({ currentSoC: Math.max(0, Math.min(100, soc)) }),

      setBatteryHealth: (health) =>
        set({ batteryHealth: Math.max(0, Math.min(100, health)) }),

      setBatteryTemperature: (temp) => set({ batteryTemperature: temp }),

      setRegenLevel: (level) => set({ regenLevel: level }),

      setHvac: (on, mode = "off", temp = 24) =>
        set({
          hvacOn: on,
          hvacMode: on ? (mode === "off" ? "cooling" : mode) : "off",
          hvacTemperature: temp,
        }),

      setTirePressure: (pressure) => set({ tirePressure: pressure }),

      setPayload: (kg) => set({ payload: Math.max(0, kg) }),

      setConnected: (connected) => set({ isConnected: connected }),

      updateFromOBD: (data) => set((state) => ({ ...state, ...data })),

      reset: () => set(DEFAULT_VEHICLE_STATE),

      getAvailableEnergy: () => {
        const state = get();
        return getAvailableEnergy(state);
      },

      getSimpleRange: () => {
        const state = get();
        const availableEnergy = getAvailableEnergy(state);
        const consumptionPerKm = state.variant.baseConsumption / 1000;
        return Math.round(availableEnergy / consumptionPerKm);
      },
    }),
    {
      name: "nexon-ev-vehicle-state",
      partialize: (state) => ({
        variant: state.variant,
        batteryHealth: state.batteryHealth,
        regenLevel: state.regenLevel,
        tirePressure: state.tirePressure,
        payload: state.payload,
      }),
    }
  )
);

// Selector hooks for optimized re-renders
export const useVariant = () => useVehicleStore((state) => state.variant);
export const useSoC = () => useVehicleStore((state) => state.currentSoC);
export const useRegenLevel = () => useVehicleStore((state) => state.regenLevel);
export const useHvacState = () =>
  useVehicleStore((state) => ({
    on: state.hvacOn,
    mode: state.hvacMode,
    temperature: state.hvacTemperature,
  }));
export const useConnectionStatus = () =>
  useVehicleStore((state) => state.isConnected);
