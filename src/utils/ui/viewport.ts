// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
export interface ViewportMetrics {
  width: number;
  height: number;
  offsetTop: number;
  offsetLeft: number;
}

const NO_WINDOW_METRICS: ViewportMetrics = {
  width: 0,
  height: 0,
  offsetTop: 0,
  offsetLeft: 0,
};

/**
 * Retrieve viewport metrics with graceful fallbacks for non-supporting environments.
 */
export function getViewportMetrics(): ViewportMetrics {
  if (typeof window === 'undefined') {
    return NO_WINDOW_METRICS;
  }

  const viewport = window.visualViewport;
  if (viewport) {
    return {
      width: viewport.width ?? window.innerWidth ?? 0,
      height: viewport.height ?? window.innerHeight ?? 0,
      offsetTop: viewport.offsetTop ?? 0,
      offsetLeft: viewport.offsetLeft ?? 0,
    };
  }

  return {
    width: window.innerWidth ?? 0,
    height: window.innerHeight ?? 0,
    offsetTop: 0,
    offsetLeft: 0,
  };
}

/**
 * Subscribe to visual viewport events with automatic cleanup.
 * Returns a noop cleanup when the API is not available.
 */
export function onVisualViewport(
  event: 'resize' | 'scroll',
  handler: (event: Event) => void,
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const viewport = window.visualViewport;
  if (!viewport) {
    return () => {};
  }

  viewport.addEventListener(event, handler);
  return () => viewport.removeEventListener(event, handler);
}

/**
 * Check whether the current environment supports the VisualViewport API.
 */
export function hasVisualViewport(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return Boolean(window.visualViewport);
}
