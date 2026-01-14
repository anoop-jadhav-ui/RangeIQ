// Tata Nexon EV Vehicle Specifications
export interface NexonEVVariant {
  id: "MR" | "LR";
  name: string;
  fullName: string;
  batteryCapacity: number; // kWh
  officialRange: number; // km (MIDC)
  realWorldRange: number; // km (average)
  motorPower: number; // PS
  motorPowerKW: number; // kW
  torque: number; // Nm
  topSpeed: number; // km/h
  acceleration0to100: number; // seconds
  groundClearance: number; // mm
  fastChargePower: number; // kW
  acChargePower: number; // kW
  baseConsumption: number; // Wh/km at optimal conditions
}

export interface RegenLevel {
  level: 0 | 1 | 2 | 3;
  name: string;
  description: string;
  recoveryEfficiency: number; // percentage of energy recovered
}

export interface VehicleState {
  variant: NexonEVVariant;
  currentSoC: number; // State of Charge percentage (0-100)
  batteryHealth: number; // Battery health percentage (0-100)
  batteryTemperature: number; // Celsius
  regenLevel: RegenLevel;
  hvacOn: boolean;
  hvacMode: "off" | "cooling" | "heating";
  hvacTemperature: number; // Celsius
  tirePressure: number; // PSI (average)
  payload: number; // kg (passengers + cargo)
  odometer: number; // km
  isConnected: boolean; // OBD connection status
}

// Nexon EV Variants Configuration
export const NEXON_EV_VARIANTS: Record<"MR" | "LR", NexonEVVariant> = {
  MR: {
    id: "MR",
    name: "Medium Range",
    fullName: "Tata Nexon EV Medium Range",
    batteryCapacity: 30,
    officialRange: 275,
    realWorldRange: 210,
    motorPower: 129,
    motorPowerKW: 95,
    torque: 215,
    topSpeed: 120,
    acceleration0to100: 9.4,
    groundClearance: 205,
    fastChargePower: 50,
    acChargePower: 3.3,
    baseConsumption: 130, // Wh/km
  },
  LR: {
    id: "LR",
    name: "Long Range",
    fullName: "Tata Nexon EV Long Range",
    batteryCapacity: 45,
    officialRange: 489,
    realWorldRange: 320,
    motorPower: 144,
    motorPowerKW: 105,
    torque: 215,
    topSpeed: 150,
    acceleration0to100: 8.75,
    groundClearance: 190,
    fastChargePower: 60,
    acChargePower: 7.2,
    baseConsumption: 140, // Wh/km
  },
};

// Regeneration Levels
export const REGEN_LEVELS: RegenLevel[] = [
  {
    level: 0,
    name: "Off",
    description: "No regenerative braking",
    recoveryEfficiency: 0,
  },
  {
    level: 1,
    name: "Low",
    description: "Light regeneration, coasting feel",
    recoveryEfficiency: 0.1,
  },
  {
    level: 2,
    name: "Medium",
    description: "Balanced regeneration",
    recoveryEfficiency: 0.18,
  },
  {
    level: 3,
    name: "High",
    description: "Strong regeneration, one-pedal driving",
    recoveryEfficiency: 0.25,
  },
];

// Default vehicle state
export const DEFAULT_VEHICLE_STATE: VehicleState = {
  variant: NEXON_EV_VARIANTS.LR,
  currentSoC: 80,
  batteryHealth: 98,
  batteryTemperature: 25,
  regenLevel: REGEN_LEVELS[2],
  hvacOn: false,
  hvacMode: "off",
  hvacTemperature: 24,
  tirePressure: 33,
  payload: 75, // Driver only
  odometer: 0,
  isConnected: false,
};

// Get available battery energy in kWh
export function getAvailableEnergy(state: VehicleState): number {
  return (
    (state.variant.batteryCapacity * state.currentSoC * state.batteryHealth) /
    10000
  );
}

// Get usable range based on current state (simple estimate)
export function getSimpleRangeEstimate(state: VehicleState): number {
  const availableEnergy = getAvailableEnergy(state);
  const consumptionPerKm = state.variant.baseConsumption / 1000; // kWh/km
  return Math.round(availableEnergy / consumptionPerKm);
}
