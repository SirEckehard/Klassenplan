// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useUnsavedSeatingTracker } from '../useUnsavedSeatingTracker';
import type { SeatingArrangement, LockedPositions } from '@/types';
import type { CircleLayout } from '@/types/Circle';

describe('useUnsavedSeatingTracker', () => {
  const mockSeating: SeatingArrangement = [
    [
      {
        id: '1',
        name: 'Alice',
        restless: false,
        shy: false,
        concentrationIssues: false,
        needsFrontSeat: false,
      },
      {
        id: '2',
        name: 'Bob',
        restless: false,
        shy: false,
        concentrationIssues: false,
        needsFrontSeat: false,
      },
    ],
  ];

  const mockCircleLayout: CircleLayout = {
    students: [],
    radius: { horizontal: 150, vertical: 100 },
    center: { x: 150, y: 150 },
    preservedNeighborhoods: 0,
    totalOriginalNeighborhoods: 0,
    newNeighborhoods: 0,
    preservationRate: 0,
    mode: 'preserve-neighbors',
    timestamp: 0,
    neighborhoodPairs: [],
  };

  const mockLockedPositions: LockedPositions = {
    '1': { table: 0, seat: 0 },
  };

  const defaultProps = {
    currentSeating: mockSeating,
    circleLayout: null,
    planName: 'Test Plan',
    lockedPositions: {},
    activeClassId: 'class-1',
  };

  describe('Initialization', () => {
    it('should initialize with no unsaved changes', () => {
      const { result } = renderHook(() =>
        useUnsavedSeatingTracker(defaultProps),
      );

      expect(result.current.hasUnsavedSeatingChanges).toBe(false);
    });

    it('should provide syncSeatingSnapshot function', () => {
      const { result } = renderHook(() =>
        useUnsavedSeatingTracker(defaultProps),
      );

      expect(result.current.syncSeatingSnapshot).toBeInstanceOf(Function);
    });

    it('should handle empty seating arrangement', () => {
      const { result } = renderHook(() =>
        useUnsavedSeatingTracker({
          ...defaultProps,
          currentSeating: [],
        }),
      );

      expect(result.current.hasUnsavedSeatingChanges).toBe(false);
    });
  });

  describe('Change Detection', () => {
    it('should detect changes in seating arrangement', async () => {
      const { result, rerender } = renderHook(
        ({ currentSeating }) =>
          useUnsavedSeatingTracker({
            ...defaultProps,
            currentSeating,
          }),
        { initialProps: { currentSeating: mockSeating } },
      );

      expect(result.current.hasUnsavedSeatingChanges).toBe(false);

      // Change seating
      const newSeating: SeatingArrangement = [
        [
          {
            id: '2',
            name: 'Bob',
            restless: false,
            shy: false,
            concentrationIssues: false,
            needsFrontSeat: false,
          },
          {
            id: '1',
            name: 'Alice',
            restless: false,
            shy: false,
            concentrationIssues: false,
            needsFrontSeat: false,
          },
        ],
      ];

      rerender({ currentSeating: newSeating });

      await waitFor(() =>
        expect(result.current.hasUnsavedSeatingChanges).toBe(true),
      );
    });

    it('should detect changes in circle layout', async () => {
      const { result, rerender } = renderHook(
        ({ circleLayout }) =>
          useUnsavedSeatingTracker({
            ...defaultProps,
            circleLayout,
          }),
        {
          initialProps: { circleLayout: null as CircleLayout | null },
        },
      );

      expect(result.current.hasUnsavedSeatingChanges).toBe(false);

      rerender({ circleLayout: mockCircleLayout });

      await waitFor(() =>
        expect(result.current.hasUnsavedSeatingChanges).toBe(true),
      );
    });

    it('should detect changes in plan name', async () => {
      const { result, rerender } = renderHook(
        ({ planName }) =>
          useUnsavedSeatingTracker({
            ...defaultProps,
            planName,
          }),
        { initialProps: { planName: 'Original Plan' } },
      );

      expect(result.current.hasUnsavedSeatingChanges).toBe(false);

      rerender({ planName: 'Modified Plan' });

      await waitFor(() =>
        expect(result.current.hasUnsavedSeatingChanges).toBe(true),
      );
    });

    it('should detect changes in locked positions', async () => {
      const { result, rerender } = renderHook(
        ({ lockedPositions }) =>
          useUnsavedSeatingTracker({
            ...defaultProps,
            lockedPositions,
          }),
        { initialProps: { lockedPositions: {} } },
      );

      expect(result.current.hasUnsavedSeatingChanges).toBe(false);

      rerender({ lockedPositions: mockLockedPositions });

      await waitFor(() =>
        expect(result.current.hasUnsavedSeatingChanges).toBe(true),
      );
    });

    it('should trim plan name for comparison', () => {
      const { result, rerender } = renderHook(
        ({ planName }) =>
          useUnsavedSeatingTracker({
            ...defaultProps,
            planName,
          }),
        { initialProps: { planName: 'Test Plan' } },
      );

      expect(result.current.hasUnsavedSeatingChanges).toBe(false);

      // Adding whitespace should not trigger change
      rerender({ planName: '  Test Plan  ' });

      expect(result.current.hasUnsavedSeatingChanges).toBe(false);
    });

    it('should not detect changes when values remain the same', () => {
      const { result, rerender } = renderHook(() =>
        useUnsavedSeatingTracker(defaultProps),
      );

      expect(result.current.hasUnsavedSeatingChanges).toBe(false);

      // Rerender with same props
      rerender();

      expect(result.current.hasUnsavedSeatingChanges).toBe(false);
    });
  });

  describe('syncSeatingSnapshot', () => {
    it('should reset unsaved changes flag', async () => {
      const { result, rerender } = renderHook(
        ({ planName }) =>
          useUnsavedSeatingTracker({
            ...defaultProps,
            planName,
          }),
        { initialProps: { planName: 'Original' } },
      );

      // Make a change
      rerender({ planName: 'Modified' });
      await waitFor(() =>
        expect(result.current.hasUnsavedSeatingChanges).toBe(true),
      );

      // Sync snapshot
      act(() => {
        result.current.syncSeatingSnapshot();
      });

      await waitFor(() =>
        expect(result.current.hasUnsavedSeatingChanges).toBe(false),
      );
    });

    it('should sync with custom options', () => {
      const { result } = renderHook(() =>
        useUnsavedSeatingTracker(defaultProps),
      );

      const customSeating: SeatingArrangement = [
        [
          {
            id: '3',
            name: 'Charlie',
            restless: false,
            shy: false,
            concentrationIssues: false,
            needsFrontSeat: false,
          },
        ],
      ];

      act(() => {
        result.current.syncSeatingSnapshot({
          seating: customSeating,
          planName: 'Custom Plan',
        });
      });

      expect(result.current.hasUnsavedSeatingChanges).toBe(false);
    });

    it('should remain stable across re-renders', async () => {
      const { result, rerender } = renderHook(
        ({ planName }) =>
          useUnsavedSeatingTracker({
            ...defaultProps,
            planName,
          }),
        { initialProps: { planName: 'Original' } },
      );

      const firstCallback = result.current.syncSeatingSnapshot;

      rerender({ planName: 'Modified' });

      await waitFor(() =>
        expect(result.current.hasUnsavedSeatingChanges).toBe(true),
      );

      const secondCallback = result.current.syncSeatingSnapshot;

      // Callback should be stable (same reference)
      expect(firstCallback).toBe(secondCallback);
    });
  });

  describe('Class Switching', () => {
    it('should reset state when class changes', async () => {
      const { result, rerender } = renderHook(
        ({ activeClassId, planName }) =>
          useUnsavedSeatingTracker({
            ...defaultProps,
            activeClassId,
            planName,
          }),
        {
          initialProps: {
            activeClassId: 'class-1',
            planName: 'Plan 1',
          },
        },
      );

      // Make changes
      rerender({ activeClassId: 'class-1', planName: 'Modified Plan 1' });
      await waitFor(() =>
        expect(result.current.hasUnsavedSeatingChanges).toBe(true),
      );

      // Switch class
      rerender({ activeClassId: 'class-2', planName: 'Plan 2' });

      // Should reset to no unsaved changes
      await waitFor(() =>
        expect(result.current.hasUnsavedSeatingChanges).toBe(false),
      );
    });

    it('should handle switching from null to defined class', () => {
      const { result, rerender } = renderHook(
        ({ activeClassId }: { activeClassId: string | null }) =>
          useUnsavedSeatingTracker({
            ...defaultProps,
            activeClassId,
          }),
        { initialProps: { activeClassId: null as string | null } },
      );

      expect(result.current.hasUnsavedSeatingChanges).toBe(false);

      rerender({ activeClassId: 'class-1' });

      expect(result.current.hasUnsavedSeatingChanges).toBe(false);
    });

    it('should handle switching from defined to null class', () => {
      const { result, rerender } = renderHook(
        ({ activeClassId }: { activeClassId: string | null }) =>
          useUnsavedSeatingTracker({
            ...defaultProps,
            activeClassId,
          }),
        { initialProps: { activeClassId: 'class-1' as string | null } },
      );

      expect(result.current.hasUnsavedSeatingChanges).toBe(false);

      rerender({ activeClassId: null });

      expect(result.current.hasUnsavedSeatingChanges).toBe(false);
    });

    it('should handle rapid class switching without infinite loops', () => {
      const { result, rerender } = renderHook(
        ({ activeClassId }) =>
          useUnsavedSeatingTracker({
            ...defaultProps,
            activeClassId,
          }),
        { initialProps: { activeClassId: 'class-1' } },
      );

      // Rapidly switch between classes
      for (let i = 2; i <= 10; i++) {
        rerender({ activeClassId: `class-${i}` });
      }

      // Should not throw or hang
      expect(result.current.hasUnsavedSeatingChanges).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined activeClassId', () => {
      const { result } = renderHook(() =>
        useUnsavedSeatingTracker({
          ...defaultProps,
          activeClassId: undefined,
        }),
      );

      expect(result.current.hasUnsavedSeatingChanges).toBe(false);
    });

    it('should handle empty plan name', () => {
      const { result } = renderHook(() =>
        useUnsavedSeatingTracker({
          ...defaultProps,
          planName: '',
        }),
      );

      expect(result.current.hasUnsavedSeatingChanges).toBe(false);
    });

    it('should handle null circle layout', () => {
      const { result } = renderHook(() =>
        useUnsavedSeatingTracker({
          ...defaultProps,
          circleLayout: null,
        }),
      );

      expect(result.current.hasUnsavedSeatingChanges).toBe(false);
    });

    it('should handle rapid state changes without infinite loops', async () => {
      const { result, rerender } = renderHook(
        ({ planName }) =>
          useUnsavedSeatingTracker({
            ...defaultProps,
            planName,
          }),
        { initialProps: { planName: 'Plan 0' } },
      );

      // Rapidly change plan name
      for (let i = 1; i <= 20; i++) {
        rerender({ planName: `Plan ${i}` });
      }

      // Should not throw or hang
      await waitFor(() =>
        expect(result.current.hasUnsavedSeatingChanges).toBe(true),
      );
    });

    it('should handle syncSeatingSnapshot with partial options', () => {
      const { result } = renderHook(() =>
        useUnsavedSeatingTracker(defaultProps),
      );

      act(() => {
        result.current.syncSeatingSnapshot({
          planName: 'Only Plan Name Changed',
        });
      });

      expect(result.current.hasUnsavedSeatingChanges).toBe(false);
    });
  });

  describe('Stability and Performance', () => {
    it('should not cause infinite re-renders', () => {
      let renderCount = 0;

      const { rerender } = renderHook(() => {
        renderCount++;
        return useUnsavedSeatingTracker(defaultProps);
      });

      const initialRenderCount = renderCount;

      // Trigger a rerender
      rerender();

      // Should only render twice (initial + rerender)
      expect(renderCount).toBe(initialRenderCount + 1);
    });

    it('should handle complex seating arrangements efficiently', () => {
      const largeSeating: SeatingArrangement = Array.from(
        { length: 10 },
        (_, tableIndex) =>
          Array.from({ length: 4 }, (_, seatIndex) => ({
            id: `student-${tableIndex}-${seatIndex}`,
            name: `Student ${tableIndex}-${seatIndex}`,
            restless: false,
            shy: false,
            concentrationIssues: false,
            needsFrontSeat: false,
          })),
      );

      const { result } = renderHook(() =>
        useUnsavedSeatingTracker({
          ...defaultProps,
          currentSeating: largeSeating,
        }),
      );

      expect(result.current.hasUnsavedSeatingChanges).toBe(false);
    });
  });
});
