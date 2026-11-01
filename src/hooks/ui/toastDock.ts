// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { isBreakpointUp } from '@/hooks/ui/useBreakpoint';

/**
 * Where the toasts stand: the part of the window they may cover, as insets
 * from its left, right and bottom edge in px.
 *
 * A toast stands centred over the stage, just above the status bar (decision
 * 0037). The stage is what the toolbar, the inspector's column and an open
 * drawer leave of the window; a toast over one of them lay over its head,
 * where a teacher was typing. Below `md` it takes the window's width and
 * stands above whatever hangs from the bar — "Mischen", the class list's jump
 * to its ends.
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
 * Measures the dock inside a shell frame: the stage between the toolbar's
 * column (`data-shell-toolbar`) and the inspector's column or drawer
 * (`data-shell-inspector`), above the status bar (`data-shell-status-bar`)
 * and, below `md`, above what hangs from it (`data-status-bar-hang`).
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
