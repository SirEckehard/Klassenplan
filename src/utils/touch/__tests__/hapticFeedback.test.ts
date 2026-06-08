// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isHapticFeedbackSupported,
  triggerHapticFeedback,
  triggerCustomHapticFeedback,
  stopHapticFeedback,
} from '../hapticFeedback';

// Mock navigator.vibrate
const mockVibrate = vi.fn();

describe('hapticFeedback', () => {
  beforeEach(() => {
    // Reset mocks
    mockVibrate.mockReset();

    // Setup navigator mock
    Object.defineProperty(global, 'navigator', {
      value: {
        vibrate: mockVibrate,
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isHapticFeedbackSupported', () => {
    it('returns true when navigator.vibrate is available', () => {
      expect(isHapticFeedbackSupported()).toBe(true);
    });

    it('returns false when navigator is undefined', () => {
      // @ts-expect-error - Testing undefined navigator
      global.navigator = undefined;
      expect(isHapticFeedbackSupported()).toBe(false);
    });

    it('returns false when vibrate is not available', () => {
      global.navigator = {} as Navigator;
      expect(isHapticFeedbackSupported()).toBe(false);
    });

    it('returns false when vibrate is not a function', () => {
      global.navigator = { vibrate: 'not-a-function' } as any;
      expect(isHapticFeedbackSupported()).toBe(false);
    });
  });

  describe('triggerHapticFeedback', () => {
    it('calls vibrate with correct duration for light feedback', () => {
      triggerHapticFeedback('dragStart');
      expect(mockVibrate).toHaveBeenCalledWith(10);
    });

    it('calls vibrate with correct duration for medium feedback', () => {
      triggerHapticFeedback('drop');
      expect(mockVibrate).toHaveBeenCalledWith(20);
    });

    it('calls vibrate with correct duration for heavy feedback', () => {
      triggerHapticFeedback('error');
      expect(mockVibrate).toHaveBeenCalledWith(40);
    });

    it('calls vibrate for success event', () => {
      triggerHapticFeedback('success');
      expect(mockVibrate).toHaveBeenCalledWith(20);
    });

    it('calls vibrate for dragEnd event', () => {
      triggerHapticFeedback('dragEnd');
      expect(mockVibrate).toHaveBeenCalledWith(10);
    });

    it('does not call vibrate when not supported', () => {
      // @ts-expect-error - Testing undefined navigator
      global.navigator = undefined;
      triggerHapticFeedback('dragStart');
      expect(mockVibrate).not.toHaveBeenCalled();
    });

    it('handles vibrate errors gracefully', () => {
      mockVibrate.mockImplementation(() => {
        throw new Error('Vibration not supported');
      });

      expect(() => triggerHapticFeedback('dragStart')).not.toThrow();
      expect(mockVibrate).toHaveBeenCalledWith(10);
    });
  });

  describe('triggerCustomHapticFeedback', () => {
    it('calls vibrate with custom pattern', () => {
      triggerCustomHapticFeedback([100, 50, 100]);
      expect(mockVibrate).toHaveBeenCalledWith([100, 50, 100]);
    });

    it('calls vibrate with single duration', () => {
      triggerCustomHapticFeedback(200);
      expect(mockVibrate).toHaveBeenCalledWith(200);
    });

    it('does not call vibrate when not supported', () => {
      // @ts-expect-error - Testing undefined navigator
      global.navigator = undefined;
      triggerCustomHapticFeedback(100);
      expect(mockVibrate).not.toHaveBeenCalled();
    });

    it('handles vibrate errors gracefully', () => {
      mockVibrate.mockImplementation(() => {
        throw new Error('Vibration not supported');
      });

      expect(() => triggerCustomHapticFeedback(100)).not.toThrow();
      expect(mockVibrate).toHaveBeenCalledWith(100);
    });
  });

  describe('stopHapticFeedback', () => {
    it('calls vibrate with 0 to stop vibration', () => {
      stopHapticFeedback();
      expect(mockVibrate).toHaveBeenCalledWith(0);
    });

    it('does not call vibrate when not supported', () => {
      // @ts-expect-error - Testing undefined navigator
      global.navigator = undefined;
      stopHapticFeedback();
      expect(mockVibrate).not.toHaveBeenCalled();
    });

    it('handles vibrate errors gracefully', () => {
      mockVibrate.mockImplementation(() => {
        throw new Error('Vibration not supported');
      });

      expect(() => stopHapticFeedback()).not.toThrow();
      expect(mockVibrate).toHaveBeenCalledWith(0);
    });
  });
});
