// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import {
  inertCopy,
  MOTION_DURATION,
  MOTION_EASE,
  motionEnabled,
} from '@/utils/ui/motion';

/**
 * The edge a drawer or a sheet belongs to; `column` is the inspector's column
 * from `lg` up, which slides over the window's right edge while the stage
 * beside it grows or gives way.
 */
export type PanelEdge = 'left' | 'right' | 'bottom' | 'column';

/** Where the panel stands out of sight, and how long it takes to get there. */
function outside(edge: PanelEdge, width: number): Keyframe {
  switch (edge) {
    case 'left':
      return { transform: 'translateX(-100%)' };
    case 'right':
      return { transform: 'translateX(100%)' };
    case 'bottom':
      return { transform: 'translateY(100%)' };
    case 'column':
      // Pulled out of the row by its own width: the stage takes the room.
      return { marginRight: `${-width}px` };
  }
}

function inPlace(edge: PanelEdge): Keyframe {
  return edge === 'column' ? { marginRight: '0px' } : { transform: 'none' };
}

const DURATION: Record<PanelEdge, { in: number; out: number }> = {
  left: { in: MOTION_DURATION.drawerIn, out: MOTION_DURATION.drawerOut },
  right: { in: MOTION_DURATION.drawerIn, out: MOTION_DURATION.drawerOut },
  bottom: { in: MOTION_DURATION.sheetIn, out: MOTION_DURATION.sheetOut },
  column: { in: MOTION_DURATION.column, out: MOTION_DURATION.column },
};

interface OpenPanel {
  node: HTMLElement;
  parent: Node;
  className: string;
  edge: PanelEdge;
  width: number;
  /** Where each of its parts was scrolled to. */
  scrolled: Map<Element, number>;
}

/**
 * A drawer or a sheet comes in from its own edge and goes back out over it.
 *
 * The panel itself opens and closes at once — it is unmounted or hidden in
 * the same render, so its focus, Escape and the tap beside it behave as they
 * always did. Coming in, it slides from the edge; going out, a copy of how it
 * last looked slides away in its place, inert, and is removed. Nothing moves
 * when the layout itself changes (`layout`: a window resized past a
 * breakpoint, a tablet turned), and nothing under reduced motion.
 */
export function usePanelMotion(
  ref: React.RefObject<HTMLElement | null>,
  open: boolean,
  edge: PanelEdge,
  layout: string,
): void {
  const last = React.useRef<OpenPanel | null>(null);
  const wasOpen = React.useRef(open);
  const lastLayout = React.useRef(layout);

  // Runs after every render, so the copy shows the panel as it last looked.
  React.useLayoutEffect(() => {
    const before = wasOpen.current;
    const sameLayout = lastLayout.current === layout;
    wasOpen.current = open;
    lastLayout.current = layout;
    const node = ref.current;

    if (open && node) {
      const scrolled =
        last.current?.node === node ? last.current.scrolled : new Map();
      last.current = {
        node,
        parent: node.parentNode ?? document.body,
        className: node.className,
        edge,
        // Only the column needs its width, and reading it costs a layout.
        width:
          edge === 'column'
            ? before && last.current?.node === node
              ? last.current.width
              : node.offsetWidth
            : 0,
        scrolled,
      };
      if (!before && sameLayout && motionEnabled(node)) {
        node.animate([outside(edge, last.current.width), inPlace(edge)], {
          duration: DURATION[edge].in,
          easing: MOTION_EASE.arrive,
        });
      }
      return;
    }

    const leaving = last.current;
    last.current = null;
    if (!before || !leaving || !sameLayout) return;
    if (!leaving.parent.isConnected || !motionEnabled(leaving.node)) return;
    const copy = inertCopy(leaving.node);
    copy.className = leaving.className;
    leaving.parent.appendChild(copy);
    // A copy starts unscrolled; it keeps where the panel was.
    const parts = [...leaving.node.querySelectorAll('*')];
    const copyParts = copy.querySelectorAll('*');
    leaving.scrolled.forEach((top, element) => {
      const part = copyParts[parts.indexOf(element)];
      if (part) part.scrollTop = top;
    });
    // It leaves over the edge it came in from, whatever the next panel is.
    const { edge: from, width } = leaving;
    copy
      .animate([inPlace(from), outside(from, width)], {
        duration: DURATION[from].out,
        easing: from === 'column' ? MOTION_EASE.arrive : MOTION_EASE.leave,
        fill: 'forwards',
      })
      .finished.then(
        () => copy.remove(),
        () => copy.remove(),
      );
  });

  // Note where its parts are scrolled while it is open.
  React.useEffect(() => {
    const node = ref.current;
    if (!open || !node) return undefined;
    const handleScroll = (event: Event) => {
      if (event.target instanceof Element && last.current?.node === node) {
        last.current.scrolled.set(event.target, event.target.scrollTop);
      }
    };
    node.addEventListener('scroll', handleScroll, true);
    return () => node.removeEventListener('scroll', handleScroll, true);
  }, [open, ref]);
}

/**
 * A column that changes its width — the toolbar between its labels and its
 * icons — glides from the old width to the new one when `state` changes, and
 * not when the layout does. The old width is the one a ResizeObserver last
 * saw, so nothing is measured until the column changes.
 */
export function useWidthMotion(
  ref: React.RefObject<HTMLElement | null>,
  state: unknown,
  layout: string,
): void {
  const width = React.useRef<number | null>(null);
  const lastState = React.useRef(state);
  const lastLayout = React.useRef(layout);

  React.useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      width.current = entry?.borderBoxSize?.[0]?.inlineSize ?? null;
    });
    observer.observe(node);
    return () => observer.disconnect();
    // Another layout may draw the column as another element.
  }, [ref, layout]);

  React.useLayoutEffect(() => {
    const changed = lastState.current !== state;
    const sameLayout = lastLayout.current === layout;
    lastState.current = state;
    lastLayout.current = layout;
    const node = ref.current;
    const from = width.current;
    if (!changed || !sameLayout || !node || from === null) return;
    if (!motionEnabled(node)) return;
    const to = node.getBoundingClientRect().width;
    if (Math.abs(to - from) < 1) return;
    node.animate([{ width: `${from}px` }, { width: `${to}px` }], {
      duration: MOTION_DURATION.column,
      easing: MOTION_EASE.arrive,
    });
  }, [ref, state, layout]);
}
