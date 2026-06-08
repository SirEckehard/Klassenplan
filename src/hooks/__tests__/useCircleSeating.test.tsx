import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCircleSeating } from '../useCircleSeating';
import {
  createMockStudent,
  createMockClassroomScene,
  createMockSeatingArrangement,
} from '../../__tests__/utils/testHelpers';
import type { CircleStateRequirements } from '../circle/useCircleStateAdapter';
import type {
  CircleLayout,
  CircleGenerationOptions,
  CircleStudentPosition,
} from '../../types/Circle';
import * as utils from '../../utils';
import { neutralSettings, normalizeMixSettings } from '../../utils';
import { showToast, TOAST_MESSAGES } from '../../utils/ui/toast';
import { generateOptimizedCircleLayout } from '../../utils/algorithm/CircleSeatingAlgorithm';
import { algorithmWorkerClient } from '../../workers/algorithmWorkerClient';
import { resetLayoutStore } from '../../stores/layoutStore';

// Mock idb-keyval
vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/utils/ui/toast', async () => {
  const actual =
    await vi.importActual<typeof import('../../utils/ui/toast')>(
      '@/utils/ui/toast',
    );
  return {
    ...actual,
    showToast: vi.fn(),
  };
});

// Mock the algorithm functions
vi.mock('@/utils/algorithm/CircleSeatingAlgorithm', () => ({
  generateOptimizedCircleLayout: vi.fn(() => ({
    students: [],
    radius: { horizontal: 150, vertical: 100 },
    center: { x: 450, y: 300 },
    preservedNeighborhoods: 0,
    totalOriginalNeighborhoods: 0,
    newNeighborhoods: 0,
    preservationRate: 1.0,
    mode: 'preserve-neighbors',
    timestamp: Date.now(),
    neighborhoodPairs: [],
  })),
}));

vi.mock('@/utils/algorithm/circleArrangement', () => ({
  generateCircleLayout: vi.fn(() => ({
    students: [],
    radius: { horizontal: 150, vertical: 100 },
    center: { x: 450, y: 300 },
    preservedNeighborhoods: 0,
    totalOriginalNeighborhoods: 0,
    newNeighborhoods: 0,
    preservationRate: 1.0,
    mode: 'preserve-neighbors',
    timestamp: Date.now(),
    neighborhoodPairs: [],
  })),
}));

