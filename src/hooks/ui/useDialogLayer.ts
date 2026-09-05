// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useEffect, useId } from 'react';

/**
 * Which overlay owns the Escape key.
 *
 * Two views need to know whether something is open above them before acting on
 * Escape: the student list would otherwise drop the whole selection behind an
 * open popover, and the layout editor would close the Quick Setup overlay from
 * under a modal. Both used to ask the DOM — `document.querySelector('[role="dialog"],
 * [role="menu"]')` — which turned an ARIA role into application state: every new
 * component that legitimately carried one of those roles silently changed the
 * Escape behaviour of two unrelated views, and the overlays carried comments
 * explaining that they wore the role for that reason.
 *
 * Registration is explicit instead. Overlays call {@link useDialogLayer} while
 * they are open; the innermost registered layer owns Escape. Roles go back to
 * describing the markup.
 *
 * The readers are deliberately plain functions rather than hooks: both call
 * sites ask inside a keydown handler and none of them need to re-render when
 * the stack changes.
 */
/** Open overlays, outermost first. */
const stack: string[] = [];

function pushLayer(id: string): void {
  stack.push(id);
}

function removeLayer(id: string): void {
  const index = stack.lastIndexOf(id);
  if (index !== -1) {
    stack.splice(index, 1);
  }
}

/** Whether any overlay is currently open. */
export function isAnyDialogOpen(): boolean {
  return stack.length > 0;
}

/**
 * Whether the given layer is the innermost open overlay — i.e. whether it, and
 * not something stacked on top of it, should react to Escape.
 */
export function isTopDialogLayer(id: string): boolean {
  return stack.length > 0 && stack[stack.length - 1] === id;
}

/** Test seam: the registry outlives a single render tree. */
export function resetDialogLayersForTests(): void {
  stack.length = 0;
}

/**
 * Registers an overlay for as long as `open` is true.
 *
 * @param open - Whether the overlay is currently rendered
 * @returns This overlay's stable layer id, for {@link isTopDialogLayer}
 */
export function useDialogLayer(open: boolean): string {
  // `useId` rather than a counter: stable per component instance, unique across
  // the tree, and it needs no mutable module state to hand out.
  const id = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    pushLayer(id);
    return () => removeLayer(id);
  }, [open, id]);

  return id;
}
