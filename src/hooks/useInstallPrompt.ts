// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useState, useEffect, useCallback } from 'react';
import { logInfo, logWarn } from '@/utils';
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

// Registered at module scope, not per component: `beforeinstallprompt` fires
// once, early, and has to be captured before any component mounts. The entry
// module imports this file for that side effect alone.
if (typeof window !== 'undefined') {
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

    // A prompt can only be shown once and only from a user gesture; a second
    // call rejects. Either way the event is spent, so the state is reset in
    // `finally` rather than being left claiming the app is still installable.
    const prompt = deferredPrompt;
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      logInfo('User response to install prompt', { outcome }, 'PWA');
    } catch (error) {
      logWarn('Install prompt could not be shown', { error }, 'PWA');
    } finally {
      deferredPrompt = null;
      window.deferredPrompt = undefined;
      setIsInstallable(false);
      listeners.forEach((listener) => listener(false));
    }
  }, []);

  return { isInstallable, triggerInstall };
}
