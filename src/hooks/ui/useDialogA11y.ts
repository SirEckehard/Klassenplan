// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback, useEffect, useRef } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

// Nested dialogs (e.g. a Modal opened from a mobile sheet) each lock the body
// scroll. A counter keeps the lock alive until the last one closes instead of
// letting the inner dialog's cleanup release it prematurely.
let scrollLockCount = 0;

function acquireScrollLock(): void {
  if (typeof document === 'undefined') return;
  scrollLockCount += 1;
  document.body.style.overflow = 'hidden';
}

function releaseScrollLock(): void {
  if (typeof document === 'undefined') return;
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    document.body.style.overflow = '';
  }
}

export interface UseDialogA11yOptions {
  /** Whether the dialog is currently rendered. */
  open: boolean;
  /** Move focus into the dialog container when it opens (default: true). */
  autoFocus?: boolean;
  /** Prevent background scrolling while open (default: true). */
  lockScroll?: boolean;
}

/**
 * Shared modal-dialog behaviour: focus trap, focus restore (WCAG 2.4.3) and
 * background scroll lock.
 *
 * Escape handling stays with the caller because the surrounding views differ in
 * what "close" means (some cannot be dismissed at all).
 *
 * @returns Ref for the dialog container; it must carry `tabIndex={-1}` so the
 *   initial focus move works.
 */
export function useDialogA11y<T extends HTMLElement>({
  open,
  autoFocus = true,
  lockScroll = true,
}: UseDialogA11yOptions) {
  const containerRef = useRef<T | null>(null);
  // Element that had focus before the dialog opened; focus returns to it on
  // close.
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const handleFocusTrap = useCallback((event: KeyboardEvent) => {
    if (event.key !== 'Tab' || !containerRef.current) return;
    const focusable = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    if (autoFocus) {
      containerRef.current?.focus();
    }
    if (lockScroll) {
      acquireScrollLock();
    }
    document.addEventListener('keydown', handleFocusTrap);

    return () => {
      document.removeEventListener('keydown', handleFocusTrap);
      if (lockScroll) {
        releaseScrollLock();
      }
      const restoreTarget = restoreFocusRef.current;
      restoreFocusRef.current = null;
      if (restoreTarget && document.contains(restoreTarget)) {
        restoreTarget.focus();
      }
    };
  }, [open, autoFocus, lockScroll, handleFocusTrap]);

  return containerRef;
}
