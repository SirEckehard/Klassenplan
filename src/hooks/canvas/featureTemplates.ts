// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { TFunction } from 'i18next';
import type { ClassroomFeatureType } from '@/types';
import {
  WINDOW_WIDTH,
  WINDOW_HEIGHT,
  DOOR_WIDTH,
  DOOR_HEIGHT,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  PODIUM_WIDTH,
  PODIUM_HEIGHT,
  WHITEBOARD_WIDTH,
  WHITEBOARD_HEIGHT,
  CABINET_WIDTH,
  CABINET_HEIGHT,
  DIVIDER_WIDTH,
  DIVIDER_HEIGHT,
} from '@/utils';

/**
 * Geometry and behaviour definition for a room feature, independent of any
 * palette icon/UI. Shared between the sidebar palette (which adds an icon) and
 * the feature operations (copy/paste placement).
 */
export type FeatureTemplate = {
  type: ClassroomFeatureType;
  label: string;
  width: number;
  height: number;
  movable: boolean;
  allowMultiple: boolean;
};

/**
 * Builds the ordered list of feature templates. Labels are resolved via the
 * `generator` namespace translator.
 */
export const buildFeatureTemplates = (
  t: TFunction<'generator'>,
): FeatureTemplate[] => [
  {
    type: 'window',
    label: t('layout.window', 'Fenster'),
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    movable: false,
    allowMultiple: true,
  },
  {
    type: 'door',
    label: t('layout.door', 'Tür'),
    width: DOOR_WIDTH,
    height: DOOR_HEIGHT,
    movable: false,
    allowMultiple: true,
  },
  {
    type: 'board',
    label: t('layout.board', 'Tafel'),
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
    movable: false,
    allowMultiple: false,
  },
  {
    type: 'podium',
    label: t('layout.podium', 'Pult'),
    width: PODIUM_WIDTH,
    height: PODIUM_HEIGHT,
    movable: true,
    allowMultiple: false,
  },
  {
    type: 'whiteboard',
    label: t('layout.whiteboard', 'Whiteboard'),
    width: WHITEBOARD_WIDTH,
    height: WHITEBOARD_HEIGHT,
    movable: false,
    allowMultiple: true,
  },
  {
    type: 'cabinet',
    label: t('layout.cabinet', 'Schrank'),
    width: CABINET_WIDTH,
    height: CABINET_HEIGHT,
    movable: true,
    allowMultiple: true,
  },
  {
    type: 'divider',
    label: t('layout.divider', 'Raumtrenner'),
    width: DIVIDER_WIDTH,
    height: DIVIDER_HEIGHT,
    movable: true,
    allowMultiple: true,
  },
];

/** Builds a lookup map of feature templates keyed by feature type. */
export const buildFeatureTemplateMap = (
  t: TFunction<'generator'>,
): Map<ClassroomFeatureType, FeatureTemplate> => {
  const map = new Map<ClassroomFeatureType, FeatureTemplate>();
  buildFeatureTemplates(t).forEach((item) => map.set(item.type, item));
  return map;
};
