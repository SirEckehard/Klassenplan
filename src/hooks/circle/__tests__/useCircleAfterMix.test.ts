// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCircleAfterMix } from '../useCircleAfterMix';
import type { Student } from '@/types';
import type { CircleLayout } from '@/types/Circle';

type CircleAfterMixConfig = Parameters<typeof useCircleAfterMix>[0];

describe('useCircleAfterMix', () => {
  let mockConfig: CircleAfterMixConfig;
  let mockRegenerateCircle: Mock<CircleAfterMixConfig['regenerateCircle']>;

  const createMockStudent = (id: string, name: string): Student => ({
    id,
    name,
    gender: 'diverse',
    restless: false,
    shy: false,
    concentrationIssues: false,
    needsFrontSeat: false,
    performanceStrong: false,
    performanceWeak: false,
    wishPartnerId: null,
  });

  const createMockCircleLayout = (): CircleLayout => ({
    students: [
      {
        student: createMockStudent('1', 'Alice'),
        angle: 0,
        x: 600,
        y: 300,
        preservedNeighbors: [],
        lostNeighbors: [],
        newNeighbors: [],
      },
    ],
    radius: { horizontal: 200, vertical: 150 },
    center: { x: 450, y: 300 },
    preservedNeighborhoods: 0,
    totalOriginalNeighborhoods: 0,
    newNeighborhoods: 0,
    preservationRate: 0,
    mode: 'preserve-neighbors',
    timestamp: Date.now(),
    neighborhoodPairs: [],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockRegenerateCircle = vi.fn().mockResolvedValue(null);

    mockConfig = {
      currentSeating: [[createMockStudent('1', 'Alice'), null]],
      circleLayout: createMockCircleLayout(),
      regenerateCircle: mockRegenerateCircle,
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Timeout Cleanup', () => {
    it('clears timeout when component unmounts before timeout completes', async () => {
      const { result, unmount } = renderHook(() =>
        useCircleAfterMix(mockConfig),
      );

      // Trigger circle regeneration
      act(() => {
        result.current.setShouldRegenerateCircle(true);
      });

      expect(result.current.shouldRegenerateCircle).toBe(true);

      // Unmount BEFORE timeout fires (100ms)
      unmount();

      // Fast-forward time to AFTER timeout should have fired
      act(() => {
        vi.advanceTimersByTime(150);
      });

      // regenerateCircle should NOT have been called (timeout was cleared)
      expect(mockRegenerateCircle).not.toHaveBeenCalled();
    });

    it('allows timeout to complete if component stays mounted', async () => {
      const { result } = renderHook(() => useCircleAfterMix(mockConfig));

      // Trigger circle regeneration
      act(() => {
        result.current.setShouldRegenerateCircle(true);
      });

      expect(result.current.shouldRegenerateCircle).toBe(true);

      // Fast-forward time to AFTER timeout fires (100ms)
      act(() => {
        vi.advanceTimersByTime(150);
      });

      // regenerateCircle should have been called
      expect(mockRegenerateCircle).toHaveBeenCalledWith();
      expect(mockRegenerateCircle).toHaveBeenCalledTimes(1);
    });

    it('clears timeout when dependencies change before timeout completes', async () => {
      const { result, rerender } = renderHook(
        (props) => useCircleAfterMix(props),
        { initialProps: mockConfig },
      );

      // Trigger circle regeneration
      act(() => {
        result.current.setShouldRegenerateCircle(true);
      });

      // Change dependencies (e.g., circleLayout changes)
      const newConfig = {
        ...mockConfig,
        circleLayout: null, // Clear circle layout
      };

      // Rerender with new props BEFORE timeout fires
      rerender(newConfig);

      // Fast-forward time to AFTER timeout should have fired
      act(() => {
        vi.advanceTimersByTime(150);
      });

      // regenerateCircle should NOT have been called (timeout was cleared)
      expect(mockRegenerateCircle).not.toHaveBeenCalled();
    });

    it('only triggers timeout when all conditions are met', async () => {
      renderHook(() => useCircleAfterMix(mockConfig));

      // Trigger WITHOUT circle layout
      const configNoCircle = {
        ...mockConfig,
        circleLayout: null,
      };

      const { result: resultNoCircle } = renderHook(() =>
        useCircleAfterMix(configNoCircle),
      );

      act(() => {
        resultNoCircle.current.setShouldRegenerateCircle(true);
      });

      act(() => {
        vi.advanceTimersByTime(150);
      });

      // Should NOT trigger (no circle layout)
      expect(mockRegenerateCircle).not.toHaveBeenCalled();
    });

    it('resets shouldRegenerateCircle flag after timeout completes', () => {
      const { result } = renderHook(() => useCircleAfterMix(mockConfig));

      // Initial state
      expect(result.current.shouldRegenerateCircle).toBe(false);

      // Trigger circle regeneration
      act(() => {
        result.current.setShouldRegenerateCircle(true);
      });

      expect(result.current.shouldRegenerateCircle).toBe(true);

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(150);
      });

      // Flag should be reset (checked synchronously with fake timers)
      expect(result.current.shouldRegenerateCircle).toBe(false);
    });
  });

  describe('handleMix', () => {
    it('sets shouldRegenerateCircle when circle layout exists', () => {
      const { result } = renderHook(() => useCircleAfterMix(mockConfig));

      expect(result.current.shouldRegenerateCircle).toBe(false);

      act(() => {
        result.current.handleMix();
      });

      expect(result.current.shouldRegenerateCircle).toBe(true);
    });

    it('does not set shouldRegenerateCircle when circle layout is null', () => {
      const configNoCircle = {
        ...mockConfig,
        circleLayout: null,
      };

      const { result } = renderHook(() => useCircleAfterMix(configNoCircle));

      expect(result.current.shouldRegenerateCircle).toBe(false);

      act(() => {
        result.current.handleMix();
      });

      expect(result.current.shouldRegenerateCircle).toBe(false);
    });
  });
});
