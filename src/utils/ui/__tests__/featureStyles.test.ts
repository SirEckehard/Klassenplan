// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import {
  getBackdropFeatureStyles,
  getFeatureStyles,
} from '@/utils/ui/featureStyles';
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
    expect(light.fill).toBe('#f5f7fb');
    const dark = getFeatureStyles(makeFeature(), true);
    expect(dark.fill).toBe('#12203f');
  });

  it('returns the neutral gray palette when neutral colors are requested', () => {
    const light = getFeatureStyles(makeFeature(), false, undefined, true);
    expect(light).toMatchObject({
      fill: '#f3f1ec',
      stroke: '#54565a',
      text: '#43464b',
    });
    const dark = getFeatureStyles(makeFeature(), true, undefined, true);
    expect(dark).toMatchObject({
      fill: '#202327',
      stroke: '#8c9096',
      text: '#c9cbcf',
    });
    // Every feature type maps to the same neutral palette
    const door = getFeatureStyles(
      makeFeature({ type: 'door' }),
      false,
      undefined,
      true,
    );
    expect(door.fill).toBe('#f3f1ec');
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

describe('getBackdropFeatureStyles', () => {
  it('keeps the hue of the elements that orient the plan', () => {
    const light = getBackdropFeatureStyles(makeFeature(), false);
    expect(light).toMatchObject({
      fill: '#f5f7fb',
      stroke: '#1e3a8a',
      quiet: true,
    });
  });

  it('mutes that hue in the dark', () => {
    const dark = getBackdropFeatureStyles(makeFeature(), true);
    const full = getFeatureStyles(makeFeature(), true);
    expect(dark.fill).not.toBe(full.fill);
    expect(dark.stroke).not.toBe(full.stroke);
    expect(dark.quiet).toBe(true);
  });

  it('leaves the furniture as an unfilled outline', () => {
    const cabinet = getBackdropFeatureStyles(
      makeFeature({ type: 'cabinet', anchor: 'free' }),
      false,
    );
    expect(cabinet).toMatchObject({ fill: 'none', quiet: true });
    expect(cabinet.stroke).not.toBe(
      getFeatureStyles(makeFeature({ type: 'cabinet' }), false).stroke,
    );
  });

  it('turns the orientation gray without colours, apart from the furniture', () => {
    const window = getBackdropFeatureStyles(makeFeature(), false, {
      neutralColors: true,
    });
    const door = getBackdropFeatureStyles(
      makeFeature({ type: 'door' }),
      false,
      { neutralColors: true },
    );
    const cabinet = getBackdropFeatureStyles(
      makeFeature({ type: 'cabinet', anchor: 'free' }),
      false,
      { neutralColors: true },
    );
    expect(window.stroke).toBe(door.stroke);
    expect(window.fill).not.toBe('none');
    expect(cabinet.fill).toBe('none');
  });

  it('draws the furniture darker on paper, always in the light palette', () => {
    const cabinet = makeFeature({ type: 'cabinet', anchor: 'free' });
    const paper = getBackdropFeatureStyles(cabinet, true, { paper: true });
    const screen = getBackdropFeatureStyles(cabinet, false);
    expect(paper.fill).toBe('none');
    expect(paper.stroke).not.toBe(screen.stroke);
    expect(
      getBackdropFeatureStyles(makeFeature(), true, { paper: true }),
    ).toMatchObject({
      fill: '#f5f7fb',
    });
  });

  it('keeps the visibility of the room layer', () => {
    const hidden = getBackdropFeatureStyles(makeFeature(), false, {
      visibility: { window: false },
    });
    expect(hidden.shouldRender).toBe(false);
  });
});
