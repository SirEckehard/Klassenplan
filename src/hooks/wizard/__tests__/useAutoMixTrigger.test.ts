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
import { useAutoMixTrigger, type AutoMixConfig } from '../useAutoMixTrigger';
import type { Student, ClassroomScene, MixSettings } from '../../../types';
import type { CircleLayout } from '../../../types/Circle';

describe('useAutoMixTrigger', () => {
  let mockConfig: AutoMixConfig;
  let mockRefineSeatingLocal: Mock<AutoMixConfig['refineSeatingLocal']>;
  let mockRegenerateCircle: Mock<AutoMixConfig['regenerateCircle']>;

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

  const createMockScene = (): ClassroomScene => ({
    totalStudents: 4,
    tables: [
      {
        x: 100,
        y: 100,
        width: 100,
        height: 60,
        rotation: 0,
        seatCount: 4,
        locked: false,
        zIndex: 0,
      },
    ],
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

    mockRefineSeatingLocal = vi.fn();
    mockRegenerateCircle = vi.fn().mockResolvedValue(null);

    mockConfig = {
      step: 3,
      currentSeating: [[createMockStudent('1', 'Alice'), null]],
      classroomScene: createMockScene(),
      mixSettings: {
        avoidPreviousPairs: 0,
        avoidRestlessTogether: 0,
        avoidConcentrationTogether: 0,
        avoidConcentrationNearRestless: 0,
        avoidShyAlone: 0,
        preferGenderMix: 0,
        considerWishPartners: 0,
        peerTutoring: 0,
        preferFrontForNeedsFrontSeat: 0,
      } as MixSettings,
      intelligentMix: true,
      circleLayout: createMockCircleLayout(),
      refineSeatingLocal: mockRefineSeatingLocal,
      regenerateCircle: mockRegenerateCircle,
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Timeout Cleanup', () => {
    it('clears timeout when component unmounts before timeout completes', async () => {
      const { result, unmount } = renderHook(() =>
        useAutoMixTrigger(mockConfig),
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
      const { result } = renderHook(() => useAutoMixTrigger(mockConfig));

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
      expect(mockRegenerateCircle).toHaveBeenCalledWith({
        mode: 'preserve-neighbors',
      });
      expect(mockRegenerateCircle).toHaveBeenCalledTimes(1);
    });

    it('clears timeout when dependencies change before timeout completes', async () => {
      const { result, rerender } = renderHook(
        (props) => useAutoMixTrigger(props),
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
      renderHook(() => useAutoMixTrigger(mockConfig));

      // Trigger WITHOUT circle layout
      const configNoCircle = {
        ...mockConfig,
        circleLayout: null,
      };

      const { result: resultNoCircle } = renderHook(() =>
        useAutoMixTrigger(configNoCircle),
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
      const { result } = renderHook(() => useAutoMixTrigger(mockConfig));

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

  describe('Auto-Refine', () => {
    it('triggers refine when pending and all conditions are met', async () => {
      const { result } = renderHook(() => useAutoMixTrigger(mockConfig));

      await act(async () => {
        result.current.requestAutoRefine();
      });

      // Check that refineSeatingLocal was called (synchronous with fake timers)
      expect(mockRefineSeatingLocal).toHaveBeenCalledWith(
        mockConfig.mixSettings,
        mockConfig.classroomScene,
        {
          triesPerPass: 600,
          passes: 2,
        },
      );
    });

    it('does not trigger refine when intelligentMix is false', async () => {
      const configNoIntelligent = {
        ...mockConfig,
        intelligentMix: false,
      };

      const { result } = renderHook(() =>
        useAutoMixTrigger(configNoIntelligent),
      );

      await act(async () => {
        result.current.requestAutoRefine();
      });

      // Should not call refineSeatingLocal
      expect(mockRefineSeatingLocal).not.toHaveBeenCalled();
    });
  });

  describe('handleMix', () => {
    it('sets shouldRegenerateCircle when circle layout exists', () => {
      const { result } = renderHook(() => useAutoMixTrigger(mockConfig));

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

      const { result } = renderHook(() => useAutoMixTrigger(configNoCircle));

      expect(result.current.shouldRegenerateCircle).toBe(false);

      act(() => {
        result.current.handleMix();
      });

      expect(result.current.shouldRegenerateCircle).toBe(false);
    });
  });
});
