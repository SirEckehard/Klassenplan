// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { Icon } from '@phosphor-icons/react';
import {
  ChalkboardSimpleIcon,
  DoorIcon,
  LecternIcon,
  LockersIcon,
  PanoramaIcon,
  PresentationIcon,
  WallIcon,
} from '@phosphor-icons/react';
import type { ClassroomFeatureType } from '@/types';

/**
 * Single source of truth for the visual identity of classroom features:
 * the icon glyph drawn inside the feature rect (canvas, presentation, PDF
 * export) and reused by the feature palette.
 */
export const FEATURE_TYPE_ICONS: Record<ClassroomFeatureType, Icon> = {
  window: PanoramaIcon,
  door: DoorIcon,
  board: ChalkboardSimpleIcon,
  podium: LecternIcon,
  whiteboard: PresentationIcon,
  cabinet: LockersIcon,
  divider: WallIcon,
};

/** i18n keys (namespace `generator`) for the feature type names. */
export const FEATURE_TYPE_LABEL_KEYS: Record<ClassroomFeatureType, string> = {
  window: 'layout.window',
  door: 'layout.door',
  board: 'layout.board',
  podium: 'layout.podium',
  whiteboard: 'layout.whiteboard',
  cabinet: 'layout.cabinet',
  divider: 'layout.divider',
};

/** Display order for feature visibility toggles and availability checks. */
export const FEATURE_TYPES: readonly ClassroomFeatureType[] = [
  'board',
  'whiteboard',
  'window',
  'door',
  'podium',
  'cabinet',
  'divider',
];

/**
 * Per-type key suffix for the visibility toggles. Doubles as the i18n key
 * suffix (`editor.showBoard` / `export.showBoard`) and as the legacy
 * localStorage key that stored the flag before it moved into the
 * `spg.featureVisibility` record.
 */
export const FEATURE_VISIBILITY_TOGGLE_KEYS: Record<
  ClassroomFeatureType,
  string
> = {
  board: 'showBoard',
  window: 'showWindows',
  door: 'showDoor',
  podium: 'showPodium',
  whiteboard: 'showWhiteboard',
  cabinet: 'showCabinet',
  divider: 'showDivider',
};
