// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ResizeHandle from '../ResizeHandle';
import type { FeatureResizeHandle } from '@/utils';

const renderHandle = (
  props: Partial<React.ComponentProps<typeof ResizeHandle>> = {},
) => {
  const onResizeStart = vi.fn();
  const onSvgPointerDown = vi.fn();
  const utils = render(
    <svg onPointerDown={onSvgPointerDown}>
      <ResizeHandle
        width={90}
        height={60}
        handle="e"
        ariaLabel="Breite anpassen"
        onResizeStart={onResizeStart}
        {...props}
      />
    </svg>,
  );
  const group = utils.container.querySelector('[role="button"]') as SVGGElement;
  return { ...utils, group, onResizeStart, onSvgPointerDown };
};

describe('ResizeHandle', () => {
  it('positions the grip on its edge midpoint or corner', () => {
    const positions: Array<[FeatureResizeHandle, string]> = [
      ['n', 'translate(45 0)'],
      ['e', 'translate(90 30)'],
      ['s', 'translate(45 60)'],
      ['w', 'translate(0 30)'],
      ['nw', 'translate(0 0)'],
      ['se', 'translate(90 60)'],
    ];
    positions.forEach(([handle, transform]) => {
      const { group } = renderHandle({ handle });
      expect(group.getAttribute('transform')).toBe(transform);
    });
  });

  it('uses a rotation-aware resize cursor and an accessible label', () => {
    const east = renderHandle({ handle: 'e' });
    expect(east.group.style.cursor).toBe('ew-resize');
    expect(east.group.getAttribute('aria-label')).toBe('Breite anpassen');

    const rotated = renderHandle({ handle: 'e', rotation: 90 });
    expect(rotated.group.style.cursor).toBe('ns-resize');

    const corner = renderHandle({ handle: 'se' });
    expect(corner.group.style.cursor).toBe('nwse-resize');
  });

  it('renders an enlarged invisible touch target around the grip', () => {
    const { group } = renderHandle();
    const touchTarget = group.querySelector('circle');
    expect(touchTarget?.getAttribute('r')).toBe('14');
    expect(touchTarget?.getAttribute('fill')).toBe('transparent');
    expect(group.querySelector('rect')).toBeTruthy();
  });

  it('captures the pointer and starts the resize without bubbling', () => {
    const { group, onResizeStart, onSvgPointerDown } = renderHandle({
      handle: 's',
    });
    const setPointerCapture = vi.fn();
    (
      group as SVGGElement & { setPointerCapture: typeof setPointerCapture }
    ).setPointerCapture = setPointerCapture;

    fireEvent.pointerDown(group, { pointerId: 7 });

    expect(setPointerCapture).toHaveBeenCalledWith(7);
    expect(onResizeStart).toHaveBeenCalledTimes(1);
    expect(onResizeStart.mock.calls[0][0]).toBe('s');
    // stopPropagation keeps the canvas selection machinery out of the gesture
    expect(onSvgPointerDown).not.toHaveBeenCalled();
  });
});
