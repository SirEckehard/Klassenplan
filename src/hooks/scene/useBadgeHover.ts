// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';

/** The badge slot under the pointer, as read off the seat pills. */
export type HoveredBadge = {
  studentId: string;
  /** The badge's key, or `BADGE_MORE_KEY` for the "+N". */
  badgeKey: string;
  /** Behind a "+N": the keys it stands for, in reading order. */
  hiddenKeys: string[];
  /** Screen box of the slot, to place the tooltip against. */
  rect: { left: number; top: number; width: number; height: number };
  /** Set by a tap: the tooltip stays until the next tap or scroll. */
  pinned: boolean;
};

/** Slack around a slot, so a 9px icon does not demand a surgeon's hand. */
const HIT_SLOP = 2;
/** A tap moves less than this and lasts less than {@link TAP_MS}. */
const TAP_DISTANCE = 8;
const TAP_MS = 600;

const contains = (rect: DOMRect, x: number, y: number) =>
  x >= rect.left - HIT_SLOP &&
  x <= rect.right + HIT_SLOP &&
  y >= rect.top - HIT_SLOP &&
  y <= rect.bottom + HIT_SLOP;

/**
 * The badge slot at a screen point inside `root`.
 *
 * The badge layer takes no pointer events — the seat under it is what a drag
 * grabs, and `elementFromPoint` has to find that seat mid-drag — so the slot
 * is found by its box: first the pill that contains the point, then the slot
 * inside it. Rotated tables are covered because a box is measured after every
 * transform.
 */
function findBadgeAt(
  root: Element,
  x: number,
  y: number,
): Omit<HoveredBadge, 'pinned'> | null {
  const pills = root.querySelectorAll('[data-badge-pill]');
  for (const pill of pills) {
    if (!contains(pill.getBoundingClientRect(), x, y)) continue;
    for (const slot of pill.querySelectorAll('[data-badge-key]')) {
      const rect = slot.getBoundingClientRect();
      if (!contains(rect, x, y)) continue;
      const hidden = slot.getAttribute('data-badge-hidden');
      return {
        studentId: pill.getAttribute('data-badge-pill') ?? '',
        badgeKey: slot.getAttribute('data-badge-key') ?? '',
        hiddenKeys: hidden ? hidden.split(' ') : [],
        rect: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        },
      };
    }
  }
  return null;
}

const sameSlot = (
  a: Pick<HoveredBadge, 'studentId' | 'badgeKey'> | null,
  b: Pick<HoveredBadge, 'studentId' | 'badgeKey'> | null,
) =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.studentId === b.studentId &&
    a.badgeKey === b.badgeKey);

/**
 * Which badge on the seats of an SVG the pointer is on.
 *
 * A mouse or a pen hovers; a finger taps — a touch that neither moves nor
 * lingers pins the tooltip until the next tap, a scroll or Escape. While
 * `enabled` is false (a seat is being dragged) nothing is reported, but a tap
 * is still noted, because on a touch screen the tap itself starts and ends
 * the drag of the seat it lands on.
 */
export function useBadgeHover(
  svgRef: React.RefObject<SVGSVGElement | null>,
  { enabled = true }: { enabled?: boolean } = {},
): HoveredBadge | null {
  const [hovered, setHovered] = React.useState<HoveredBadge | null>(null);
  // Mirrors `hovered` for the listeners; only `update` writes either.
  const hoveredRef = React.useRef<HoveredBadge | null>(null);

  React.useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;

    let frame = 0;
    let tapStart: { x: number; y: number; time: number } | null = null;

    const update = (next: HoveredBadge | null) => {
      const current = hoveredRef.current;
      if (sameSlot(current, next) && current?.pinned === next?.pinned) {
        return;
      }
      hoveredRef.current = next;
      setHovered(next);
    };

    const handleMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const { clientX, clientY } = event;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const found = findBadgeAt(svg, clientX, clientY);
        if (found) {
          update({ ...found, pinned: false });
        } else if (!hoveredRef.current?.pinned) {
          update(null);
        }
      });
    };

    const handleLeave = () => {
      cancelAnimationFrame(frame);
      if (!hoveredRef.current?.pinned) update(null);
    };

    const handleDown = (event: PointerEvent) => {
      // A press starts a drag or a tap; a hover tooltip from before would
      // otherwise wait at its old place until the pointer moves again.
      if (!hoveredRef.current?.pinned) update(null);
      tapStart =
        event.pointerType === 'mouse'
          ? null
          : { x: event.clientX, y: event.clientY, time: event.timeStamp };
    };

    const handleUp = (event: PointerEvent) => {
      const start = tapStart;
      tapStart = null;
      if (!start) return;
      const moved = Math.hypot(
        event.clientX - start.x,
        event.clientY - start.y,
      );
      if (moved > TAP_DISTANCE || event.timeStamp - start.time > TAP_MS) {
        return;
      }
      const found = findBadgeAt(svg, event.clientX, event.clientY);
      // A second tap on the same icon puts the tooltip away again.
      update(
        found && !sameSlot(hoveredRef.current, found)
          ? { ...found, pinned: true }
          : null,
      );
    };

    const dismiss = () => update(null);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };

    svg.addEventListener('pointermove', handleMove);
    svg.addEventListener('pointerleave', handleLeave);
    // Capture: a seat stops its pointerdown from bubbling once a drag starts.
    svg.addEventListener('pointerdown', handleDown, true);
    svg.addEventListener('pointerup', handleUp, true);
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    window.addEventListener('keydown', handleKey);
    return () => {
      cancelAnimationFrame(frame);
      svg.removeEventListener('pointermove', handleMove);
      svg.removeEventListener('pointerleave', handleLeave);
      svg.removeEventListener('pointerdown', handleDown, true);
      svg.removeEventListener('pointerup', handleUp, true);
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('keydown', handleKey);
    };
  }, [svgRef]);

  return enabled ? hovered : null;
}
