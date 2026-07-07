// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import { getFeatureStyles } from '@/utils/ui/featureStyles';
import type { ClassroomFeature } from '@/types';

const makeFeature = (
  overrides: Partial<ClassroomFeature> = {},
): ClassroomFeature => ({
  id: 'feature-1',
  type: 'window',
  x: 0,
  y: 0,
  width: 24,
  height: 160,
  anchor: 'left',
  movable: false,
  rotation: 0,
  ...overrides,
});

describe('getFeatureStyles', () => {
  it('returns the type palette by default', () => {
    const light = getFeatureStyles(makeFeature(), false);
    expect(light.fill).toBe('#dbeafe');
    const dark = getFeatureStyles(makeFeature(), true);
    expect(dark.fill).toBe('#1e3a8a');
  });

  it('returns the neutral gray palette when neutral colors are requested', () => {
    const light = getFeatureStyles(makeFeature(), false, undefined, true);
    expect(light).toMatchObject({
      fill: '#e5e7eb',
      stroke: '#6b7280',
      text: '#374151',
    });
    const dark = getFeatureStyles(makeFeature(), true, undefined, true);
    expect(dark).toMatchObject({
      fill: '#4b5563',
      stroke: '#9ca3af',
      text: '#f3f4f6',
    });
    // Every feature type maps to the same neutral palette
    const door = getFeatureStyles(
      makeFeature({ type: 'door' }),
      false,
      undefined,
      true,
    );
    expect(door.fill).toBe('#e5e7eb');
  });

  it('keeps visibility semantics regardless of neutral colors', () => {
    const hiddenByFlag = getFeatureStyles(
      makeFeature(),
      false,
      { window: false },
      true,
    );
    expect(hiddenByFlag.shouldRender).toBe(false);

    const hiddenByFeature = getFeatureStyles(
      makeFeature({ visible: false }),
      false,
      undefined,
      true,
    );
    expect(hiddenByFeature.shouldRender).toBe(false);

    const visible = getFeatureStyles(makeFeature(), false, undefined, true);
    expect(visible.shouldRender).toBe(true);
  });
});
