// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { createPortal } from 'react-dom';
import { menuSurfaceClass } from '@/utils';
import { useClickOutside } from '@/hooks/ui/useClickOutside';
import { isTopDialogLayer, useDialogLayer } from '@/hooks/ui/useDialogLayer';

const GAP_PX = 8;
const VIEWPORT_PADDING_PX = 8;

type FlyoutPosition = { left: number; top: number };

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

/**
 * Beside the anchor, vertically centred on it, where the rail leaves room;
 * otherwise (the criteria row under the canvas on a phone) centred below it,
 * or above when below does not fit.
 */
function placeFlyout(anchor: DOMRect, width: number, height: number) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const maxLeft = viewportWidth - VIEWPORT_PADDING_PX - width;
  const maxTop = viewportHeight - VIEWPORT_PADDING_PX - height;

  if (anchor.right + GAP_PX + width <= viewportWidth - VIEWPORT_PADDING_PX) {
    return {
      left: anchor.right + GAP_PX,
      top: clamp(
        anchor.top + anchor.height / 2 - height / 2,
        VIEWPORT_PADDING_PX,
        maxTop,
      ),
    };
  }

  const below = anchor.bottom + GAP_PX;
  return {
    left: clamp(
      anchor.left + anchor.width / 2 - width / 2,
      VIEWPORT_PADDING_PX,
      maxLeft,
    ),
    top:
      below + height <= viewportHeight - VIEWPORT_PADDING_PX
        ? below
        : Math.max(VIEWPORT_PADDING_PX, anchor.top - GAP_PX - height),
  };
}

type SidebarFlyoutProps = {
  /** The sidebar button the flyout belongs to. */
  anchor: HTMLElement;
  /** Accessible name of the flyout. */
  label: string;
  /** Moves focus to the first control inside when the flyout opens. */
  autoFocus: boolean;
  /** `restoreFocus` is set when the keyboard closed it. */
  onClose: (options: { restoreFocus: boolean }) => void;
  children: React.ReactNode;
};

/**
 * A small non-modal panel next to a button of the collapsed sidebar, for the
 * settings behind the button's primary action (the weight behind a criterion's
 * on/off) or a setting too large for a button (the export title). Pressing the anchor again leaves it open, so the switch and its
 * detail can be used together; a press anywhere else, Escape or Tab closes it.
 */
export default function SidebarFlyout({
  anchor,
  label,
  autoFocus,
  onClose,
  children,
}: SidebarFlyoutProps) {
  const flyoutRef = React.useRef<HTMLDivElement | null>(null);
  const anchorRef = React.useMemo(() => ({ current: anchor }), [anchor]);
  const insideRefs = React.useMemo(() => [flyoutRef, anchorRef], [anchorRef]);
  const [position, setPosition] = React.useState<FlyoutPosition | null>(null);
  const layerId = useDialogLayer(true);

  const closeByPointer = React.useCallback(
    () => onClose({ restoreFocus: false }),
    [onClose],
  );
  useClickOutside(insideRefs, closeByPointer);

  const updatePosition = React.useCallback(() => {
    const flyout = flyoutRef.current;
    if (!flyout) {
      return;
    }
    if (!anchor.isConnected) {
      onClose({ restoreFocus: false });
      return;
    }
    const next = placeFlyout(
      anchor.getBoundingClientRect(),
      flyout.offsetWidth,
      flyout.offsetHeight,
    );
    setPosition((previous) =>
      previous?.left === next.left && previous.top === next.top
        ? previous
        : next,
    );
  }, [anchor, onClose]);

  // After every render: the content may have changed height (a warning that
  // appears once all criteria are off), and an unchanged position is kept.
  React.useLayoutEffect(() => {
    updatePosition();
  });

  // The rail scrolls; the flyout follows its button instead of closing, so a
  // finger that nudges the rail while holding does not lose it.
  React.useEffect(() => {
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [updatePosition]);

  // Waits for the first placement: an element inside a `visibility: hidden`
  // container cannot take focus.
  const isPlaced = position !== null;
  React.useEffect(() => {
    if (autoFocus && isPlaced) {
      flyoutRef.current
        ?.querySelector<HTMLElement>('input, button, [tabindex]')
        ?.focus();
    }
  }, [autoFocus, isPlaced]);

  // Registered as a dialog layer, so views that act on Escape stand down while
  // the flyout is open; closing on Escape is this component's job.
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !isTopDialogLayer(layerId)) {
        return;
      }
      event.stopPropagation();
      onClose({ restoreFocus: true });
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [layerId, onClose]);

  // Portalled to the end of the document, the flyout has no natural Tab
  // neighbour; Tab hands focus back to its button instead of to the footer.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      onClose({ restoreFocus: true });
    }
  };

  return createPortal(
    <div
      ref={flyoutRef}
      role="dialog"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={`${menuSurfaceClass} fixed z-50 w-64 transition duration-150 starting:scale-95 starting:opacity-0 motion-reduce:transition-none ${
        isPlaced ? '' : 'invisible'
      }`}
      style={{ left: position?.left ?? 0, top: position?.top ?? 0 }}
    >
      {children}
    </div>,
    document.body,
  );
}
