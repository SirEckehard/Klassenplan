// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import { getTableColors } from '../tableAppearance';

describe('getTableColors', () => {
  it('draws a table in the theme, its dividers translucent', () => {
    expect(getTableColors(false)).toMatchObject({
      fill: '#ffffff',
      stroke: '#17181a',
      divider: 'rgba(23, 24, 26, 0.14)',
    });
    expect(getTableColors(true)).toMatchObject({
      fill: '#1c1f23',
      stroke: '#a9acb1',
      divider: 'rgba(242, 241, 238, 0.16)',
    });
  });

  it('leaves the dividers to the seats in the contrast mode, whatever the theme', () => {
    const colors = getTableColors(true, true);
    expect(colors).toMatchObject({
      fill: '#ffffff',
      stroke: '#000000',
      divider: null,
      photoBackdrop: '#ffffff',
    });
  });
});
