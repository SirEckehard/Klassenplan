// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Public Utils API
 *
 * This is the central export point for all utility functions.
 * Only functions intended for external use are exported here.
 *
 * Usage:
 * @example
 * // Preferred: Import from central utils
 * import { generateId, deepClone, logError } from '@/utils'
 *
 * // Avoid: Direct imports from submodules
 * import { generateId } from '@/utils/id'  // ❌ Not recommended
 */

// ===== Core Utilities =====
export { generateId } from './id';
export { deepClone } from './deepClone';
export { stableStringify } from './jsonUtils';

// ===== Feature Flags =====
export {
  featureFlags,
  featureFlagDetails,
  isFeatureEnabled,
  getFeatureFlagSnapshot,
  getRuntimeEnvironment,
} from '@/config/featureFlags';
export type {
  FeatureFlagName,
  FeatureFlagResolution,
  DeploymentEnvironment,
} from '@/config/featureFlags';

// ===== Logging =====
export { logInfo, logWarn, logError, logDebug } from './logger';

// ===== File Utilities =====
export {
  downloadBlob,
  downloadJson,
  type DownloadBlobSource,
} from './downloads';

// ===== Browser Environment =====
export {
  isBrowserEnvironment,
  getBrowserWindow,
  withBrowserWindow,
  hasBrowserLocalStorage,
  getBrowserLocalStorage,
  withBrowserLocalStorage,
  getBrowserDocument,
} from './browserEnvironment';

// ===== Crypto =====
export {
  webCrypto,
  isWebCryptoAvailable,
  WebCryptoUnavailableError,
} from './crypto/webCrypto';

// ===== Version & Changelog =====
export { getAppVersion } from './version';
export {
  getLatestChangelogEntry,
  CHANGELOG_ROUTE,
  type LatestChangelogEntry,
  type ChangelogSection,
} from './changelog';

// ===== Error Handling =====
export { errorHandlers } from './errorHandling';

// ===== Constants =====
export {
  MAX_STUDENTS,
  MAX_PARTNER_WISHES,
  MAX_STUDENT_NAME_LENGTH,
  CLASSROOM_WIDTH,
  CLASSROOM_HEIGHT,
  GRID_SIZE,
  GRID_SNAP_SIZE,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  WINDOW_WIDTH,
  WINDOW_HEIGHT,
  DOOR_WIDTH,
  DOOR_HEIGHT,
  DEFAULT_TRIES_PER_PASS,
  DEFAULT_PASSES,
  MANUAL_REFINE_TRIES_PER_PASS,
  MANUAL_REFINE_PASSES,
  PLACEMENT_SCORE_WEIGHTS,
  TABLE_SCORE_WEIGHTS,
  REFINEMENT_TABLE_SELECTION,
  DEFAULT_CLASSROOM_SCENE,
  DEFAULT_WINDOW_FEATURES,
  DEFAULT_DOOR_FEATURES,
  DEFAULT_BOARD_FEATURE,
  DEFAULT_PODIUM_FEATURE,
  PODIUM_WIDTH,
  PODIUM_HEIGHT,
  WHITEBOARD_WIDTH,
  WHITEBOARD_HEIGHT,
  CABINET_WIDTH,
  CABINET_HEIGHT,
  DIVIDER_WIDTH,
  DIVIDER_HEIGHT,
  MIN_FEATURE_SIZE,
  WALL_FEATURE_THICKNESS,
  MIX_HISTORY_LIMIT,
  STUDENT_LIST_TOOLS_THRESHOLD,
  NAME_GAME_MIN_PHOTOS,
  getTablePresets,
  TABLE_PRESETS,
  STUDENT_FLAGS,
  TABLE_CORNER_RADIUS,
  FEATURE_CORNER_RADIUS,
} from './constants';

// ===== Mix Settings =====
export {
  DEFAULT_MIX_WEIGHTS,
  DEFAULT_NEIGHBOR_WEIGHTS,
  SCALAR_MIX_SETTING_KEYS,
  mergeNeighborWeights,
  normalizeMixSettings,
  neutralSettings,
} from './mixSettings';

// ===== Seating Utilities =====
export { countStudents, tableCount, seatsPerTable } from './plan';
export { addSeatingForTables } from './seating/seatingOperations';

// ===== Student Sync =====
export {
  createStudentSignature,
  createStudentSyncMap,
  syncStudentReference,
} from './studentSync';
export type { StudentSyncMap, StudentSyncEntry } from './studentSync';

// ===== Student Partner Utilities =====
export {
  getWishPartnerIds,
  getAvoidPartnerIds,
  hasWishPartners,
  hasAvoidPartners,
  wishesToSitWith,
  wantsToAvoid,
  isMutualWish,
  hasWishAvoidConflict,
} from './student/partnerUtils';

// ===== Name Formatting =====
export {
  getDisplayName,
  getDisplayNameForMode,
  applyNameDisplayMode,
  countAmbiguousFirstNames,
  getTooltipName,
  isNameTruncated,
  getNamePreview,
} from './nameFormatting';
export type { NameDisplayMode } from './nameFormatting';

