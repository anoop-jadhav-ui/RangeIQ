/**
 * Service Worker Registration Hook
 * Handles SW registration, updates, and provides status
 */

'use client';

import { useEffect, useState, useCallback } from 'react';

interface SWStatus {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  updateAvailable: boolean;
  error: string | null;
}

export function useServiceWorker() {
  const [status, setStatus] = useState<SWStatus>({
    isSupported: false,
    isRegistered: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    updateAvailable: false,
    error: null,
  });

  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Register service worker
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isSupported = 'serviceWorker' in navigator;
    setStatus((s) => ({ ...s, isSupported }));

    if (!isSupported) return;

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        setRegistration(reg);
        setStatus((s) => ({ ...s, isRegistered: true }));

        console.log('[App] Service worker registered:', reg.scope);

        // Check for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setStatus((s) => ({ ...s, updateAvailable: true }));
              console.log('[App] New service worker available');
            }
          });
        });

        // Check for existing updates
        if (reg.waiting) {
          setStatus((s) => ({ ...s, updateAvailable: true }));
        }
      } catch (error) {
        console.error('[App] Service worker registration failed:', error);
        setStatus((s) => ({
          ...s,
          error: error instanceof Error ? error.message : 'Registration failed',
        }));
      }
    };

    registerSW();

    // Listen for controller changes
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[App] Service worker controller changed');
    });
  }, []);

  // Track online status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setStatus((s) => ({ ...s, isOnline: true }));
      console.log('[App] Back online');
    };

    const handleOffline = () => {
      setStatus((s) => ({ ...s, isOnline: false }));
      console.log('[App] Gone offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Apply update
  const applyUpdate = useCallback(() => {
    if (!registration?.waiting) return;

    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  }, [registration]);

  // Request background sync
  const requestSync = useCallback(
    async (tag: string) => {
      if (!registration) return false;

      try {
        await registration.sync.register(tag);
        console.log('[App] Background sync registered:', tag);
        return true;
      } catch (error) {
        console.error('[App] Background sync failed:', error);
        return false;
      }
    },
    [registration]
  );

  // Clear all caches
  const clearCaches = useCallback(async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    console.log('[App] Caches cleared');
  }, []);

  return {
    ...status,
    applyUpdate,
    requestSync,
    clearCaches,
  };
}

/**
 * Offline indicator component
 */
export function OfflineIndicator() {
  const { isOnline } = useServiceWorker();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-ios-orange text-white text-center py-2 text-ios-footnote">
      You&apos;re offline. Some features may be limited.
    </div>
  );
}

/**
 * Update available banner
 */
export function UpdateBanner() {
  const { updateAvailable, applyUpdate } = useServiceWorker();

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 bg-ios-blue text-white rounded-ios-md p-4 shadow-lg flex items-center justify-between">
      <span className="text-ios-subhead">A new version is available!</span>
      <button
        onClick={applyUpdate}
        className="bg-white text-ios-blue px-4 py-2 rounded-ios-sm text-ios-subhead font-medium"
      >
        Update
      </button>
    </div>
  );
}
