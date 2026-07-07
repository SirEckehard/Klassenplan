// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FeatureShape from '../FeatureShape';
import { getFeatureStyles } from '@/utils/ui';
import type { ClassroomFeature } from '@/types';

const makeFeature = (
  overrides: Partial<ClassroomFeature> = {},
): ClassroomFeature => ({
  id: 'feature-1',
  type: 'podium',
  x: 100,
  y: 50,
  width: 90,
  height: 60,
  anchor: 'free',
  movable: true,
  rotation: 0,
  ...overrides,
});

const renderShape = (
  feature: ClassroomFeature,
  props: Partial<React.ComponentProps<typeof FeatureShape>> = {},
  isDark = false,
) =>
  render(
    <svg>
      <FeatureShape
        feature={feature}
        styles={getFeatureStyles(feature, isDark)}
        {...props}
      />
    </svg>,
  );

const getGroup = (container: HTMLElement) =>
  container.querySelector('[data-feature-id="feature-1"]') as SVGGElement;

describe('FeatureShape', () => {
  it('renders a centered icon as nested svg instead of a text label', () => {
    const { container } = renderShape(makeFeature({ label: 'Pult' }));
    const group = getGroup(container);
    expect(group).toBeTruthy();
    expect(group.getAttribute('role')).toBe('img');
    expect(group.querySelector('title')).toBeTruthy();
    // No text label rendered anymore
    expect(group.querySelector('text')).toBeNull();
    // Phosphor icon renders as a nested <svg>
    const icon = group.querySelector('svg');
    expect(icon).toBeTruthy();
    // Uniform 16px icon, centered at (45, 30)
    expect(icon?.getAttribute('width')).toBe('16');
    expect(icon?.getAttribute('x')).toBe(String(90 / 2 - 8));
    expect(icon?.getAttribute('y')).toBe(String(60 / 2 - 8));
  });

  it('skips the icon for very thin features like the room divider', () => {
    const { container } = renderShape(
      makeFeature({ type: 'divider', width: 160, height: 12 }),
    );
    const group = getGroup(container);
    expect(group.querySelector('rect')).toBeTruthy();
    expect(group.querySelector('svg')).toBeNull();
  });

  it('keeps the icon upright by cancelling feature and scene rotation', () => {
    const { container } = renderShape(makeFeature({ rotation: 90 }), {
      extraIconRotation: 90,
    });
    const group = getGroup(container);
    const iconWrapper = group.querySelector('g[pointer-events="none"]');
    expect(iconWrapper?.getAttribute('transform')).toBe('rotate(180 45 30)');
  });

  it('does not counter-rotate edge-anchored features without rotation', () => {
    const { container } = renderShape(
      makeFeature({ anchor: 'left', rotation: 45 }),
    );
    const group = getGroup(container);
    const iconWrapper = group.querySelector('g[pointer-events="none"]');
    // Anchored features ignore their rotation, so no icon transform is needed
    expect(iconWrapper?.getAttribute('transform')).toBeNull();
  });

  it('applies the dark palette fill to the rect', () => {
    const feature = makeFeature();
    const { container } = renderShape(feature, {}, true);
    const rect = getGroup(container).querySelector('rect');
    expect(rect?.getAttribute('fill')).toBe('#4b5563');
  });

  it('always draws the palette frame and switches to the selection color when active', () => {
    const feature = makeFeature();
    const inactive = renderShape(feature);
    expect(
      getGroup(inactive.container)
        .querySelector('rect')
        ?.getAttribute('stroke'),
    ).toBe('#6b7280');

    const active = renderShape(feature, { isActive: true });
    expect(
      getGroup(active.container).querySelector('rect')?.getAttribute('stroke'),
    ).toBe('#3b82f6');
  });

  it('renders sharp corners with an inside-clipped border', () => {
    const feature = makeFeature();
    const { container } = renderShape(feature);
    const rect = getGroup(container).querySelector('rect');
    // Sharp corners distinguish features from the rounded tables
    expect(rect?.getAttribute('rx')).toBe('0');
    // Doubled stroke clipped to the footprint keeps the border visible
    // when a feature sits flush against the classroom edge
    expect(rect?.getAttribute('stroke-width')).toBe('3');
    expect(rect?.getAttribute('clip-path')).toBe(
      'url(#feature-clip-feature-1)',
    );
    expect(
      container.querySelector('clipPath#feature-clip-feature-1 rect'),
    ).toBeTruthy();

    const active = renderShape(feature, { isActive: true });
    expect(
      getGroup(active.container)
        .querySelector('rect')
        ?.getAttribute('stroke-width'),
    ).toBe('4.8');
  });

  it('renders children inside the rotated feature frame', () => {
    const { container } = renderShape(makeFeature({ rotation: 45 }), {
      children: <circle data-testid="handle" r={10} />,
    });
    const group = getGroup(container);
    expect(group.querySelector('circle')).toBeTruthy();
    expect(group.getAttribute('transform')).toContain('rotate(45)');
  });
});
