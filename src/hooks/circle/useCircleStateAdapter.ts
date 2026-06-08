// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { Dispatch, SetStateAction } from 'react';
import type {
  Student,
  SavedPlan,
  MixSettings,
  MixResult,
  ClassroomScene,
  SeatingArrangement,
} from '@/types';
import type { CriterionFulfillment } from '@/utils/algorithm/seatingStatistics';
import type { SeatingState } from '../useSeatingState';

/**
 * Minimal state interface required by Circle seating logic.
 * This adapter pattern explicitly documents which state properties
 * the Circle feature depends on, avoiding hidden no-op functions.
 *
 * Design principles:
 * - Read-only access to shared state (students, scene, settings)
 * - Write access only to circle-specific state (currentSeating, setPlanName)
 * - Explicit documentation of dependencies
 * - Type-safe and easily testable
 *
 * @see useCircleSeating
 */
export interface CircleStateRequirements {
  // Read-only: Student data (not deeply readonly for algorithm compatibility)
  readonly students: Student[];

  // Read-only: Historical data for algorithm optimization (not deeply readonly for algorithm compatibility)
  readonly seatingHistory: SavedPlan[];
  readonly mixHistory: MixResult[]; // MixResult type from parent

  // Read-only: Current classroom configuration
  readonly classroomScene: ClassroomScene;
  readonly mixSettings: MixSettings;

  // Write access: Current seating arrangement
  currentSeating: SeatingArrangement;
  setCurrentSeating: Dispatch<SetStateAction<SeatingArrangement>>;

  // Write access: Plan name
  planName: string;
  setPlanName: Dispatch<SetStateAction<string>>;

  // Read-only: Statistics (optional for circle display)
  readonly lastStatistics: CriterionFulfillment[] | null;
  readonly showStatisticsBadge: boolean;

  // Student management functions (used by Circle UI)
  addStudent: (
    name: string,
    gender?: 'boy' | 'girl' | 'diverse',
    restless?: boolean,
    shy?: boolean,
    concentrationIssues?: boolean,
    needsFrontSeat?: boolean,
  ) => Student;
  removeStudent: (id: string) => void;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  clearStudents: () => void;

  // Layout manipulation (used by Circle drag-and-drop)
  moveStudent: (
    fromTable: number,
    fromSeat: number,
    toTable: number,
    toSeat: number,
  ) => boolean;

  // Lock management (for position constraints)
  toggleLock: (studentId: string, table: number, seat: number) => void;
  isSeatLocked: (table: number, seat: number) => boolean;

  // Table operations (for scene modifications)
  removeTables: (
    indices: number[],
    options?: { skipSeatingUpdate?: boolean },
  ) => void;
}

/**
 * Creates a CircleStateAdapter from the full seating plan store.
 * This adapter function explicitly documents which state properties
 * are passed to the Circle feature, making dependencies transparent.
 *
 * Benefits:
 * - No hidden no-op functions
 * - Type-safe dependency injection
 * - Easy to extend without breaking changes
 * - Clear separation of concerns
 *
 * @param store - Full seating plan store from useSeatingPlan()
 * @returns Minimal state object required by useCircleSeating()
 *
 * @example
 * ```typescript
 * const store = useSeatingPlan();
 * const circleState = createCircleStateAdapter(store);
 * const { circleLayout } = useCircleSeating(circleState, store.currentSeating);
 * ```
 */
type CircleStateSource = SeatingState;

export function createCircleStateAdapter(
  store: CircleStateSource,
): CircleStateRequirements {
  // Return only the properties that Circle needs
  return {
    // Read-only state
    students: store.studentState.students,
    seatingHistory: store.historyState.seatingHistory,
    mixHistory: store.historyState.mixHistory,
    classroomScene: store.sceneState.classroomScene,
    mixSettings: store.algorithmState.mixSettings,
    lastStatistics: store.algorithmState.lastStatistics,
    showStatisticsBadge: store.algorithmState.showStatisticsBadge,

    // Write access to seating and plan name
    currentSeating: store.planState.currentSeating,
    setCurrentSeating: store.planState.setCurrentSeating,
    planName: store.planState.planName,
    setPlanName: store.planState.setPlanName,

    // Student management functions
    addStudent: store.studentState.addStudent,
    removeStudent: store.studentState.removeStudent,
    updateStudent: store.studentState.updateStudent,
    clearStudents: store.studentState.clearStudents,

    // Layout manipulation
    moveStudent: store.studentState.moveStudent,

    // Lock management
    toggleLock: store.algorithmState.toggleLock,
    isSeatLocked: store.algorithmState.isSeatLocked,

    // Table operations
    removeTables: store.sceneState.removeTables,
  };
}
