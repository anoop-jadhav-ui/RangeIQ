/**
 * Web Bluetooth OBD-II Service
 * Connects to ELM327 BLE adapters for real-time vehicle data
 *
 * Compatible with: drivepro ELM327 Bluetooth 4.0 LE and similar adapters
 */

// ELM327 BLE Service UUIDs (common for most adapters)
const ELM327_SERVICE_UUID = "0000fff0-0000-1000-8000-00805f9b34fb";
const ELM327_CHARACTERISTIC_TX = "0000fff1-0000-1000-8000-00805f9b34fb"; // Write
const ELM327_CHARACTERISTIC_RX = "0000fff2-0000-1000-8000-00805f9b34fb"; // Notify

// Alternative UUIDs for some adapters
const ALT_SERVICE_UUID = "00001101-0000-1000-8000-00805f9b34fb";
const NORDIC_UART_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const NORDIC_UART_TX = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const NORDIC_UART_RX = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

// OBD-II PIDs for Nexon EV
const OBD_PIDS = {
  SPEED: "010D", // Vehicle speed
  BATTERY_SOC: "015B", // Battery state of charge (Hybrid/EV)
  BATTERY_VOLTAGE: "0142", // Control module voltage
  AMBIENT_TEMP: "0146", // Ambient air temperature
  COOLANT_TEMP: "0105", // Engine coolant temperature (for battery temp on EVs)
  THROTTLE: "0111", // Throttle position
  DISTANCE: "01A6", // Odometer (some vehicles)
  POWER: "015E", // Engine fuel rate (adapted for power on EVs)
};

// Response parsers
type ParsedResponse = {
  pid: string;
  value: number;
  unit: string;
  raw: string;
};

export interface OBDData {
  speed: number; // km/h
  batterySoC: number; // %
  batteryVoltage: number; // V
  ambientTemp: number; // °C
  batteryTemp: number; // °C
  throttle: number; // %
  power: number; // kW (estimated)
  timestamp: number;
}

export type OBDConnectionState =
  | "disconnected"
  | "connecting"
  | "initializing"
  | "connected"
  | "error";

export interface OBDEventHandlers {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onData?: (data: Partial<OBDData>) => void;
  onError?: (error: Error) => void;
  onStateChange?: (state: OBDConnectionState) => void;
}

