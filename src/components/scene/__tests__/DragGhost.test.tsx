// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DragGhost, { type DragGhostProps } from '../DragGhost';

const ghost = (props: Partial<DragGhostProps>) => (
  <DragGhost
    x={200}
    y={300}
    pointerType="touch"
    name="Ada L."
    appearance={{ fill: '#eef', stroke: '#99c', text: '#111' }}
    {...props}
  />
);

const chip = () => document.querySelector<HTMLElement>('[data-drag-ghost]')!;
const placement = () => chip().parentElement!.style.transform;

describe('DragGhost', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('names the student in hand in the tint of its seat', () => {
    render(ghost({}));

    expect(screen.getByText('Ada L.')).toBeInTheDocument();
    expect(chip()).toHaveStyle({ backgroundColor: '#eef' });
  });

  it('floats above the finger, beside it at the top of the window', () => {
    vi.stubGlobal('innerWidth', 400);
    const { rerender } = render(ghost({}));
    expect(placement()).toContain('-100% - 40px');

    rerender(ghost({ x: 100, y: 30 }));
    expect(placement()).toBe('translate(40px, -50%)');

    // At the right edge it goes to the left of the finger.
    rerender(ghost({ x: 380, y: 30 }));
    expect(placement()).toContain('calc(-100% - 40px), -50%');
  });

  it('sits below and right of a mouse pointer, turned where the window ends', () => {
    vi.stubGlobal('innerWidth', 800);
    vi.stubGlobal('innerHeight', 600);
    const { rerender } = render(ghost({ pointerType: 'mouse' }));
    expect(placement()).toBe('translate(14px, 18px)');

    rerender(ghost({ pointerType: 'mouse', x: 780, y: 590 }));
    expect(placement()).toBe('translate(calc(-100% - 7px), calc(-100% - 9px))');
  });

  it('carries a lock over a held place', () => {
    const { rerender } = render(ghost({}));
    expect(chip().querySelector('svg')).toBeNull();

    rerender(ghost({ blocked: true }));
    expect(chip().querySelector('svg')).not.toBeNull();
  });
});