// ===== Plan Names =====
export { createTimestampPlanName } from './planNames';

// ===== Date & Time Formatting =====
export {
  formatDate,
  formatDateAndTime,
  formatDateTime,
  formatDayMonth,
  formatLongDate,
  formatStoredDate,
  formatTime,
  formatTimeWithSeconds,
  resolveLocale,
  toIsoDate,
} from './dateTimeFormat';

// ===== Math Utilities =====
export { countSeats } from './math/scene';
export { hasShapeMismatch } from './math/scene';
export { angleToPosition } from './math/circleGeometry';
export {
  normalizeRotation,
  snapRotationAngle,
  getRotatedAabbHalfExtents,
  DEFAULT_ROTATION_SNAP_STEP,
  DEFAULT_ROTATION_SNAP_TOLERANCE,
} from './math/rotation';

// ===== Touch & Input Handling =====
export { triggerHapticFeedback } from './touch/hapticFeedback';
export { isFormElementFocused } from './focus';

// ===== Canvas Utilities =====
export {
  convertClientPointToScene,
  convertClientPointToSvgCoordinates,
  createClientToSceneConverter,
} from './canvas/coordinates';
export {
  clampCenterToRoom,
  getFeatureResizeHandles,
  getResizeCursor,
  resizeFeature,
  type FeatureFrame,
  type FeatureResizeHandle,
} from './canvas/featureResize';
export {
  ALIGNMENT_GUIDE_EPSILON,
  ALIGNMENT_GUIDE_TOLERANCE,
  applyAlignmentToDelta,
  computeAlignmentSnap,
  getGroupAabb,
  getRotatedAabb,
  selectAlignmentTargets,
  type AlignmentGuide,
  type AlignmentGuideKind,
  type AlignmentRect,
  type AlignmentSnapResult,
} from './canvas/alignmentGuides';

// ===== SEO =====
export { getRouteMetadata } from './seo/routeMetadata';

// ===== Validation =====
export {
  stringValidation,
  numberValidation,
  emailValidation,
} from './validation/schemas';

// ===== Criteria Validation =====
export {
  isCriterionAvailable,
  getAllCriteriaAvailability,
  type CriterionAvailability,
} from './criteriaValidation';

// ===== Table positioning (geometry, see utils/math) =====
export {
  calculateTableGroupBounds,
  positionTablesRelative,
  calculateDragDelta,
  applyDragMovement,
  getRotationAdjustedDimensions,
  getRotationAdjustedPosition,
  clampTablePositionWithinBounds,
} from './math/tablePositioning';

// ===== Shortcuts =====
export {
  shortcutContextLabels,
  shortcutMap,
  type ShortcutContext,
  type Shortcut,
} from './shortcuts';

// ===== Toasts =====
export { showToast, TOAST_MESSAGES } from './ui/toast';
export { announcePlanSaved } from './ui/planAnnouncements';
export {
  getStatisticStatus,
  getStatisticStatusMeta,
  STATISTIC_STATUS_THRESHOLDS,
  type StatisticStatus,
} from './ui/statisticsStatus';
export {
  buildSeatHighlightLookup,
  getSeatHighlight,
  type SeatHighlightLookup,
} from './ui/statisticsHighlight';

// ===== UI Design Tokens =====
export {
  panelSurfaceClass,
  cardSurfaceClass,
  listContainerClass,
  optionCardClass,
  optionRadioClass,
  optionCardTitleClass,
  optionCardHintClass,
  badgeSurfaceClass,
  primaryButtonClass,
  secondaryButtonClass,
  neutralButtonClass,
  dangerButtonClass,
  successButtonClass,
  warningButtonClass,
  iconButtonClass,
  quietIconButtonClass,
  dangerIconButtonClass,
  successIconButtonClass,
  loadingIconButtonClass,
  mutedIconButtonClass,
  inputFieldClass,
  selectFieldClass,
  textareaFieldClass,
  pillTabBaseClass,
  pillTabActiveClass,
  pillTabInactiveClass,
  menuSurfaceClass,
  touchMenuSurfaceClass,
  floatingStatusClass,
  canvasFrameClass,
  toastSurfaceClass,
  toastAccentClass,
  toastIconClass,
} from './ui/designTokens';
export { calculateSeatLabelFontSize } from './ui/textScaling';
export {
  getSidebarSurfaceClasses,
  getSidebarIconClasses,
  getSidebarIndicatorClasses,
  type SidebarTone,
} from './ui/sidebarButtonStyles';
export {
  getViewportMetrics,
  onVisualViewport,
  hasVisualViewport,
  type ViewportMetrics,
} from './ui/viewport';

// ===== CSV Utilities =====
export { downloadCsvTemplate } from './csv/csvTemplateDownload';

// ===== Note =====
// Algorithm, data, and UI utilities are intentionally kept separate
// as they have their own namespaces:
// - '@/utils/algorithm' - Seating algorithm functions
// - '@/utils/data' - Data persistence and backup
// - '@/utils/ui' - UI-specific utilities (toasts, dialogs, etc.)
