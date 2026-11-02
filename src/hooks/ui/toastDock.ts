// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { isBreakpointUp, readRemPx } from '@/hooks/ui/useBreakpoint';

/**
 * Where the toasts stand: the part of the window they may cover, as insets
 * from its left, right and bottom edge in px.
 *
 * A toast stands in the middle of the window, over the middle of the status
 * bar and just above it, so it does not move when a column opens (decision
 * 0037). It never lies over the toolbar, the inspector's column or an open
 * drawer, where a teacher was typing: where the middle leaves it too little
 * room, it takes the middle of the stage those parts leave. Below `md` it
 * takes the window's width and stands above whatever hangs from the bar —
 * "Mischen", the class list's jump to its ends.
 *
 * The shell knows those parts and the toast provider stands far outside it,
 * so the shell registers a measure here and the provider asks it whenever a
 * card comes or the window changes. Without a shell — the start page, the
 * class tools, the projection — there is none, and the toasts stand at the
 * bottom of the window.
 */
export interface ToastDock {
  left: number;
  right: number;
  bottom: number;
}

/** The room between a toast and the status bar, or what hangs from it. */
const BAR_GAP_PX = 16;
const HANG_GAP_PX = 12;
/** A card's width (`toast-surface`) and the stack's margin on either side. */
const CARD_WIDTH_REM = 23;
const STACK_MARGIN_REM = 1;

let measure: (() => ToastDock | null) | null = null;

/** Called by the shell; the returned function takes the measure back. */
export function registerToastDock(next: () => ToastDock | null): () => void {
  measure = next;
  return () => {
    if (measure === next) measure = null;
  };
}

/** The dock as the shell measures it now; null without a shell. */
export function measureToastDock(): ToastDock | null {
  try {
    return measure ? measure() : null;
  } catch {
    return null;
  }
}

function visibleRect(element: Element | null): DOMRect | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 ? rect : null;
}

/**
 * Measures the dock inside a shell frame: centred on the window, clear of the
 * toolbar's column (`data-shell-toolbar`) and the inspector's column or drawer
 * (`data-shell-inspector`), or the stage between them where a card does not
 * fit that way; above the status bar (`data-shell-status-bar`) and, below
 * `md`, above what hangs from it (`data-status-bar-hang`).
 */
export function measureShellDock(frame: HTMLElement): ToastDock {
  const viewportWidth = document.documentElement.clientWidth;
  const bar = visibleRect(
    frame.querySelector(':scope > [data-shell-status-bar]'),
  );
  let bottom = (bar?.height ?? 0) + BAR_GAP_PX;
  let left = 0;
  let right = viewportWidth;

  if (isBreakpointUp('md')) {
    const toolbar = visibleRect(frame.querySelector('[data-shell-toolbar]'));
    if (toolbar && toolbar.right < viewportWidth / 2) left = toolbar.right;
    frame.querySelectorAll('[data-shell-inspector]').forEach((element) => {
      const rect = visibleRect(element);
      // Only what stands at the right edge narrows the stage — the column
      // or the tablet's drawer, never the phone's sheet across the width.
      if (rect && rect.left > left && rect.left > viewportWidth / 2) {
        right = Math.min(right, rect.left);
      }
    });
    // The same inset on both sides keeps the card on the bar's middle.
    const inset = Math.max(left, viewportWidth - right);
    const needed = (CARD_WIDTH_REM + 2 * STACK_MARGIN_REM) * readRemPx();
    if (viewportWidth - 2 * inset >= needed) {
      left = inset;
      right = viewportWidth - inset;
    }
  } else if (bar) {
    frame
      .querySelectorAll('[data-shell-status-bar] [data-status-bar-hang]')
      .forEach((element) => {
        const rect = visibleRect(element);
        if (rect && rect.top < bar.top) {
          bottom = Math.max(bottom, bar.bottom - rect.top + HANG_GAP_PX);
        }
      });
  }

  return {
    left: Math.round(left),
    right: Math.round(Math.max(0, viewportWidth - right)),
    bottom: Math.round(bottom),
  };
}
