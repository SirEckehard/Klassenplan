/**
 * Circle Feature - Public API
 *
 * This barrel export provides a unified API for all circle-related functionality.
 * Import from here for cleaner, feature-oriented imports.
 *
 * @example
 * import { SimpleCircleView, useCircleSeating, CirclePrintView } from '@/features/circle';
 */

// ===== Components =====
export { default as SimpleCircleView } from '@/components/circle/SimpleCircleView';
export { default as CircleControlBar } from '@/components/circle/CircleControlBar';
export { default as CirclePrintView } from '@/components/circle/CirclePrintView';

// ===== Hooks =====
export { useCircleSeating, useCircleActions } from '@/hooks/useCircleSeating';
export { useCircleDragDrop } from '@/hooks/circle/useCircleDragDrop';
export { createCircleStateAdapter } from '@/hooks/circle/useCircleStateAdapter';
export { useEnsureCircleLayout } from '@/hooks/circle/useEnsureCircleLayout';

// ===== Types =====
export type {
  CircleLayout,
  CircleStudentPosition,
  CircleGenerationOptions,
  CircleGenerationStatus,
  NeighborhoodAnalysis,
  NeighborhoodPair,
} from '@/types/Circle';

// Note: CircleSeatingHook and CircleActions interfaces are internal types
// used within useCircleSeating hook

// ===== Algorithm =====
export { CircleSeatingAlgorithm } from '@/utils/algorithm/CircleSeatingAlgorithm';
export {
  analyzeNeighborhoods,
  calculatePreservationRate,
  updateNeighborhoodPreservation,
  calculateNewNeighborhoods,
} from '@/utils/algorithm/neighborhoodAnalysis';
