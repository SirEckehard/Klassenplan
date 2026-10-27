// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { PlanTurn } from '@/utils/canvas/turn';
import { MOTION_DURATION, MOTION_EASE, motionEnabled } from '@/utils/ui/motion';

/**
 * Turns the frame into its new lie when the device turns: the drawing starts a
 * quarter back and shrunk to its own footprint, and runs into place in 260 ms.
 * One animation on the frame, so the room and the plan move as a whole and
 * read as the same room held another way. Under reduced motion, or where the
 * browser has no Web Animations, the new lie simply stands.
 */
export function useTurnAnimation(
  frameRef: React.RefObject<HTMLElement | null>,
  turn: PlanTurn | null,
): void {
  const previous = React.useRef(turn);
  React.useLayoutEffect(() => {
    const from = previous.current;
    previous.current = turn;
    const node = frameRef.current;
    if (from === turn || !node || !motionEnabled(node)) return;
    // The quarter between the two lies, the short way round.
    const angle = ((((from ?? 0) - (turn ?? 0) + 540) % 360) - 180) as number;
    const { width, height } = node.getBoundingClientRect();
    if (width <= 0 || height <= 0) return;
    // Turned a quarter, the frame's long side lies along its short one.
    const scale = Math.min(width, height) / Math.max(width, height);
    node.animate(
      [
        { transform: `rotate(${angle}deg) scale(${scale})` },
        { transform: 'none' },
      ],
      { duration: MOTION_DURATION.turn, easing: MOTION_EASE.settle },
    );
  }, [frameRef, turn]);
}
