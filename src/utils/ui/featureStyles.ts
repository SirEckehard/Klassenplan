// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { ClassroomFeature, ClassroomFeatureType } from '@/types';

type FeatureColorMode = 'light' | 'dark';

type FeaturePalette = {
  fill: string;
  stroke: string;
  text: string;
};

/*
 * Room features are drawn like a floor plan: a barely tinted fill inside an
 * ink contour, not a pastel block. Projectors wash pastel fills out almost
 * completely, so the hue lives in the contour and the icon. The hues stay
 * recognisable (blue window, brown door, green board) but live at ink
 * darkness instead of candy lightness. The contour is a hairline everywhere
 * but in the projection's contrast mode (`FeatureStyles.inkContour`).
 */
const FEATURE_COLOR_SCHEMES: Record<
  ClassroomFeature['type'],
  Record<FeatureColorMode, FeaturePalette>
> = {
  window: {
    light: { fill: '#f5f7fb', stroke: '#1e3a8a', text: '#1e3a8a' },
    dark: { fill: '#12203f', stroke: '#6f9bf5', text: '#b9cdfb' },
  },
  board: {
    light: { fill: '#f2f7f3', stroke: '#14532d', text: '#14532d' },
    dark: { fill: '#12261a', stroke: '#57b37a', text: '#b6dcc4' },
  },
  podium: {
    light: { fill: '#f3f1ec', stroke: '#43464b', text: '#43464b' },
    dark: { fill: '#202327', stroke: '#8c9096', text: '#c9cbcf' },
  },
  door: {
    light: { fill: '#fbf7f0', stroke: '#7c2d12', text: '#7c2d12' },
    dark: { fill: '#2b1810', stroke: '#d08a5f', text: '#e8c4ab' },
  },
  whiteboard: {
    light: { fill: '#ffffff', stroke: '#54565a', text: '#43464b' },
    dark: { fill: '#202327', stroke: '#a9acb1', text: '#e4e5e7' },
  },
  cabinet: {
    // Muted wood-brown so the cabinet reads as wooden furniture
    light: { fill: '#f7f3ed', stroke: '#6b5a45', text: '#6b5a45' },
    dark: { fill: '#2a2218', stroke: '#b79a74', text: '#e3d3bb' },
  },
  divider: {
    light: { fill: '#efece6', stroke: '#54565a', text: '#43464b' },
    dark: { fill: '#1c1f23', stroke: '#7c8084', text: '#c2c5c9' },
  },
};

/**
 * Neutral gray palette used when the presentation's color toggle is off,
 * mirroring the neutral student appearance (`STUDENT_COLORS.neutral`).
 * Matches the podium palette, which already is the app's gray ramp.
 */
const NEUTRAL_FEATURE_PALETTE: Record<FeatureColorMode, FeaturePalette> = {
  light: { fill: '#f3f1ec', stroke: '#54565a', text: '#43464b' },
  dark: { fill: '#202327', stroke: '#8c9096', text: '#c9cbcf' },
};

export type FeatureVisibilityFlags = Partial<
  Record<ClassroomFeatureType, boolean>
>;

export const DEFAULT_FEATURE_VISIBILITY: Required<FeatureVisibilityFlags> = {
  board: true,
  window: true,
  door: true,
  podium: true,
  whiteboard: true,
  cabinet: true,
  divider: true,
};

export type FeatureStyles = FeaturePalette & {
  shouldRender: boolean;
  /**
   * Drawn as the backdrop of the seating plan: a smaller icon
   * (`FeatureShape`), so the room recedes behind the students.
   */
  quiet?: boolean;
  /**
   * A contour twice the hairline's width, for the projection's contrast
   * mode, made for a weak beamer.
   */
  inkContour?: boolean;
};

/*
 * On the plan layer the room is the backdrop, not the subject. The elements
 * that orient the plan — the front, the light, the way out — and that
 * criteria refer to keep their hue; the furniture is left as a bare outline
 * in the canvas's own quiet ink.
 */
const ORIENTATION_FEATURES: ReadonlySet<ClassroomFeatureType> = new Set([
  'board',
  'window',
  'door',
]);

