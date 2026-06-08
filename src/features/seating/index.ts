// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Seating Feature - Public API
 *
 * This barrel export provides a unified API for all seating arrangement functionality.
 * Import from here for cleaner, feature-oriented imports.
 *
 * @example
 * import { useSeatingGenerator, generateSeatingPlan, SeatingPlanCanvas } from '@/features/seating';
 */

// ===== Main Components =====
export { default as SeatingPlanGenerator } from '@/components/SeatingPlanGenerator/SeatingPlanGenerator';
export { default as SeatingPlanCanvas } from '@/components/SeatingPlanGenerator/SeatingPlanCanvas';
export { default as SeatingPlanView } from '@/components/SeatingPlanGenerator/SeatingPlanView';
export { default as SeatingPlanEditorView } from '@/components/SeatingPlanGenerator/SeatingPlanEditorView';
export { default as LayoutEditorView } from '@/components/SeatingPlanGenerator/LayoutEditorView';
export { default as SeatingModeToggle } from '@/components/SeatingPlanGenerator/SeatingModeToggle';
export { default as PlanControls } from '@/components/SeatingPlanGenerator/PlanControls';
export { default as ExportSidebar } from '@/components/SeatingPlanGenerator/ExportSidebar';

// ===== Core Hooks =====
export { useSeatingGenerator } from '@/hooks/useSeatingGenerator';
export { useSeatingState } from '@/hooks/useSeatingState';
export { useSeatingPersistence } from '@/hooks/useSeatingPersistence';
export { useSeatingAlgorithm } from '@/hooks/useSeatingAlgorithm';

// Note: Generator sub-hooks are internal implementation details
// and should be accessed through useSeatingGenerator instead

// ===== Algorithm =====
export {
  generateSeatingPlan,
  refineSeatingLocal,
} from '@/utils/algorithm/seatingAlgorithm';

export { calculateSeatingStatistics } from '@/utils/algorithm/seatingStatistics';

// ===== Mix Settings =====
export {
  DEFAULT_MIX_WEIGHTS,
  DEFAULT_NEIGHBOR_WEIGHTS,
  normalizeMixSettings,
  mergeNeighborWeights,
  neutralSettings,
} from '@/utils';

// ===== Types =====
export type { MixSettings, MixResult, LockedPositions } from '@/types';

export type { SeatingState } from '@/hooks/useSeatingState';

// ===== Context =====
export { useSeatingAlgorithmContext } from '@/contexts/seatingPlan/SeatingAlgorithmContext';
export { useStudentManagementContext } from '@/contexts/seatingPlan/StudentManagementContext';
export { useClassroomLayoutContext } from '@/contexts/seatingPlan/ClassroomLayoutContext';
