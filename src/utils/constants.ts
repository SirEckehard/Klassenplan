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
import type { DataFamily } from '@/utils/ui/designTokens';

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

// Longest name a class, a school year label, a plan or a template may carry.
// The backup import holds to it too, so a field that let more through would
// write a backup that cannot be read back.
export const MAX_NAME_LENGTH = 120;

// Longest free-text note (the class notes); same reason as MAX_NAME_LENGTH.
export const MAX_NOTE_LENGTH = 2000;

// Most rooms one class keeps (decision 0024): its classroom, the labs, the
// gym and the odd exam hall, with room to spare. The backup import holds to
// it too, for the reason given at MAX_NAME_LENGTH.
export const MAX_ROOMS_PER_CLASS = 30;

// Class duties (decision 0028): how many a class names, how long a name may
// be, how many students one duty takes and how many past rounds the rotation
// remembers. The backup import holds to them too.
export const MAX_DUTIES = 12;
export const MAX_DUTY_NAME_LENGTH = 40;
export const MAX_DUTY_COUNT = 10;
export const MAX_DUTY_ROUNDS = 20;

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
const WALL_FEATURE_THICKNESS = 20;

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

// The sample class's windows and door hang on the walls exactly where a drop
// puts them (`placeFixedFeatureBase`): flush with the edge of the room, turned
// for their wall. A teacher cannot place one a few pixels off the wall, so the
// sample room should not show one there either.
export const DEFAULT_WINDOW_FEATURES: ClassroomFeature[] = [
  {
    id: 'window-left-1',
    type: 'window',
    visible: true,
    x: 0,
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
    x: 0,
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
    // On the front wall below the board, upright as a drop turns it there.
    x: CLASSROOM_WIDTH - DOOR_HEIGHT,
    y: CLASSROOM_HEIGHT - DOOR_WIDTH - 25,
    width: DOOR_HEIGHT,
    height: DOOR_WIDTH,
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
  /** The pedagogical family the flag speaks in, wherever it is shown. */
  family: DataFamily;
  exclusiveWith?: 'performanceStrong' | 'performanceWeak';
}[] = [
  // Fähigkeiten/Eigenschaften (ändern sich selten)
  {
    key: 'performanceStrong',
    family: 'learning',
    icon: TrendUpIcon,
    label: 'Leistungsstark',
    tooltip: 'Schüler ist leistungsstark',
    exclusiveWith: 'performanceWeak',
  },
  {
    key: 'performanceWeak',
    family: 'learning',
    icon: TrendDownIcon,
    label: 'Leistungsschwach',
    tooltip: 'Schüler ist leistungsschwach',
    exclusiveWith: 'performanceStrong',
  },
  {
    key: 'needsFrontSeat',
    family: 'space',
    label: 'Vordere Plätze',
    icon: MapPinAreaIcon,
    tooltip: 'Benötigt einen festen vorderen Platz',
  },
  // Verhalten (kontextabhängig)
  {
    key: 'restless',
    family: 'behavior',
    label: 'Unruhig',
    icon: ActivityIcon,
    tooltip: 'Trennt unruhige Schüler voneinander',
  },
  {
    key: 'shy',
    family: 'social',
    label: 'Schüchtern',
    icon: SmileyNervousIcon,
    tooltip: 'Platziert schüchterne Schüler eher neben ruhigen Schülern',
  },
  {
    key: 'concentrationIssues',
    family: 'behavior',
    label: 'Ablenkbar',
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

/**
 * How closely two seats are related, for every criterion that asks who sits
 * near whom (decision 0031): the seat partner fully, the seat round the corner
 * or across a group table strongly, the seat directly beside at the next table
 * a little more than the rest of a group table, and the seat directly in
 * front or behind least. One table, read by the mixing and by the fulfilment
 * the teacher sees, so the two cannot disagree.
 */
export const RELATION_WEIGHTS = {
  partner: 1,
  corner: 0.8,
  opposite: 0.8,
  table: 0.4,
  beside: 0.5,
  ahead: 0.3,
  behind: 0.3,
} as const;

/**
 * Widest gap, in pixels of the 900×600 room, between seats of two tables that
 * still counts as "directly beside": about 45 cm, as a double desk is 55 px
 * deep. A wider gap is an aisle. "Neu einrichten" leaves 15 to 60 px.
 */
export const ADJACENT_GAP = 40;

/**
 * Widest gap between a seat and the seat directly in front of or behind it at
 * the next table that still counts as the next row: the room a chair takes,
 * about 75 cm.
 */
export const ROW_GAP = 70;

/**
 * Multipliers of the criterion model (`utils/algorithm/model`), on top of the
 * weight a criterion is set to. The construction, the refinement and the
 * fulfilment all read them, so a change here changes all three alike.
 */
export const CRITERION_WEIGHTS = {
  /** Factor per place in a wish list: the first wish counts most */
  wishRank: [1, 0.85, 0.7],
  /** Factor per place in a distance list */
  avoidRank: [1, 0.9, 0.8],
  /** A distance wish weighs twice a wish of the same level: avoid wins */
  avoid: 2,
  /**
   * How much a repetition of two students who wish each other counts, while
   * wishes count (decision 0033): half, so a friendship holds longer than a
   * one-sided wish, which counts like any pair.
   */
  mutualWishRepetition: 0.5,
  gender: {
    /** Per student by which a gender holds more than half of a table */
    tableExcess: 2,
    /** Two of the same gender as seat partners or directly beside */
    samePair: 0.5,
  },
  /**
   * A student needing a front seat, by the rows behind the front rows
   * (`model/frontPool.ts`): the row below "Sehr wichtig" still counts as a
   * front seat costs `toleratedRow`, the first row that no longer does costs
   * 1 and every row behind it `furtherRow` more.
   */
  front: { toleratedRow: 0.15, furtherRow: 0.25 },
  /** Small students to the front, tall ones to the back */
  height: 3,
  /** A student needing language support beside a strong speaker */
  languageSupport: 0.5,
  socialRole: {
    /** Per further student of the same role at a table */
    leaderCluster: 0.5,
    socialHubCluster: 0.5,
    lonerCluster: 0.6,
    mediatorSpread: 0.3,
    /** A loner at a table with a mediator or a social hub */
    lonerSupport: 0.4,
    /** A leader at a table with a mediator */
    leaderWithMediator: 0.3,
  },
} as const;
