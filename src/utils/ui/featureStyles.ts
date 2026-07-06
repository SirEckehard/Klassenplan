// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { ClassroomFeature, ClassroomFeatureType } from '@/types';

type FeatureColorMode = 'light' | 'dark';

type FeaturePalette = {
  fill: string;
  stroke: string;
  text: string;
};

const FEATURE_COLOR_SCHEMES: Record<
  ClassroomFeature['type'],
  Record<FeatureColorMode, FeaturePalette>
> = {
  window: {
    light: { fill: '#dbeafe', stroke: '#1d4ed8', text: '#1e3a8a' },
    dark: { fill: '#1e3a8a', stroke: '#60a5fa', text: '#bfdbfe' },
  },
  board: {
    light: { fill: '#d1fae5', stroke: '#1e3a33', text: '#065f46' },
    dark: { fill: '#1e3a33', stroke: '#10b981', text: '#d1fae5' },
  },
  podium: {
    light: { fill: '#e5e7eb', stroke: '#6b7280', text: '#374151' },
    dark: { fill: '#4b5563', stroke: '#9ca3af', text: '#f3f4f6' },
  },
  door: {
    light: { fill: '#fef3c7', stroke: '#b45309', text: '#92400e' },
    dark: { fill: '#78350f', stroke: '#fbbf24', text: '#fde68a' },
  },
  whiteboard: {
    light: { fill: '#f8fafc', stroke: '#475569', text: '#334155' },
    dark: { fill: '#475569', stroke: '#cbd5e1', text: '#f1f5f9' },
  },
  cabinet: {
    light: { fill: '#ede9fe', stroke: '#6d28d9', text: '#5b21b6' },
    dark: { fill: '#4c1d95', stroke: '#a78bfa', text: '#ede9fe' },
  },
  divider: {
    light: { fill: '#e7e5e4', stroke: '#57534e', text: '#44403c' },
    dark: { fill: '#57534e', stroke: '#d6d3d1', text: '#f5f5f4' },
  },
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
): FeatureStyles => {
  const palette =
    FEATURE_COLOR_SCHEMES[feature.type][isDark ? 'dark' : 'light'];
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
