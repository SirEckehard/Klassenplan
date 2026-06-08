import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  logInfo,
  isFeatureEnabled,
  getFeatureFlagSnapshot,
  withBrowserLocalStorage,
  getBrowserWindow,
} from '@/utils';

/**
 * Hook for managing Performance Dashboard state and interactions
 */
export function usePerformanceDashboard() {
  const [isOpen, setIsOpen] = useState(false);
  const isDevMode = !import.meta.env.PROD;
  const [hasManualOverride, setHasManualOverride] = useState(false);
  const performanceDashboardEnabled = isFeatureEnabled('performanceDashboard');

  const readManualOverride = useCallback(() => {
    return (
      withBrowserLocalStorage<boolean>(
        (storage) => storage.getItem('enablePerformanceDashboard') === 'true',
        false,
      ) ?? false
    );
  }, []);

  useEffect(() => {
    logInfo(
      'Performance dashboard flag evaluated',
      {
        flag: 'performanceDashboard',
        enabled: performanceDashboardEnabled,
        featureFlags: getFeatureFlagSnapshot().map(
          ({ name, value, source }) => ({
            name,
            value,
            source,
          }),
        ),
      },
      'usePerformanceDashboard',
    );
  }, [performanceDashboardEnabled]);

  // Evaluate manual override through localStorage
  useEffect(() => {
    const browserWindow = getBrowserWindow();
    if (!browserWindow) {
      return;
    }

    const evaluateOverride = () => {
      setHasManualOverride(readManualOverride());
    };

    evaluateOverride();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'enablePerformanceDashboard') {
        evaluateOverride();
      }
    };

    browserWindow.addEventListener('storage', handleStorage);

    return () => {
      browserWindow.removeEventListener('storage', handleStorage);
    };
  }, [readManualOverride]);

  // Sync local dashboard state with global dashboard events
  useEffect(() => {
    const browserWindow = getBrowserWindow();
    if (!browserWindow) {
      return undefined;
    }

    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);
    const handleToggle = () => setIsOpen((prev) => !prev);

    browserWindow.addEventListener('openPerformanceDashboard', handleOpen);
    browserWindow.addEventListener('closePerformanceDashboard', handleClose);
    browserWindow.addEventListener('togglePerformanceDashboard', handleToggle);

    return () => {
      browserWindow.removeEventListener('openPerformanceDashboard', handleOpen);
      browserWindow.removeEventListener(
        'closePerformanceDashboard',
        handleClose,
      );
      browserWindow.removeEventListener(
        'togglePerformanceDashboard',
        handleToggle,
      );
    };
  }, []);

  const isDashboardAvailable = useMemo(
    () => performanceDashboardEnabled || hasManualOverride,
    [performanceDashboardEnabled, hasManualOverride],
  );

  const dispatchDashboardEvent = useCallback(
    (type: 'open' | 'close' | 'toggle') => {
      const browserWindow = getBrowserWindow();
      if (!browserWindow) {
        return;
      }

      const eventName =
        type === 'open'
          ? 'openPerformanceDashboard'
          : type === 'close'
            ? 'closePerformanceDashboard'
            : 'togglePerformanceDashboard';

      browserWindow.dispatchEvent(new CustomEvent(eventName));
    },
    [],
  );

  /**
   * Open the performance dashboard
   */
  const openDashboard = useCallback(() => {
    const overrideActive = readManualOverride();
    if (overrideActive !== hasManualOverride) {
      setHasManualOverride(overrideActive);
    }

    if (!(performanceDashboardEnabled || overrideActive)) {
      logInfo(
        'Performance dashboard open skipped because flag is disabled',
        {
          flag: 'performanceDashboard',
          override: overrideActive,
          featureFlags: getFeatureFlagSnapshot().map(
            ({ name, value, source }) => ({
              name,
              value,
              source,
            }),
          ),
        },
        'usePerformanceDashboard',
      );
      return;
    }

    setIsOpen(true);
    dispatchDashboardEvent('open');
    logInfo('Performance Dashboard opened', {}, 'usePerformanceDashboard');
  }, [
    dispatchDashboardEvent,
    hasManualOverride,
    performanceDashboardEnabled,
    readManualOverride,
  ]);

  /**
   * Close the performance dashboard
   */
  const closeDashboard = useCallback(() => {
    setIsOpen(false);
    dispatchDashboardEvent('close');
    logInfo('Performance Dashboard closed', {}, 'usePerformanceDashboard');
  }, [dispatchDashboardEvent]);

  /**
   * Toggle the performance dashboard
   */
  const toggleDashboard = useCallback(() => {
    const overrideActive = readManualOverride();
    if (overrideActive !== hasManualOverride) {
      setHasManualOverride(overrideActive);
    }

    if (!(performanceDashboardEnabled || overrideActive)) {
      logInfo(
        'Performance dashboard toggle ignored because flag is disabled',
        {
          flag: 'performanceDashboard',
          override: overrideActive,
          featureFlags: getFeatureFlagSnapshot().map(
            ({ name, value, source }) => ({
              name,
              value,
              source,
            }),
          ),
        },
        'usePerformanceDashboard',
      );
      return;
    }

    if (isOpen) {
      closeDashboard();
    } else {
      openDashboard();
    }
  }, [
    isOpen,
    openDashboard,
    closeDashboard,
    hasManualOverride,
    performanceDashboardEnabled,
    readManualOverride,
  ]);

  // Keyboard shortcut for opening dashboard (Ctrl/Cmd + Shift + P)
  useEffect(() => {
    const browserWindow = getBrowserWindow();
    if (!browserWindow) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key === 'P'
      ) {
        event.preventDefault();
        toggleDashboard();
      }
    };

    // Only enable in development mode or when explicitly requested
    if (isDashboardAvailable && (isDevMode || hasManualOverride)) {
      browserWindow.addEventListener('keydown', handleKeyDown);
      return () => browserWindow.removeEventListener('keydown', handleKeyDown);
    }
  }, [toggleDashboard, isDevMode, isDashboardAvailable, hasManualOverride]);

  return {
    isOpen,
    isDevMode,
    hasManualOverride,
    isDashboardAvailable,
    openDashboard,
    closeDashboard,
    toggleDashboard,
  };
}

/**
 * Global performance dashboard access for debugging
 * Usage in browser console: window.performanceDashboard.open()
 */
const devBrowserWindow = getBrowserWindow();
if (devBrowserWindow && !import.meta.env.PROD) {
  // Only expose in development
  (
    devBrowserWindow as Window & {
      performanceDashboard?: {
        open: () => void;
        close: () => void;
        toggle: () => void;
      };
    }
  ).performanceDashboard = {
    open: () => {
      const event = new CustomEvent('openPerformanceDashboard');
      devBrowserWindow.dispatchEvent(event);
    },
    close: () => {
      const event = new CustomEvent('closePerformanceDashboard');
      devBrowserWindow.dispatchEvent(event);
    },
    toggle: () => {
      const event = new CustomEvent('togglePerformanceDashboard');
      devBrowserWindow.dispatchEvent(event);
    },
  };
}
