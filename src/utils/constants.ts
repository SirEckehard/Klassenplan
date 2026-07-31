// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type {
  ClassroomFeature,
  ClassroomScene,
  TableTemplateType,
  Student,
} from '@/types';
import {
  ActivityIcon,
  SmileyNervousIcon,
  BrainIcon,
  MapPinAreaIcon,
  TrendUpIcon,
  TrendDownIcon,
  type Icon,
} from '@phosphor-icons/react';

export const TABLE_CORNER_RADIUS = 8;
// Features render with sharp corners so they stand apart from the rounded tables.
export const FEATURE_CORNER_RADIUS = 0;

// Shared base dimensions - double is the fundamental unit
const DOUBLE_WIDTH = 55;
const DOUBLE_HEIGHT = 130;

// Derived dimensions based on double as the unit
const SINGLE_HEIGHT = DOUBLE_HEIGHT / 2; // 65 - half of double
const GROUP4_WIDTH = DOUBLE_WIDTH * 2; // 110 - two doubles side by side
const GROUP6_WIDTH = DOUBLE_WIDTH * 3; // 165 - "|=" layout (3 doubles wide)

// Current template presets with unified dimensions
// All dimensions derived from double (55×130) as the base unit:
// - Single: 55×65 (half height of double)
// - Double: 55×130 (base unit)
// - Group4: 110×130 (two doubles side by side)
// - Group6: 165×130 ("|=" layout - three doubles wide)
export const TABLE_PRESETS: Record<
  TableTemplateType,
  { seatCount: number; width: number; height: number }
> = {
  single: { seatCount: 1, width: DOUBLE_WIDTH, height: SINGLE_HEIGHT },
  double: { seatCount: 2, width: DOUBLE_WIDTH, height: DOUBLE_HEIGHT },
  group4: { seatCount: 4, width: GROUP4_WIDTH, height: DOUBLE_HEIGHT },
  group6: { seatCount: 6, width: GROUP6_WIDTH, height: DOUBLE_HEIGHT },
};

// Backward compatibility - always return current presets
export const getTablePresets = () => TABLE_PRESETS;

// Size of the visual grid squares in the canvas
export const GRID_SIZE = 10;

// Size of the grid used for snapping table positions (5px for table dimension compatibility)
export const GRID_SNAP_SIZE = 5;

// Maximum number of students allowed
export const MAX_STUDENTS = 36;

// Maximum number of wish/avoid partners per student
export const MAX_PARTNER_WISHES = 3;

// The name-game quiz needs 4 answer options, so 4 students with photos is the minimum
export const NAME_GAME_MIN_PHOTOS = 4;

// Maximum length for student names to avoid oversized payloads or UI glitches
export const MAX_STUDENT_NAME_LENGTH = 120;

// Overall classroom dimensions (pixels) to accommodate up to 36 students
export const CLASSROOM_WIDTH = 900;
export const CLASSROOM_HEIGHT = 600;

// Wall-mounted features (window, door, board, whiteboard) have no real depth
// in the room, so they all share the same thickness and only resize in
// length along their wall. Must stay >= MIN_ICON_EDGE in FeatureShape so the
// feature icons render.
export const WALL_FEATURE_THICKNESS = 20;

// Dimensions of the classroom board (pixels)
export const BOARD_WIDTH = WALL_FEATURE_THICKNESS;
export const BOARD_HEIGHT = 200;

export const WINDOW_WIDTH = WALL_FEATURE_THICKNESS;
export const WINDOW_HEIGHT = 160;
export const DOOR_WIDTH = 70;
export const DOOR_HEIGHT = WALL_FEATURE_THICKNESS;
const BOARD_WIDTH_DEFAULT = BOARD_WIDTH;
const BOARD_HEIGHT_DEFAULT = BOARD_HEIGHT;
export const PODIUM_WIDTH = 90;
export const PODIUM_HEIGHT = 60;

// Smallest edge a feature can be resized to. Matches MIN_ICON_EDGE in
// FeatureShape so a minimally sized feature still renders its icon.
export const MIN_FEATURE_SIZE = 20;

// Additional room furniture (pixels)
export const WHITEBOARD_WIDTH = WALL_FEATURE_THICKNESS;
export const WHITEBOARD_HEIGHT = 160;
export const CABINET_WIDTH = 100;
export const CABINET_HEIGHT = 40;
export const DIVIDER_WIDTH = 160;
export const DIVIDER_HEIGHT = WALL_FEATURE_THICKNESS;

export const DEFAULT_WINDOW_FEATURES: ClassroomFeature[] = [
  {
    id: 'window-left-1',
    type: 'window',
    visible: true,
    x: 12,
    y: 90,
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    anchor: 'left',
    movable: false,
    label: 'window', // Use getFeatureLabel('window') for translated label
    rotation: 0,
  },
  {
    id: 'window-left-2',
    type: 'window',
    visible: true,
    x: 12,
    y: CLASSROOM_HEIGHT - WINDOW_HEIGHT - 90,
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    anchor: 'left',
    movable: false,
    label: 'window', // Use getFeatureLabel('window') for translated label
    rotation: 0,
  },
];

