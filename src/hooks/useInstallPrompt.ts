// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useState, useEffect, useCallback } from 'react';
import { logInfo } from '@/utils';
import { LOCAL_STORAGE_KEYS } from '@/utils/data/storageKeys';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface Window {
    deferredPrompt?: BeforeInstallPromptEvent;
  }
}

// Global state to capture the event irrespective of component lifecycle
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(isInstallable: boolean) => void>();

/**
 * Whether the user closed the install toast. Only the one-shot toast honours
 * this — an explicit install request (footer menu) always goes through.
 */
export function isInstallPromptDismissed(): boolean {
  try {
    return (
      localStorage.getItem(LOCAL_STORAGE_KEYS.pwaInstallDismissed) === 'true'
    );
  } catch {
    // Private mode / storage disabled: treat as "not dismissed".
    return false;
  }
}

/** Remember that the install toast was dismissed. */
export function dismissInstallPrompt(): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.pwaInstallDismissed, 'true');
  } catch {
    // Nothing to persist to — the toast simply reappears next session.
  }
}

if (typeof window !== 'undefined') {
  // Check if event already fired (captured by index.html script)
  if (window.deferredPrompt) {
    deferredPrompt = window.deferredPrompt;
  }

  // Listen for the custom event from index.html
  window.addEventListener('pwa-installable', () => {
    logInfo('App is installable (custom event)', {}, 'PWA');
    if (window.deferredPrompt) {
      deferredPrompt = window.deferredPrompt;
      listeners.forEach((listener) => listener(true));
    }
  });

  document.addEventListener('pwa-installable', () => {
    logInfo('App is installable (custom event on document)', {}, 'PWA');
    if (window.deferredPrompt) {
      deferredPrompt = window.deferredPrompt;
      listeners.forEach((listener) => listener(true));
    }
  });

  // Backup: Listen for the raw event just in case
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    window.deferredPrompt = deferredPrompt;
    logInfo('App is installable (bundled listener)', {}, 'PWA');
    listeners.forEach((listener) => listener(true));
  });

  window.addEventListener('appinstalled', () => {
    logInfo(
      'App was installed (global listener caught appinstalled)',
      {},
      'PWA',
    );
    deferredPrompt = null;
    window.deferredPrompt = undefined;
    listeners.forEach((listener) => listener(false));
  });
}

/**
 * Hook to handle PWA installation prompt
 * Returns whether the app is installable and a function to trigger installation
 */
export function useInstallPrompt() {
  // Initialize with current global state (handles race condition if event fired before mount)
  const [isInstallable, setIsInstallable] = useState<boolean>(!!deferredPrompt);

  useEffect(() => {
    // Subscribe to changes
    const listener = (canInstall: boolean) => {
      setIsInstallable(canInstall);
    };

    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  const triggerInstall = useCallback(async () => {
    if (!deferredPrompt && window.deferredPrompt) {
      deferredPrompt = window.deferredPrompt;
    }
    if (!deferredPrompt) {
      logInfo('Cannot install: no deferred prompt available', {}, 'PWA');
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    logInfo('User response to install prompt', { outcome }, 'PWA');

    // We've used the prompt, and can't use it again, discard it
    deferredPrompt = null;
    window.deferredPrompt = undefined;
    setIsInstallable(false);

    // Notify other components
    listeners.forEach((listener) => listener(false));
  }, []);

  return { isInstallable, triggerInstall };
}
