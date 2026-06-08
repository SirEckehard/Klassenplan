// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Classroom Feature - Public API
 *
 * This barrel export provides a unified API for all classroom layout functionality.
 * Import from here for cleaner, feature-oriented imports.
 *
 * @example
 * import { SceneTable, useCanvasInteraction, CLASSROOM_WIDTH } from '@/features/classroom';
 */

// ===== Scene Components =====
export { default as SceneTable } from '@/components/scene/SceneTable';
export { default as TableSeat } from '@/components/scene/TableSeat';

// ===== Canvas Hooks =====
export { useCanvasInteraction } from '@/hooks/canvas/useCanvasInteraction';
export { useTableOperations } from '@/hooks/canvas/useTableOperations';
export { useTemplateDrag } from '@/hooks/canvas/useTemplateDrag';
export { useFeaturePaletteDrag } from '@/hooks/canvas/useFeaturePaletteDrag';

// ===== Scene Hooks =====
export { useSceneManager } from '@/hooks/scene/useSceneManager';
export { useSceneHistory } from '@/hooks/scene/useSceneHistory';

// ===== Template Hooks =====
export { default as useTemplateManager } from '@/hooks/template/useTemplateManager';

// ===== Types =====
export type {
  ClassroomScene,
  ClassroomTable,
  ClassroomTemplate,
  ClassroomFeature,
  ClassroomFeatureType,
  TableTemplateType,
} from '@/types';

// ===== Constants =====
export {
  CLASSROOM_WIDTH,
  CLASSROOM_HEIGHT,
  GRID_SIZE,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  WINDOW_WIDTH,
  WINDOW_HEIGHT,
  DOOR_WIDTH,
  DOOR_HEIGHT,
  PODIUM_WIDTH,
  PODIUM_HEIGHT,
  TABLE_CORNER_RADIUS,
  FEATURE_CORNER_RADIUS,
  DEFAULT_CLASSROOM_SCENE,
  TABLE_PRESETS,
  getTablePresets,
} from '@/utils';

// ===== Positioning Utils =====
export {
  snapPosition,
  preciseSnap,
  calculateTableGroupBounds,
  positionTablesRelative,
  clampTablePositionWithinBounds,
  screenToSVGCoordinates,
} from '@/utils';

// ===== Canvas Utils =====
export {
  convertClientPointToScene,
  convertClientPointToSvgCoordinates,
  createClientToSceneConverter,
} from '@/utils/canvas/coordinates';
