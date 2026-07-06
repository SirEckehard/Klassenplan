// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Haptic feedback utility for touch interactions
 * Provides tactile feedback for drag and drop operations when supported
 */

export type HapticPattern = 'light' | 'medium' | 'heavy';
export type HapticEvent =
  'dragStart' | 'dragEnd' | 'drop' | 'error' | 'success';

/**
 * Haptic feedback patterns for different interaction types
 */
const HAPTIC_PATTERNS: Record<
  HapticEvent,
  { pattern: HapticPattern; duration?: number }
> = {
  dragStart: { pattern: 'light' },
  dragEnd: { pattern: 'light' },
  drop: { pattern: 'medium' },
  error: { pattern: 'heavy' },
  success: { pattern: 'medium' },
};

/**
 * Check if haptic feedback is supported by the browser
 * Note: iOS Safari does NOT support navigator.vibrate()
 */
export function isHapticFeedbackSupported(): boolean {
  if (typeof navigator === 'undefined') return false;

  // iOS Safari doesn't support vibrate API at all
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as Window & { MSStream?: unknown }).MSStream; // Exclude IE on Windows Phone

  if (isIOS) {
    return false;
  }

  // Check if vibrate API exists and is callable
  if (!('vibrate' in navigator)) {
    return false;
  }

  // Additional check: some browsers have vibrate but it's not a function
  try {
    return typeof navigator.vibrate === 'function';
  } catch {
    return false;
  }
}

/**
 * Trigger haptic feedback for a specific event type
 * Falls back gracefully if haptic feedback is not supported
 */
export function triggerHapticFeedback(event: HapticEvent): void {
  if (!isHapticFeedbackSupported()) {
    return;
  }

  const config = HAPTIC_PATTERNS[event];

  // Convert haptic pattern to vibration duration
  let duration: number;
  switch (config.pattern) {
    case 'light':
      duration = 10;
      break;
    case 'medium':
      duration = 20;
      break;
    case 'heavy':
      duration = 40;
      break;
    default:
      duration = 10;
  }

  try {
    navigator.vibrate(duration);
  } catch {
    // Silently fail if vibration is not supported or fails
  }
}

/**
 * Trigger haptic feedback with custom vibration pattern
 */
export function triggerCustomHapticFeedback(pattern: number | number[]): void {
  if (!isHapticFeedbackSupported()) {
    return;
  }

  try {
    navigator.vibrate(pattern);
  } catch {
    // Silently fail if vibration is not supported or fails
  }
}

/**
 * Stop any ongoing haptic feedback
 */
export function stopHapticFeedback(): void {
  if (!isHapticFeedbackSupported()) {
    return;
  }

  try {
    navigator.vibrate(0);
  } catch {
    // Silently fail
  }
}