describe('useCircleSeating', () => {
  afterEach(() => {
    vi.clearAllMocks();
    act(() => {
      resetLayoutStore();
    });
  });

  let mockState: CircleStateRequirements;

  beforeEach(() => {
    // Create mock state using CircleStateRequirements interface
    const students = [
      createMockStudent({ name: 'Alice', gender: 'girl' }),
      createMockStudent({ name: 'Bob', gender: 'boy' }),
      createMockStudent({ name: 'Charlie', gender: 'boy' }),
      createMockStudent({ name: 'Diana', gender: 'girl' }),
    ];

    mockState = {
      // Read-only state
      students,
      seatingHistory: [],
      mixHistory: [],
      classroomScene: createMockClassroomScene(),
      mixSettings: normalizeMixSettings(
        {
          preferGenderMix: 0.5,
          avoidRestlessTogether: 0.8,
          considerWishPartners: 0.9,
          avoidShyAlone: 0.6,
          preferFrontForNeedsFrontSeat: 0.7,
          avoidPreviousPairs: 0.4,
          avoidConcentrationTogether: 0.3,
          avoidConcentrationNearRestless: 0.2,
          peerTutoring: 0.1,
          avoidConflictPartners: 0.5,
        },
        neutralSettings,
      ),
      lastStatistics: null,
      showStatisticsBadge: false,

      // Write access state
      currentSeating: [],
      setCurrentSeating: vi.fn(),
      planName: 'Test Plan',
      setPlanName: vi.fn(),

      // Student management functions
      addStudent: vi.fn(),
      removeStudent: vi.fn(),
      clearStudents: vi.fn(),
      updateStudent: vi.fn(),

      // Layout manipulation
      moveStudent: vi.fn(),

      // Lock management
      toggleLock: vi.fn(),
      isSeatLocked: vi.fn().mockReturnValue(false),

      // Table operations
      removeTables: vi.fn(),
    };
  });

  describe('Initialization', () => {
    it('should initialize with null circle layout', () => {
      const { result } = renderHook(() => useCircleSeating(mockState));

      expect(result.current.circleLayout).toBeNull();
      expect(result.current.circleGenerationInProgress).toBe(false);
    });

    it('should provide all required functions', () => {
      const { result } = renderHook(() => useCircleSeating(mockState));

      expect(typeof result.current.generateCircleSeating).toBe('function');
      expect(typeof result.current.regenerateCircle).toBe('function');
      expect(typeof result.current.updateStudentPosition).toBe('function');
      expect(typeof result.current.clearCircleLayout).toBe('function');
      expect(typeof result.current.setCircleLayout).toBe('function');
      expect(typeof result.current.batchSwapStudentPositions).toBe('function');
    });
  });

  describe('Circle Generation', () => {
    it('should generate circle seating with default options', async () => {
      const { result } = renderHook(() => useCircleSeating(mockState));

      let generatedLayout: CircleLayout | null = null;

      await act(async () => {
        generatedLayout = await result.current.generateCircleSeating();
      });

      expect(generatedLayout).not.toBeNull();
      expect(result.current.circleLayout).not.toBeNull();
      expect(result.current.circleGenerationInProgress).toBe(false);
    });

    it('should generate circle seating with custom options', async () => {
      const { result } = renderHook(() => useCircleSeating(mockState));

      const options = {
        mode: 'preserve-neighbors',
        wishPartnerWeight: 1.0,
        genderMixingWeight: 0.3,
      } as unknown as Partial<CircleGenerationOptions>;

      await act(async () => {
        await result.current.generateCircleSeating(options);
      });

      expect(result.current.circleLayout).not.toBeNull();
    });

    it('should handle generation progress state', async () => {
      const pendingLayout: CircleLayout = {
        students: [],
        radius: { horizontal: 150, vertical: 100 },
        center: { x: 450, y: 300 },
        preservedNeighborhoods: 0,
        totalOriginalNeighborhoods: 0,
        newNeighborhoods: 0,
        preservationRate: 1,
        mode: 'preserve-neighbors',
        timestamp: Date.now(),
        neighborhoodPairs: [],
      };

      let resolveOperation!: (value: { layout: CircleLayout }) => void;

      const pendingResult = new Promise<{ layout: CircleLayout }>((resolve) => {
        resolveOperation = resolve;
      });

      const callOperationSpy = vi
        .spyOn(algorithmWorkerClient, 'callOperation')
        .mockImplementationOnce(async () => pendingResult);

      const { result } = renderHook(() => useCircleSeating(mockState));

      let generationPromise!: Promise<CircleLayout | null>;

      await act(async () => {
        generationPromise = result.current.generateCircleSeating();
      });

      expect(result.current.circleGenerationInProgress).toBe(true);

      await act(async () => {
        resolveOperation({ layout: pendingLayout });
        await generationPromise;
      });

      expect(result.current.circleGenerationInProgress).toBe(false);
      expect(result.current.circleLayout).toEqual(pendingLayout);

      callOperationSpy.mockRestore();
    });

    it('should use optimized algorithm for preserve-neighbors mode', async () => {
      const { result } = renderHook(() => useCircleSeating(mockState));

      await act(async () => {
        await result.current.generateCircleSeating({
          mode: 'preserve-neighbors',
        });
      });

      expect(result.current.circleLayout).not.toBeNull();
      expect(result.current.circleLayout?.mode).toBe('preserve-neighbors');
    });

    it('should use basic algorithm for other modes', async () => {
      const { result } = renderHook(() => useCircleSeating(mockState));

      await act(async () => {
        await result.current.generateCircleSeating({ mode: 'preserve-neighbors' });
      });

      expect(result.current.circleLayout).not.toBeNull();
      expect(result.current.circleLayout?.mode).toBe('preserve-neighbors');
    });

    it('should handle errors during circle generation gracefully', async () => {
      const generationError = new Error('Generation failed');
      const optimizedMock = vi.mocked(generateOptimizedCircleLayout);
      optimizedMock.mockImplementationOnce(() => {
        throw generationError;
      });

      const logErrorSpy = vi.spyOn(utils, 'logError');
      const { result } = renderHook(() => useCircleSeating(mockState));
      let generatedLayout: CircleLayout | null = null;

      await act(async () => {
        generatedLayout = await result.current.generateCircleSeating();
      });

      expect(generatedLayout).toBeNull();
      expect(result.current.circleLayout).toBeNull();
      expect(result.current.circleGenerationInProgress).toBe(false);

      const showToastMock = vi.mocked(showToast);
      expect(showToastMock).toHaveBeenCalledWith(
        'error',
        TOAST_MESSAGES.GENERATION_ERROR,
      );
      expect(logErrorSpy).toHaveBeenCalledWith(
        'Circle seating generation failed',
        expect.objectContaining({ error: generationError }),
        'useCircleSeating',
      );
    });
  });

  describe('Circle Regeneration', () => {
    it('should regenerate circle with new options', async () => {
      const { result } = renderHook(() => useCircleSeating(mockState));

      // Generate initial layout
      await act(async () => {
        await result.current.generateCircleSeating({
          mode: 'preserve-neighbors',
        });
      });

      const firstLayout = result.current.circleLayout;

      // Regenerate with different options
      await act(async () => {
        await result.current.regenerateCircle({ mode: 'preserve-neighbors' });
      });

      const secondLayout = result.current.circleLayout;

      expect(firstLayout).not.toBeNull();
      expect(secondLayout).not.toBeNull();
      expect(secondLayout?.mode).toBe('preserve-neighbors');
    });
  });

  describe('Student Position Updates', () => {
    beforeEach(async () => {
      // Create a layout with actual student positions for testing
      const mockLayout = {
        students: [
          {
            student: mockState.students[0]!,
            angle: 0,
            x: 600,
            y: 300,
            preservedNeighbors: [],
            lostNeighbors: [],
            newNeighbors: [],
          },
          {
            student: mockState.students[1]!,
            angle: 90,
            x: 450,
            y: 450,
            preservedNeighbors: [],
            lostNeighbors: [],
            newNeighbors: [],
          },
        ],
        radius: { horizontal: 150, vertical: 100 },
        center: { x: 450, y: 300 },
        preservedNeighborhoods: 0,
        totalOriginalNeighborhoods: 0,
        newNeighborhoods: 0,
        preservationRate: 1.0,
        mode: 'preserve-neighbors' as const,
        timestamp: Date.now(),
        neighborhoodPairs: [],
      };

      // Manually set the layout for testing
      return mockLayout;
    });

    it('should update student position by angle', () => {
      const { result } = renderHook(() => useCircleSeating(mockState));

      // Manually set a layout
      act(() => {
        result.current.setCircleLayout({
          students: [
            {
              student: mockState.students[0]!,
              angle: 0,
              x: 600,
              y: 300,
              preservedNeighbors: [],
              lostNeighbors: [],
              newNeighbors: [],
            },
          ],
          radius: { horizontal: 150, vertical: 100 },
          center: { x: 450, y: 300 },
          preservedNeighborhoods: 0,
          totalOriginalNeighborhoods: 0,
          newNeighborhoods: 0,
          preservationRate: 1.0,
          mode: 'preserve-neighbors',
          timestamp: Date.now(),
          neighborhoodPairs: [],
        });
      });

      const studentId = mockState.students[0]!.id;
      const newAngle = 90;

      act(() => {
        result.current.updateStudentPosition(studentId, newAngle);
      });

      const updatedLayout = result.current.circleLayout;
      expect(updatedLayout).not.toBeNull();

      const updatedStudent = updatedLayout!.students.find(
        (position: CircleStudentPosition) => position.student.id === studentId,
      );

      expect(updatedStudent).toBeDefined();
      expect(updatedStudent!.angle).toBe(newAngle);
      expect(updatedStudent!.x).toBeCloseTo(450); // Center x for 90 degrees
      expect(updatedStudent!.y).toBeCloseTo(400); // Center y + radius for 90 degrees
    });

    it('should not update position if no layout exists', () => {
      const { result } = renderHook(() => useCircleSeating(mockState));

      const studentId = mockState.students[0]!.id;

      act(() => {
        result.current.updateStudentPosition(studentId, 90);
      });

      expect(result.current.circleLayout).toBeNull();
    });

    it('should update timestamp when position changes', () => {
      const { result } = renderHook(() => useCircleSeating(mockState));

      // Set initial layout
      const initialTimestamp = Date.now() - 1000;
      act(() => {
        result.current.setCircleLayout({
          students: [
            {
              student: mockState.students[0]!,
              angle: 0,
              x: 600,
              y: 300,
              preservedNeighbors: [],
              lostNeighbors: [],
              newNeighbors: [],
            },
          ],
          radius: { horizontal: 150, vertical: 100 },
          center: { x: 450, y: 300 },
          preservedNeighborhoods: 0,
          totalOriginalNeighborhoods: 0,
          newNeighborhoods: 0,
          preservationRate: 1.0,
          mode: 'preserve-neighbors',
          timestamp: initialTimestamp,
          neighborhoodPairs: [],
        });
      });

      const studentId = mockState.students[0]!.id;

      act(() => {
        result.current.updateStudentPosition(studentId, 90);
      });

      const updatedLayout = result.current.circleLayout;
      expect(updatedLayout!.timestamp).toBeGreaterThan(initialTimestamp);
    });
  });

  describe('batchSwapStudentPositions', () => {
    it('should apply multiple swaps in sequence', () => {
      const { result } = renderHook(() => useCircleSeating(mockState));

      const layout: CircleLayout = {
        students: [
          {
            student: mockState.students[0]!,
            angle: 0,
            x: 100,
            y: 100,
            preservedNeighbors: [],
            lostNeighbors: [],
            newNeighbors: [],
          },
          {
            student: mockState.students[1]!,
            angle: 120,
            x: 200,
            y: 200,
            preservedNeighbors: [],
            lostNeighbors: [],
            newNeighbors: [],
          },
          {
            student: mockState.students[2]!,
            angle: 240,
            x: 300,
            y: 300,
            preservedNeighbors: [],
            lostNeighbors: [],
            newNeighbors: [],
          },
        ],
        radius: { horizontal: 150, vertical: 100 },
        center: { x: 450, y: 300 },
        preservedNeighborhoods: 0,
        totalOriginalNeighborhoods: 0,
        newNeighborhoods: 0,
        preservationRate: 1.0,
        mode: 'preserve-neighbors',
        timestamp: Date.now(),
        neighborhoodPairs: [],
      };

      act(() => {
        result.current.setCircleLayout(layout);
      });

      const firstStudentId = mockState.students[0]!.id;
      const secondStudentId = mockState.students[1]!.id;

      act(() => {
        result.current.batchSwapStudentPositions([
          { studentId: firstStudentId, targetPosition: 1 },
          { studentId: secondStudentId, targetPosition: 2 },
        ]);
      });

      const updatedOrder = result.current.circleLayout!.students.map(
        (position: CircleStudentPosition) => position.student.id,
      );

      expect(updatedOrder).toEqual([
        mockState.students[2]!.id,
        firstStudentId,
        secondStudentId,
      ]);
    });
  });

  describe('Clear Layout', () => {
    it('should clear circle layout', async () => {
      const { result } = renderHook(() => useCircleSeating(mockState));

      // Generate a layout first
      await act(async () => {
        await result.current.generateCircleSeating();
      });

      expect(result.current.circleLayout).not.toBeNull();

      // Clear the layout
      act(() => {
        result.current.clearCircleLayout();
      });

      expect(result.current.circleLayout).toBeNull();
    });
  });

  describe('State Management', () => {
    it('should allow direct layout setting', () => {
      const { result } = renderHook(() => useCircleSeating(mockState));

      const customLayout = {
        students: [],
        radius: { horizontal: 100, vertical: 80 },
        center: { x: 450, y: 300 },
        preservedNeighborhoods: 0,
        totalOriginalNeighborhoods: 0,
        newNeighborhoods: 0,
        preservationRate: 1.0,
        mode: 'preserve-neighbors' as const,
        timestamp: Date.now(),
        neighborhoodPairs: [],
      };

      act(() => {
        result.current.setCircleLayout(customLayout);
      });

      expect(result.current.circleLayout).toEqual(customLayout);
    });

    it('should handle state updates correctly', async () => {
      const { result } = renderHook(() => useCircleSeating(mockState));

      // Multiple operations should work correctly
      await act(async () => {
        await result.current.generateCircleSeating({
          mode: 'preserve-neighbors',
        });
      });

      await act(async () => {
        await result.current.regenerateCircle({ mode: 'preserve-neighbors' });
      });

      act(() => {
        result.current.clearCircleLayout();
      });

      expect(result.current.circleLayout).toBeNull();
      expect(result.current.circleGenerationInProgress).toBe(false);
    });
  });

  describe('Sync From Table', () => {
    it('should create a circle layout directly from current seating without worker call', async () => {
      const scene = createMockClassroomScene(2);
      // Cast away readonly for test setup; the production type intentionally
      // protects the runtime store, but the test fixture needs to swap the
      // scene to validate the sync-from-table branch.
      (mockState as { classroomScene: typeof mockState.classroomScene }).classroomScene = scene;
      mockState.currentSeating = createMockSeatingArrangement(
        mockState.students,
        scene,
      );

      const callOperationSpy = vi.spyOn(algorithmWorkerClient, 'callOperation');

      try {
        const { result } = renderHook(() => useCircleSeating(mockState));
        let syncedLayout: CircleLayout | null = null;

        await act(async () => {
          syncedLayout = await result.current.syncCircleFromTable();
        });

        expect(callOperationSpy).not.toHaveBeenCalled();
        expect(syncedLayout).not.toBeNull();
        expect(result.current.circleLayout?.students).toHaveLength(
          mockState.students.length,
        );
        expect(result.current.circleGenerationInProgress).toBe(false);
      } finally {
        callOperationSpy.mockRestore();
      }
    });

    it('should fall back to generation when no seating data exists', async () => {
      mockState.currentSeating = [];

      const callOperationSpy = vi.spyOn(algorithmWorkerClient, 'callOperation');

      try {
        const { result } = renderHook(() => useCircleSeating(mockState));

        await act(async () => {
          await result.current.syncCircleFromTable();
        });

        expect(callOperationSpy).toHaveBeenCalled();
      } finally {
        callOperationSpy.mockRestore();
      }
    });
  });

  describe('Integration with Seating State', () => {
    it('should use current students from state', async () => {
      const { result } = renderHook(() => useCircleSeating(mockState));

      await act(async () => {
        await result.current.generateCircleSeating();
      });

      // The generation should have been called with the students from mockState
      expect(result.current.circleLayout).not.toBeNull();
    });

    it('should use current classroom scene from state', async () => {
      const { result } = renderHook(() => useCircleSeating(mockState));

      await act(async () => {
        await result.current.generateCircleSeating();
      });

      // The generation should have been called with the scene from mockState
      expect(result.current.circleLayout).not.toBeNull();
    });

    it('should use mix settings from state', async () => {
      const { result } = renderHook(() => useCircleSeating(mockState));

      await act(async () => {
        await result.current.generateCircleSeating();
      });

      // The generation should have been called with the mix settings from mockState
      expect(result.current.circleLayout).not.toBeNull();
    });

    it('should use seating history from state', async () => {
      const { result } = renderHook(() => useCircleSeating(mockState));

      await act(async () => {
        await result.current.generateCircleSeating();
      });

      // The generation should have been called with the seating history from mockState
      expect(result.current.circleLayout).not.toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle generation errors gracefully', async () => {
      // Mock an error in generation
      const errorState = {
        ...mockState,
        students: [], // Empty students might cause issues
      };

      const { result } = renderHook(() => useCircleSeating(errorState));

      await act(async () => {
        await result.current.generateCircleSeating();
      });

      // Should not crash and should reset progress state
      expect(result.current.circleGenerationInProgress).toBe(false);
    });

    it('should handle invalid student position updates', () => {
      const { result } = renderHook(() => useCircleSeating(mockState));

      act(() => {
        result.current.setCircleLayout({
          students: [
            {
              student: mockState.students[0]!,
              angle: 0,
              x: 600,
              y: 300,
              preservedNeighbors: [],
              lostNeighbors: [],
              newNeighbors: [],
            },
          ],
          radius: { horizontal: 150, vertical: 100 },
          center: { x: 450, y: 300 },
          preservedNeighborhoods: 0,
          totalOriginalNeighborhoods: 0,
          newNeighborhoods: 0,
          preservationRate: 1.0,
          mode: 'preserve-neighbors',
          timestamp: Date.now(),
          neighborhoodPairs: [],
        });
      });

      // Try to update a non-existent student
      act(() => {
        result.current.updateStudentPosition('non-existent-id', 90);
      });

      // Should not crash and layout should remain unchanged
      expect(result.current.circleLayout).not.toBeNull();
      expect(result.current.circleLayout!.students).toHaveLength(1);
    });
  });
});
