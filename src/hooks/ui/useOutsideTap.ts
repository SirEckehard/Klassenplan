// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useEffect, useRef, type RefObject } from 'react';
import { isAnyDialogOpen } from '@/hooks/ui/useDialogLayer';

/** How far a press may travel and still count as a tap rather than a drag. */
const TAP_SLOP_PX = 10;

type OutsideTapOptions = {
  /**
   * The controls that open and close the panel themselves — its switch in the
   * status bar. A tap there is theirs: closing on it first would let the
   * switch open the panel straight back.
   */
  ignoreSelector?: string;
  /**
   * Whether something above the panel owns the pointer right now. By default
   * any open overlay: a toolbar panel portalled above the drawer, a dialog
   * opened from it, the onboarding tour. A panel that is itself an overlay
   * asks whether it is the top one instead.
   */
  isBlocked?: () => boolean;
};

/**
 * Closes a drawer or a sheet when a finger or the mouse taps outside it.
 *
 * A tap, not a press: the panel closes when the pointer is lifted without
 * having travelled, so a finger that starts to scroll the page — the browser
 * cancels its pointer then — or drags across the stage leaves it open. Closing
 * on the lift rather than on the click also keeps what was tapped working: the
 * click that follows reaches its target after the panel is gone, so tapping
 * another student in the list opens that one instead of only closing the
 * drawer. Mobile Safari sends no click for a tap on a plain element at all.
 *
 * @param ref - The panel; a tap inside it is the panel's own
 * @param onDismiss - Closes the panel
 * @param active - Whether the panel is open
 */
export function useOutsideTap(
  ref: RefObject<HTMLElement | null>,
  onDismiss: () => void,
  active: boolean,
  { ignoreSelector, isBlocked = isAnyDialogOpen }: OutsideTapOptions = {},
): void {
  // Read at the lift, so a new callback does not re-subscribe mid-gesture.
  const dismissRef = useRef(onDismiss);
  const blockedRef = useRef(isBlocked);
  useEffect(() => {
    dismissRef.current = onDismiss;
    blockedRef.current = isBlocked;
  });

  useEffect(() => {
    if (!active || typeof document === 'undefined') return undefined;

    let press: { id: number; x: number; y: number } | null = null;

    const isOutside = (target: EventTarget | null): boolean => {
      if (!(target instanceof Node)) return false;
      if (ref.current?.contains(target)) return false;
      // What is portalled to the end of the page — a list opened from a
      // select in the panel, a toolbar panel, a dialog — belongs to whatever
      // opened it, not to the page beside the panel.
      const appRoot = document.getElementById('root');
      if (appRoot && !appRoot.contains(target)) return false;
      if (
        ignoreSelector &&
        target instanceof Element &&
        target.closest(ignoreSelector)
      ) {
        return false;
      }
      return true;
    };

    const handlePointerDown = (event: PointerEvent) => {
      // A second finger on the screen is a pinch, not a tap.
      press =
        event.isPrimary !== false &&
        isOutside(event.target) &&
        !blockedRef.current()
          ? { id: event.pointerId, x: event.clientX, y: event.clientY }
          : null;
    };

    const handlePointerUp = (event: PointerEvent) => {
      const start = press;
      press = null;
      if (!start || start.id !== event.pointerId) return;
      const travelled = Math.hypot(
        event.clientX - start.x,
        event.clientY - start.y,
      );
      if (travelled > TAP_SLOP_PX || blockedRef.current()) return;
      dismissRef.current();
    };

    const handlePointerCancel = () => {
      press = null;
    };

    // Capture, so a view that stops the event for a gesture of its own does
    // not keep the panel open.
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('pointerup', handlePointerUp, true);
    document.addEventListener('pointercancel', handlePointerCancel, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('pointerup', handlePointerUp, true);
      document.removeEventListener('pointercancel', handlePointerCancel, true);
    };
  }, [active, ignoreSelector, ref]);
}
