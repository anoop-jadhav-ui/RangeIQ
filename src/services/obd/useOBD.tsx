/**
 * React Hook for OBD-II Bluetooth Connection
 * Provides reactive state management for OBD data
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  obdService,
  OBDData,
  OBDConnectionState,
  OBDEventHandlers,
} from './bluetooth';
import { useVehicleStore } from '@/store';

export interface UseOBDResult {
  // Connection state
  isSupported: boolean;
  state: OBDConnectionState;
  isConnected: boolean;
  isConnecting: boolean;

  // Data
  data: OBDData | null;
  lastUpdate: number | null;

  // Actions
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;

  // Error
  error: string | null;
}

export function useOBD(): UseOBDResult {
  const [state, setState] = useState<OBDConnectionState>('disconnected');
  const [data, setData] = useState<OBDData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const dataRef = useRef<Partial<OBDData>>({});
  
  const vehicleStore = useVehicleStore();

  // Check if supported
  const isSupported = typeof window !== 'undefined' && obdService.isSupported();

  // Setup event handlers
  useEffect(() => {
    const handlers: OBDEventHandlers = {
      onConnect: () => {
        console.log('[useOBD] Connected');
        setError(null);
      },
      onDisconnect: () => {
        console.log('[useOBD] Disconnected');
        dataRef.current = {};
        setData(null);
      },
      onData: (newData) => {
        // Merge partial data
        dataRef.current = { ...dataRef.current, ...newData };
        
        // Create complete OBD data object
        const completeData: OBDData = {
          speed: dataRef.current.speed ?? 0,
          batterySoC: dataRef.current.batterySoC ?? 0,
          batteryVoltage: dataRef.current.batteryVoltage ?? 0,
          ambientTemp: dataRef.current.ambientTemp ?? 25,
          batteryTemp: dataRef.current.batteryTemp ?? 25,
          throttle: dataRef.current.throttle ?? 0,
          power: dataRef.current.power ?? 0,
          timestamp: Date.now(),
        };

        setData(completeData);
        setLastUpdate(Date.now());

        // Update vehicle store with OBD data
        if (completeData.batterySoC > 0) {
          vehicleStore.setSoC(completeData.batterySoC);
        }
        if (completeData.batteryTemp !== 25) {
          vehicleStore.setBatteryTemperature(completeData.batteryTemp);
        }

        vehicleStore.setConnected(true);
      },
      onError: (err) => {
        console.error('[useOBD] Error:', err);
        setError(err.message);
      },
      onStateChange: (newState) => {
        setState(newState);
        if (newState === 'disconnected') {
          vehicleStore.setConnected(false);
        }
      },
    };

    obdService.setHandlers(handlers);

    // Get initial state
    setState(obdService.getState());

    return () => {
      // Cleanup on unmount
      obdService.setHandlers({});
    };
  }, [vehicleStore]);

  // Connect function
  const connect = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Web Bluetooth is not supported in this browser');
      return false;
    }

    setError(null);
    
    try {
      return await obdService.connect();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setError(message);
      return false;
    }
  }, [isSupported]);

  // Disconnect function
  const disconnect = useCallback(async (): Promise<void> => {
    await obdService.disconnect();
    dataRef.current = {};
    setData(null);
  }, []);

  return {
    isSupported,
    state,
    isConnected: state === 'connected',
    isConnecting: state === 'connecting' || state === 'initializing',
    data,
    lastUpdate,
    connect,
    disconnect,
    error,
  };
}

/**
 * OBD Status Card Component
 */
export function OBDStatusCard() {
  const {
    isSupported,
    state,
    isConnected,
    isConnecting,
    data,
    connect,
    disconnect,
    error,
  } = useOBD();

  if (!isSupported) {
    return (
      <div className="p-4 bg-ios-gray-6 dark:bg-background-dark-tertiary rounded-ios-md">
        <p className="text-ios-gray-1 text-ios-footnote">
          Web Bluetooth is not supported in this browser. 
          Try Chrome on Android or a desktop browser.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected
                ? 'bg-ios-green'
                : isConnecting
                ? 'bg-ios-orange animate-pulse'
                : 'bg-ios-gray-3'
            }`}
          />
          <span className="text-ios-subhead">
            {isConnected
              ? 'Connected to OBD'
              : isConnecting
              ? 'Connecting...'
              : 'Not Connected'}
          </span>
        </div>

        <button
          onClick={isConnected ? disconnect : connect}
          disabled={isConnecting}
          className={`px-4 py-2 rounded-ios-sm text-ios-subhead font-medium ${
            isConnected
              ? 'bg-ios-red text-white'
              : isConnecting
              ? 'bg-ios-gray-4 text-ios-gray-2'
              : 'bg-ios-blue text-white'
          }`}
        >
          {isConnected ? 'Disconnect' : isConnecting ? 'Connecting...' : 'Connect'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-ios-red text-ios-footnote">{error}</p>
      )}

      {/* Live Data */}
      {isConnected && data && (
        <div className="grid grid-cols-2 gap-3 pt-2">
          <DataItem label="Speed" value={`${data.speed} km/h`} />
          <DataItem label="Battery" value={`${data.batterySoC}%`} />
          <DataItem label="Voltage" value={`${data.batteryVoltage}V`} />
          <DataItem label="Batt Temp" value={`${data.batteryTemp}°C`} />
          <DataItem label="Ambient" value={`${data.ambientTemp}°C`} />
          <DataItem label="Throttle" value={`${data.throttle}%`} />
        </div>
      )}
    </div>
  );
}

function DataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ios-gray-6 dark:bg-background-dark-tertiary rounded-ios-sm p-2">
      <p className="text-ios-caption2 text-ios-gray-1">{label}</p>
      <p className="text-ios-subhead font-medium">{value}</p>
    </div>
  );
}
