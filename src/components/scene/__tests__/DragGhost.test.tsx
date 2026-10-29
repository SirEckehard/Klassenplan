// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DragGhost, { type DragGhostProps } from '../DragGhost';

const ghost = (props: Partial<DragGhostProps>) => (
  <DragGhost
    x={100}
    y={100}
    shape="seat"
    width={55}
    height={65}
    viewportScale={1}
    name="Ada"
    appearance={{ fill: '#fff', stroke: '#000', text: '#000' }}
    badges={[]}
    isDark={false}
    {...props}
  />
);

const cardOf = (name: string) => screen.getByText(name).parentElement!;

describe('DragGhost', () => {
  it("rounds a seat with the table's radius, at the ghost's scale", () => {
    render(ghost({}));

    // The longer side is drawn 55.2 wide (60 × 0.92): 8 × 55.2 / 65.
    const radius = parseFloat(cardOf('Ada').style.borderRadius);
    expect(radius).toBeCloseTo((8 * 55.2) / 65, 5);
  });

  it('keeps a place of the circle round', () => {
    render(ghost({ shape: 'token', width: 60, height: 60 }));

    expect(cardOf('Ada')).toHaveClass('rounded-full');
    expect(cardOf('Ada').style.borderRadius).toBe('');
  });
});
