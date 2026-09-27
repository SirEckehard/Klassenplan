// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { isTopDialogLayer, useDialogLayer } from '@/hooks/ui/useDialogLayer';
import { useIsCoarsePointer } from '@/hooks/ui/useCoarsePointer';

const FOCUSABLE = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  '[tabindex]',
].join(', ');

/** Where a key types rather than moves: the arrows belong to the field. */
const TEXT_ENTRY =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]), textarea, select, [contenteditable="true"]';

/** The controls of a popover in reading order, as Tab would visit them. */
function focusablesIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) =>
      element.tabIndex >= 0 &&
      !element.hasAttribute('disabled') &&
      !element.closest('[aria-hidden="true"], [hidden]'),
  );
}

type PopoverFocusOptions = {
  open: boolean;
  /** The popover's content, wherever it is portalled to. */
  contentRef: React.RefObject<HTMLElement | null>;
  /** The button that opened it; focus returns here when Escape closes it. */
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  /** Where focus lands first when not on the first control — the open class. */
  initialFocusSelector?: string;
};

/**
 * The keyboard of a popover that opens from a button — the dropdowns of the
 * header and of the toolbar.
 *
 * `FloatingDropdown` portals its content to the end of `<body>`, so in the tab
 * order it comes after everything else on the page: a keyboard user who opened
 * "Klassenwerkzeuge" or the class menu tabbed on to the next toolbar entry and
 * never reached it. This hook moves the focus in once the content is there,
 * keeps Tab inside while it is open, lets the arrow keys step through its rows
 * (except inside a text field, where they belong to the field), and closes it
 * on Escape with the focus back on the button that opened it.
 *
 * It also registers the popover as a dialog layer, so the views underneath
 * leave Escape and their own shortcuts alone while it is up.
 *
 * A finger that opened a panel with a text field in it gets the focus on the
 * panel rather than in the field: it may only have come to press a button,
 * and the on-screen keyboard would cover half the screen for nothing.
 */
export function usePopoverFocus({
  open,
  contentRef,
  anchorRef,
  onClose,
  initialFocusSelector,
}: PopoverFocusOptions): void {
  const layerId = useDialogLayer(open);
  const isCoarsePointer = useIsCoarsePointer();
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // The dropdown places its content a frame or two after it opens, so the
  // focus waits for it.
  React.useEffect(() => {
    if (!open) return undefined;
    let frame = 0;
    let attempts = 0;
    const moveFocusIn = () => {
      const root = contentRef.current;
      if (!root) {
        attempts += 1;
        if (attempts < 10) frame = requestAnimationFrame(moveFocusIn);
        return;
      }
      // The panel may have placed the focus itself (the plan's name field).
      if (root.contains(document.activeElement)) return;
      const preferred = initialFocusSelector
        ? root.querySelector<HTMLElement>(initialFocusSelector)
        : null;
      const target = preferred ?? focusablesIn(root)[0] ?? null;
      if (target && !(isCoarsePointer && target.matches(TEXT_ENTRY))) {
        target.focus();
      } else {
        root.focus();
      }
    };
    frame = requestAnimationFrame(moveFocusIn);
    return () => cancelAnimationFrame(frame);
  }, [contentRef, initialFocusSelector, isCoarsePointer, open]);

  React.useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // A dialog opened from the popover owns Escape first.
        if (!isTopDialogLayer(layerId)) return;
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        anchorRef.current?.focus();
        return;
      }

      const root = contentRef.current;
      if (!root || !(event.target instanceof Node)) return;
      if (!root.contains(event.target)) return;
      const items = focusablesIn(root);
      if (items.length === 0) return;
      const active = document.activeElement;
      const index = active instanceof HTMLElement ? items.indexOf(active) : -1;

      let next: number | null = null;
      if (event.key === 'Tab') {
        const step = event.shiftKey ? -1 : 1;
        next =
          index === -1
            ? event.shiftKey
              ? items.length - 1
              : 0
            : (index + step + items.length) % items.length;
      } else if (active instanceof HTMLElement && active.matches(TEXT_ENTRY)) {
        return;
      } else if (event.key === 'ArrowDown') {
        next = index === -1 ? 0 : (index + 1) % items.length;
      } else if (event.key === 'ArrowUp') {
        next =
          index === -1
            ? items.length - 1
            : (index - 1 + items.length) % items.length;
      } else if (event.key === 'Home') {
        next = 0;
      } else if (event.key === 'End') {
        next = items.length - 1;
      }
      if (next === null) return;

      // The canvas moves its selection with the arrow keys; inside the
      // popover they are the popover's.
      event.preventDefault();
      event.stopPropagation();
      items[next].focus();
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [anchorRef, contentRef, layerId, open]);
}