/*
 * In the dark the orientation palette above still reads as saturated blocks
 * with bright contours; behind the plan the fill is only a breath of the hue
 * over the canvas and the contour steps down. The light palette's near-white
 * fills already recede, so it stays as it is.
 */
const BACKDROP_ORIENTATION_DARK: Partial<
  Record<ClassroomFeatureType, FeaturePalette>
> = {
  window: { fill: '#1a1f29', stroke: '#3f5684', text: '#6f84ad' },
  board: { fill: '#191f1c', stroke: '#3a6149', text: '#6d947c' },
  door: { fill: '#1f1b19', stroke: '#6e5141', text: '#a0846f' },
};

const BACKDROP_FURNITURE_PALETTE: Record<FeatureColorMode, FeaturePalette> = {
  light: { fill: 'none', stroke: '#c9c4ba', text: '#a29d93' },
  dark: { fill: 'none', stroke: '#44484e', text: '#6f747a' },
};

/*
 * With the colours switched off (the projection's colour switch) the board,
 * the windows and the door are one muted gray — a step above the furniture,
 * so they still orient the plan.
 */
/*
 * On paper the screen's furniture outline is too light: a laser printer
 * dithers it away. The sheet takes a darker ink of the same hue.
 */
const BACKDROP_FURNITURE_PAPER: FeaturePalette = {
  fill: 'none',
  stroke: '#9c978d',
  text: '#8a857c',
};

const BACKDROP_ORIENTATION_NEUTRAL: Record<FeatureColorMode, FeaturePalette> = {
  light: { fill: '#f6f5f2', stroke: '#9a968e', text: '#7a766f' },
  dark: { fill: '#1c1e21', stroke: '#565a60', text: '#868a90' },
};

export const getFeatureStyles = (
  feature: ClassroomFeature,
  isDark: boolean,
  visibilityFlags?: FeatureVisibilityFlags,
  neutralColors = false,
): FeatureStyles => {
  const mode: FeatureColorMode = isDark ? 'dark' : 'light';
  const palette = neutralColors
    ? NEUTRAL_FEATURE_PALETTE[mode]
    : FEATURE_COLOR_SCHEMES[feature.type][mode];
  const resolvedVisibility = {
    ...DEFAULT_FEATURE_VISIBILITY,
    ...(visibilityFlags ?? {}),
  };
  const shouldRender =
    feature.visible !== false && resolvedVisibility[feature.type] !== false;

  return {
    ...palette,
    shouldRender,
  };
};

export type BackdropFeatureOptions = {
  visibility?: FeatureVisibilityFlags;
  /** The projection's colour switch is off: the orientation turns gray. */
  neutralColors?: boolean;
  /** Drawn for print (the export sheet), always on the light palette. */
  paper?: boolean;
};

/**
 * The styles of a room element behind the students — on the plan layer, in
 * the projection, "Wo sitzt wer?", "Wer kommt dran?" and on the export sheet:
 * the board, the windows and the door in their hue (muted in the dark, gray
 * without colours), the furniture as an outline, and every one of them with a
 * smaller icon than on the room layer.
 */
export const getBackdropFeatureStyles = (
  feature: ClassroomFeature,
  isDark: boolean,
  {
    visibility,
    neutralColors = false,
    paper = false,
  }: BackdropFeatureOptions = {},
): FeatureStyles => {
  const dark = isDark && !paper;
  const mode: FeatureColorMode = dark ? 'dark' : 'light';
  const styles = getFeatureStyles(feature, dark, visibility);
  const orientation = neutralColors
    ? BACKDROP_ORIENTATION_NEUTRAL[mode]
    : ((dark ? BACKDROP_ORIENTATION_DARK[feature.type] : undefined) ?? styles);
  const furniture = paper
    ? BACKDROP_FURNITURE_PAPER
    : BACKDROP_FURNITURE_PALETTE[mode];
  const palette = ORIENTATION_FEATURES.has(feature.type)
    ? orientation
    : furniture;
  return {
    fill: palette.fill,
    stroke: palette.stroke,
    text: palette.text,
    shouldRender: styles.shouldRender,
    quiet: true,
  };
};
