// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import { placeTouchMenu } from '../touchMenuPlacement';

/**
 * The fingertip covers roughly a 44px circle around the point it pressed; a
 * menu that overlaps it is under the finger when it lifts.
 */
const coversFinger = (
  finger: { x: number; y: number },
  menu: { left: number; top: number; width: number; height: number },
) =>
  finger.x + 22 > menu.left &&
  finger.x - 22 < menu.left + menu.width &&
  finger.y + 22 > menu.top &&
  finger.y - 22 < menu.top + menu.height;

const room = { containerWidth: 700, containerHeight: 467 };
const menuSize = { menuWidth: 180, menuHeight: 150 };

describe('placeTouchMenu', () => {
  it('puts the menu above the finger where there is room', () => {
    const placed = placeTouchMenu({ x: 350, y: 300, ...menuSize, ...room });

    expect(placed).toEqual({ left: 260, top: 134 });
  });

  it.each([
    ['a table at the top edge', { x: 350, y: 60 }],
    ['a table in the top left corner', { x: 30, y: 40 }],
    ['a table in the top right corner', { x: 680, y: 40 }],
  ])('keeps clear of the finger on %s', (_label, finger) => {
    const placed = placeTouchMenu({ ...finger, ...menuSize, ...room });

    expect(
      coversFinger(finger, {
        ...placed,
        width: menuSize.menuWidth,
        height: menuSize.menuHeight,
      }),
    ).toBe(false);
    expect(placed.left).toBeGreaterThanOrEqual(8);
    expect(placed.left + menuSize.menuWidth).toBeLessThanOrEqual(700 - 8);
    expect(placed.top).toBeGreaterThanOrEqual(8);
  });

  it('goes beside the finger when above there is no room', () => {
    const placed = placeTouchMenu({ x: 350, y: 60, ...menuSize, ...room });

    expect(placed.left).toBe(382);
  });

  it('falls back to above, clamped, when nothing fits', () => {
    const placed = placeTouchMenu({
      x: 100,
      y: 50,
      menuWidth: 180,
      menuHeight: 150,
      containerWidth: 200,
      containerHeight: 160,
    });

    expect(placed).toEqual({ left: 10, top: 8 });
  });
});
