// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import { computeTokenPhotoLayout } from '../ui/studentTokenLayout';

describe('computeTokenPhotoLayout', () => {
  it('returns no avatar when the student has no photo', () => {
    const { avatar } = computeTokenPhotoLayout({
      shape: 'rect',
      centerX: 27.5,
      centerY: 32.5,
      width: 55,
      height: 65,
      hasPhoto: false,
      nameFontSize: 13,
    });
    expect(avatar).toBeNull();
  });

  it('centres the avatar on the vertical axis (rotation-stable)', () => {
    const { avatar } = computeTokenPhotoLayout({
      shape: 'rect',
      centerX: 27.5,
      centerY: 32.5,
      width: 55,
      height: 65,
      hasPhoto: true,
      nameFontSize: 13,
    });
    expect(avatar).not.toBeNull();
    // The horizontal centre must equal the token centre so that the avatar sits
    // on the seat's rotation axis and never drifts when the table is rotated.
    expect(avatar?.cx).toBe(27.5);
  });

  it('places the avatar fully above the name with a gap', () => {
    const centerY = 32.5;
    const nameFontSize = 13;
    const { avatar } = computeTokenPhotoLayout({
      shape: 'rect',
      centerX: 27.5,
      centerY,
      width: 55,
      height: 65,
      hasPhoto: true,
      nameFontSize,
    });
    const nameTop = centerY - nameFontSize * 0.6;
    expect(avatar).not.toBeNull();
    // Avatar bottom must clear the name's top edge.
    expect((avatar as { cy: number; r: number }).cy + avatar!.r).toBeLessThanOrEqual(
      nameTop,
    );
    // Avatar top must stay inside the token.
    expect(avatar!.cy - avatar!.r).toBeGreaterThanOrEqual(centerY - 65 / 2);
  });

  it('shrinks the avatar as the token gets smaller and drops it when tiny', () => {
    const big = computeTokenPhotoLayout({
      shape: 'rect',
      centerX: 40,
      centerY: 40,
      width: 80,
      height: 80,
      hasPhoto: true,
      nameFontSize: 14,
    });
    const small = computeTokenPhotoLayout({
      shape: 'rect',
      centerX: 30,
      centerY: 30,
      width: 60,
      height: 60,
      hasPhoto: true,
      nameFontSize: 13,
    });
    expect(small.avatar).not.toBeNull();
    expect(big.avatar!.r).toBeGreaterThan(small.avatar!.r);

    const tiny = computeTokenPhotoLayout({
      shape: 'rect',
      centerX: 12,
      centerY: 12,
      width: 24,
      height: 24,
      hasPhoto: true,
      nameFontSize: 12,
    });
    expect(tiny.avatar).toBeNull();
  });

  it('docks the circle avatar radially outside the token (inner edge on the border)', () => {
    const slotX = 450;
    const slotY = 200; // directly above the circle centre → outward = up
    const tokenRadius = 30;
    const { avatar } = computeTokenPhotoLayout({
      shape: 'circle',
      centerX: slotX,
      centerY: slotY,
      width: tokenRadius * 2,
      height: tokenRadius * 2,
      hasPhoto: true,
      nameFontSize: 13,
      outward: { dirX: 0, dirY: -1, tokenRadius },
    });
    expect(avatar).not.toBeNull();
    // Centre lies along the outward direction (straight up here).
    expect(avatar!.cx).toBe(slotX);
    expect(avatar!.cy).toBeLessThan(slotY);
    // Inner edge of the avatar touches the token edge: distance == r_token + r.
    const distance = Math.hypot(avatar!.cx - slotX, avatar!.cy - slotY);
    expect(distance).toBeCloseTo(tokenRadius + avatar!.r, 5);
  });

  it('normalises an arbitrary outward direction', () => {
    const tokenRadius = 24;
    const { avatar } = computeTokenPhotoLayout({
      shape: 'circle',
      centerX: 100,
      centerY: 100,
      width: tokenRadius * 2,
      height: tokenRadius * 2,
      hasPhoto: true,
      nameFontSize: 12,
      outward: { dirX: 3, dirY: 4, tokenRadius }, // length 5
    });
    expect(avatar).not.toBeNull();
    const distance = Math.hypot(avatar!.cx - 100, avatar!.cy - 100);
    expect(distance).toBeCloseTo(tokenRadius + avatar!.r, 5);
    // Direction preserved: components proportional to (3, 4).
    expect((avatar!.cx - 100) / (avatar!.cy - 100)).toBeCloseTo(3 / 4, 5);
  });

  it('keeps the outside-docked avatar visible even for small print circles', () => {
    // Small print circle where the "above the name" layout would have returned
    // null (no vertical room) — outside docking must still yield an avatar.
    const tokenRadius = 16;
    const { avatar } = computeTokenPhotoLayout({
      shape: 'circle',
      centerX: 60,
      centerY: 60,
      width: tokenRadius * 2,
      height: tokenRadius * 2,
      hasPhoto: true,
      nameFontSize: 11,
      outward: { dirX: 0, dirY: 1, tokenRadius },
    });
    expect(avatar).not.toBeNull();
    expect(avatar!.r).toBeGreaterThanOrEqual(8);
  });
});