class OBDBluetoothService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private txCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private rxCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private state: OBDConnectionState = "disconnected";
  private handlers: OBDEventHandlers = {};
  private responseBuffer = "";
  private currentPidIndex = 0;
  private pollingInterval: NodeJS.Timeout | null = null;
  private readonly pollRate = 500; // ms between PID queries

  // Check if Web Bluetooth is supported
  isSupported(): boolean {
    return typeof navigator !== "undefined" && "bluetooth" in navigator;
  }

  // Set event handlers
  setHandlers(handlers: OBDEventHandlers): void {
    this.handlers = handlers;
  }

  // Get current state
  getState(): OBDConnectionState {
    return this.state;
  }

  // Update state and notify
  private setState(newState: OBDConnectionState): void {
    this.state = newState;
    this.handlers.onStateChange?.(newState);
  }

  // Connect to OBD adapter
  async connect(): Promise<boolean> {
    if (!this.isSupported()) {
      throw new Error("Web Bluetooth is not supported in this browser");
    }

    this.setState("connecting");

    try {
      // Request device with ELM327 service
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [ELM327_SERVICE_UUID] },
          { services: [NORDIC_UART_SERVICE] },
          { namePrefix: "OBD" },
          { namePrefix: "ELM" },
          { namePrefix: "OBDII" },
          { namePrefix: "V-LINK" },
          { namePrefix: "Vgate" },
        ],
        optionalServices: [ELM327_SERVICE_UUID, NORDIC_UART_SERVICE],
      });

      if (!this.device) {
        throw new Error("No device selected");
      }

      console.log("[OBD] Device selected:", this.device.name);

      // Listen for disconnection
      this.device.addEventListener("gattserverdisconnected", () => {
        this.handleDisconnect();
      });

      // Connect to GATT server
      this.server = await this.device.gatt?.connect();
      if (!this.server) {
        throw new Error("Failed to connect to GATT server");
      }

      console.log("[OBD] Connected to GATT server");

      // Get service and characteristics
      await this.setupCharacteristics();

      // Initialize ELM327
      this.setState("initializing");
      await this.initializeELM327();

      this.setState("connected");
      this.handlers.onConnect?.();

      // Start polling
      this.startPolling();

      return true;
    } catch (error) {
      console.error("[OBD] Connection failed:", error);
      this.setState("error");
      this.handlers.onError?.(
        error instanceof Error ? error : new Error("Connection failed")
      );
      return false;
    }
  }

  // Setup BLE characteristics
  private async setupCharacteristics(): Promise<void> {
    if (!this.server) throw new Error("Not connected");

    // Try primary service UUID
    let service: BluetoothRemoteGATTService;
    try {
      service = await this.server.getPrimaryService(ELM327_SERVICE_UUID);
      this.txCharacteristic = await service.getCharacteristic(
        ELM327_CHARACTERISTIC_TX
      );
      this.rxCharacteristic = await service.getCharacteristic(
        ELM327_CHARACTERISTIC_RX
      );
    } catch {
      // Try Nordic UART service
      console.log("[OBD] Trying Nordic UART service...");
      service = await this.server.getPrimaryService(NORDIC_UART_SERVICE);
      this.txCharacteristic = await service.getCharacteristic(NORDIC_UART_TX);
      this.rxCharacteristic = await service.getCharacteristic(NORDIC_UART_RX);
    }

    // Setup notification handler
    await this.rxCharacteristic.startNotifications();
    this.rxCharacteristic.addEventListener(
      "characteristicvaluechanged",
      (event) => {
        this.handleResponse(event);
      }
    );

    console.log("[OBD] Characteristics setup complete");
  }

  // Initialize ELM327 adapter
  private async initializeELM327(): Promise<void> {
    // Reset adapter
    await this.sendCommand("ATZ");
    await this.delay(1000);

    // Disable echo
    await this.sendCommand("ATE0");
    await this.delay(100);

    // Disable line feeds
    await this.sendCommand("ATL0");
    await this.delay(100);

    // Set protocol to auto
    await this.sendCommand("ATSP0");
    await this.delay(100);

    // Set headers off
    await this.sendCommand("ATH0");
    await this.delay(100);

    // Set timeout (maximum value FF = 1.02 seconds)
    await this.sendCommand("ATSTFF");
    await this.delay(100);

    console.log("[OBD] ELM327 initialized");
  }

  // Send command to adapter
  private async sendCommand(command: string): Promise<void> {
    if (!this.txCharacteristic) {
      throw new Error("Not connected");
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(command + "\r");
    await this.txCharacteristic.writeValue(data);
    console.log("[OBD] Sent:", command);
  }

  // Handle incoming response
  private handleResponse(event: Event): void {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const decoder = new TextDecoder();
    const value = decoder.decode(target.value);

    this.responseBuffer += value;

    // Check for complete response (ends with >)
    if (this.responseBuffer.includes(">")) {
      const response = this.responseBuffer.trim().replace(">", "");
      this.responseBuffer = "";
      this.processResponse(response);
    }
  }

  // Process OBD response
  private processResponse(response: string): void {
    console.log("[OBD] Response:", response);

    // Skip if no data or error
    if (
      response.includes("NO DATA") ||
      response.includes("ERROR") ||
      response.includes("?")
    ) {
      return;
    }

    // Parse response
    const parsed = this.parseOBDResponse(response);
    if (parsed) {
      this.handlers.onData?.(this.convertToOBDData(parsed));
    }
  }

  // Parse OBD-II response
  private parseOBDResponse(response: string): ParsedResponse | null {
    // Remove spaces and get hex bytes
    const clean = response.replace(/\s/g, "").toUpperCase();

    // Check for valid response format (41 XX YY ZZ...)
    if (!clean.startsWith("41")) {
      return null;
    }

    const pid = clean.substring(2, 4);
    const dataBytes = clean.substring(4);

    let value = 0;
    let unit = "";

    switch ("01" + pid) {
      case OBD_PIDS.SPEED:
        // Speed in km/h (single byte)
        value = parseInt(dataBytes.substring(0, 2), 16);
        unit = "km/h";
        break;

      case OBD_PIDS.BATTERY_SOC:
        // State of charge (percentage)
        value = (parseInt(dataBytes.substring(0, 2), 16) * 100) / 255;
        unit = "%";
        break;

      case OBD_PIDS.BATTERY_VOLTAGE:
        // Voltage (A*256+B)/1000
        if (dataBytes.length >= 4) {
          const A = parseInt(dataBytes.substring(0, 2), 16);
          const B = parseInt(dataBytes.substring(2, 4), 16);
          value = (A * 256 + B) / 1000;
          unit = "V";
        }
        break;

      case OBD_PIDS.AMBIENT_TEMP:
      case OBD_PIDS.COOLANT_TEMP:
        // Temperature in Celsius (A-40)
        value = parseInt(dataBytes.substring(0, 2), 16) - 40;
        unit = "°C";
        break;

      case OBD_PIDS.THROTTLE:
        // Throttle position percentage
        value = (parseInt(dataBytes.substring(0, 2), 16) * 100) / 255;
        unit = "%";
        break;

      default:
        return null;
    }

    return { pid: "01" + pid, value, unit, raw: response };
  }

  // Convert parsed response to OBDData
  private convertToOBDData(parsed: ParsedResponse): Partial<OBDData> {
    const data: Partial<OBDData> = { timestamp: Date.now() };

    switch (parsed.pid) {
      case OBD_PIDS.SPEED:
        data.speed = parsed.value;
        break;
      case OBD_PIDS.BATTERY_SOC:
        data.batterySoC = Math.round(parsed.value);
        break;
      case OBD_PIDS.BATTERY_VOLTAGE:
        data.batteryVoltage = Math.round(parsed.value * 10) / 10;
        break;
      case OBD_PIDS.AMBIENT_TEMP:
        data.ambientTemp = parsed.value;
        break;
      case OBD_PIDS.COOLANT_TEMP:
        data.batteryTemp = parsed.value;
        break;
      case OBD_PIDS.THROTTLE:
        data.throttle = Math.round(parsed.value);
        break;
    }

    return data;
  }

  // Start polling OBD data
  private startPolling(): void {
    const pids = [
      OBD_PIDS.SPEED,
      OBD_PIDS.BATTERY_SOC,
      OBD_PIDS.BATTERY_VOLTAGE,
      OBD_PIDS.AMBIENT_TEMP,
      OBD_PIDS.COOLANT_TEMP,
      OBD_PIDS.THROTTLE,
    ];

    this.pollingInterval = setInterval(async () => {
      if (this.state !== "connected") return;

      const pid = pids[this.currentPidIndex];
      try {
        await this.sendCommand(pid);
      } catch (error) {
        console.error("[OBD] Polling error:", error);
      }

      this.currentPidIndex = (this.currentPidIndex + 1) % pids.length;
    }, this.pollRate);
  }

  // Stop polling
  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  // Handle disconnection
  private handleDisconnect(): void {
    this.stopPolling();
    this.setState("disconnected");
    this.handlers.onDisconnect?.();
    console.log("[OBD] Disconnected");
  }

  // Disconnect from adapter
  async disconnect(): Promise<void> {
    this.stopPolling();

    if (this.rxCharacteristic) {
      try {
        await this.rxCharacteristic.stopNotifications();
      } catch {
        // Ignore errors during cleanup
      }
    }

    if (this.server?.connected) {
      this.server.disconnect();
    }

    this.device = null;
    this.server = null;
    this.txCharacteristic = null;
    this.rxCharacteristic = null;
    this.setState("disconnected");
  }

  // Utility delay function
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Read specific PID (one-shot)
  async readPID(pid: string): Promise<ParsedResponse | null> {
    if (this.state !== "connected") {
      throw new Error("Not connected");
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(null), 2000);

      const originalHandler = this.handlers.onData;
      this.handlers.onData = (data) => {
        clearTimeout(timeout);
        this.handlers.onData = originalHandler;
        // Convert back to ParsedResponse format
        resolve(null); // Simplified for now
      };

      this.sendCommand(pid).catch(() => {
        clearTimeout(timeout);
        this.handlers.onData = originalHandler;
        resolve(null);
      });
    });
  }
}

// Export singleton instance
export const obdService = new OBDBluetoothService();

// React hook for OBD connection
export function useOBDConnection() {
  return obdService;
}
