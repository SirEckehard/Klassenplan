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
 * Room features are drawn like a floor plan: a barely tinted fill carrying a
 * strong ink contour, not a pastel block. Projectors wash pastel fills out
 * almost completely, so the contour — not the fill — is what has to survive the
 * beamer. The hues stay recognisable (blue window, brown door, green board) but
 * live at ink darkness instead of candy lightness.
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
    light: { fill: '#f3f1ec', stroke: '#3f3f46', text: '#3f3f46' },
    dark: { fill: '#202327', stroke: '#8c9096', text: '#c9cbcf' },
  },
  door: {
    light: { fill: '#fbf7f0', stroke: '#7c2d12', text: '#7c2d12' },
    dark: { fill: '#2b1810', stroke: '#d08a5f', text: '#e8c4ab' },
  },
  whiteboard: {
    light: { fill: '#ffffff', stroke: '#52525b', text: '#43464b' },
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