export const DEFAULT_DOOR_FEATURES: ClassroomFeature[] = [
  {
    id: 'door-main',
    type: 'door',
    visible: true,
    x: CLASSROOM_WIDTH - DOOR_WIDTH - 24,
    y: CLASSROOM_HEIGHT - DOOR_HEIGHT - 16,
    width: DOOR_WIDTH,
    height: DOOR_HEIGHT,
    anchor: 'right',
    movable: false,
    label: 'door', // Use getFeatureLabel('door') for translated label
    rotation: 180,
  },
];

export const DEFAULT_BOARD_FEATURE: ClassroomFeature = {
  id: 'board-main',
  type: 'board',
  visible: true,
  x: CLASSROOM_WIDTH - BOARD_WIDTH_DEFAULT,
  y: (CLASSROOM_HEIGHT - BOARD_HEIGHT_DEFAULT) / 2,
  width: BOARD_WIDTH_DEFAULT,
  height: BOARD_HEIGHT_DEFAULT,
  anchor: 'right',
  movable: false,
  label: 'board', // Use getFeatureLabel('board') for translated label
  rotation: 0,
};

export const DEFAULT_PODIUM_FEATURE: ClassroomFeature = {
  id: 'podium-main',
  type: 'podium',
  visible: true,
  x: Math.round(CLASSROOM_WIDTH / 2 - PODIUM_WIDTH / 2),
  y: Math.round(CLASSROOM_HEIGHT * 0.08),
  width: PODIUM_WIDTH,
  height: PODIUM_HEIGHT,
  anchor: 'free',
  movable: true,
  label: 'podium', // Use getFeatureLabel('podium') for translated label
  rotation: 90,
};

export const DEFAULT_CLASSROOM_SCENE: ClassroomScene = {
  totalStudents: 0,
  tables: [],
  features: [DEFAULT_BOARD_FEATURE],
};

// Predefined student flags with icons and tooltips
// Tooltips explain how mixing handles each special need
export const STUDENT_FLAGS: {
  key: keyof Pick<
    Student,
    | 'restless'
    | 'shy'
    | 'concentrationIssues'
    | 'needsFrontSeat'
    | 'performanceStrong'
    | 'performanceWeak'
  >;
  label: string;
  icon: Icon;
  tooltip: string;
  exclusiveWith?: 'performanceStrong' | 'performanceWeak';
}[] = [
  // Fähigkeiten/Eigenschaften (ändern sich selten)
  {
    key: 'performanceStrong',
    icon: TrendUpIcon,
    label: 'stark',
    tooltip: 'Schüler ist leistungsstark',
    exclusiveWith: 'performanceWeak',
  },
  {
    key: 'performanceWeak',
    icon: TrendDownIcon,
    label: 'schwach',
    tooltip: 'Schüler ist leistungsschwach',
    exclusiveWith: 'performanceStrong',
  },
  {
    key: 'needsFrontSeat',
    label: 'Vordere Plätze',
    icon: MapPinAreaIcon,
    tooltip: 'Benötigt einen festen vorderen Platz',
  },
  // Verhalten (kontextabhängig)
  {
    key: 'restless',
    label: 'unruhig',
    icon: ActivityIcon,
    tooltip: 'Trennt unruhige Schüler voneinander',
  },
  {
    key: 'shy',
    label: 'schüchtern',
    icon: SmileyNervousIcon,
    tooltip: 'Platziert schüchterne Schüler eher neben ruhigen Schülern',
  },
  {
    key: 'concentrationIssues',
    label: 'ablenkbar',
    icon: BrainIcon,
    tooltip:
      'Verteilt leicht ablenkbare Schüler im Raum und trennt sie von unruhigen Schülern',
  },
];

// Maximum number of mix results to retain
export const MIX_HISTORY_LIMIT = 20;

/**
 * Class size from which the list toolbar (search, filter, sort, multi-select)
 * appears. Below this a teacher sees the whole class at a glance and the
 * controls would only add clutter.
 */
export const STUDENT_LIST_TOOLS_THRESHOLD = 8;

// Default number of swap attempts per refinement pass
export const DEFAULT_TRIES_PER_PASS = 600;

// Default number of refinement passes
export const DEFAULT_PASSES = 2;

/**
 * Settings for the manual "optimise further" action.
 *
 * Deliberately more thorough than the pass that runs automatically after a
 * mix: the user asked for it and is waiting for it, so spending a few hundred
 * milliseconds more is the right trade. Each click refines the arrangement
 * already on screen, so repeated clicks keep improving it — that repetition is
 * the intensity control, no slider needed.
 */
export const MANUAL_REFINE_TRIES_PER_PASS = 1800;
export const MANUAL_REFINE_PASSES = 4;
