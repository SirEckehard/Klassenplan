// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useEffect, useId, useSyncExternalStore } from 'react';

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
 * The Escape readers are deliberately plain functions rather than hooks: both
 * call sites ask inside a keydown handler and none of them need to re-render
 * when the stack changes. The onboarding tour is different — it steps aside
 * while any other overlay is open and comes back when that one closes — so
 * {@link useOtherDialogLayerOpen} subscribes to the registry.
 */
/** Open overlays, outermost first. */
const stack: string[] = [];
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function pushLayer(id: string): void {
  stack.push(id);
  notify();
}

function removeLayer(id: string): void {
  const index = stack.lastIndexOf(id);
  if (index !== -1) {
    stack.splice(index, 1);
    notify();
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
  notify();
}

/**
 * Registers an overlay for as long as `open` is true.
 *
 * @param open - Whether the overlay is currently rendered
 * @param layerId - An id the caller already needs before this call (to ask
 *   {@link useOtherDialogLayerOpen} whether it may open); generated otherwise
 * @returns This overlay's stable layer id, for {@link isTopDialogLayer}
 */
export function useDialogLayer(open: boolean, layerId?: string): string {
  // `useId` rather than a counter: stable per component instance, unique across
  // the tree, and it needs no mutable module state to hand out.
  const generatedId = useId();
  const id = layerId ?? generatedId;

  useEffect(() => {
    if (!open) {
      return;
    }
    pushLayer(id);
    return () => removeLayer(id);
  }, [open, id]);

  return id;
}

/**
 * Whether an overlay other than `ownId` is open, re-rendering when that
 * changes. For a layer that must get out of the way of every other overlay
 * rather than handle Escape on top of it.
 */
export function useOtherDialogLayerOpen(ownId: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => stack.some((id) => id !== ownId),
    () => false,
  );
}
