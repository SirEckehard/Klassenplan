// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { createPortal } from 'react-dom';
import type { Icon } from '@phosphor-icons/react';
import { usePopoverFocus } from '@/hooks/ui/usePopoverFocus';
import { menuItemClass, menuItemDangerClass, menuSurfaceClass } from '@/utils';
import { placeTouchMenu } from '@/utils/ui/touchMenuPlacement';
import { MOTION_DURATION, MOTION_EASE, motionEnabled } from '@/utils/ui/motion';

export type ContextMenuItem = {
  label: string;
  icon: Icon;
  onSelect: () => void;
  /** The key that does the same without the menu (`Strg/⌘+C`, `F2`). */
  shortcut?: string;
  disabled?: boolean;
  /** Why a greyed-out row cannot be chosen, under its word. */
  hint?: string;
  /** The destructive row: last, set off by a hairline, rose under the pointer. */
  danger?: boolean;
  /** Sets the row off from the ones before by a hairline. */
  separatorBefore?: boolean;
};

/** Where the menu was asked for, in the window's coordinates. */
export type ContextMenuRequest = {
  x: number;
  y: number;
  /**
   * A finger's or a pen's menu never lies under it (`placeTouchMenu`); the
   * mouse's and the keyboard's open at the point, to the right and below.
   */
  pointer: 'mouse' | 'touch' | 'keyboard';
};

type ContextMenuProps = {
  request: ContextMenuRequest;
  items: readonly ContextMenuItem[];
  /** Names the menu for a screen reader — what it acts on. */
  label: string;
  onClose: () => void;
  /** Where the focus goes back to: the row, the seat, the canvas. */
  returnFocusRef?: React.RefObject<HTMLElement | SVGElement | null>;
  /** The menu's element, for a caller that tells clicks inside it apart. */
  menuRef?: React.RefObject<HTMLDivElement | null>;
};

/** Space kept between the menu and the window's edge. */
const EDGE_MARGIN = 8;

/**
 * The menu a right-click, a long press or Shift+F10 opens on a thing — a
 * table in the room, an entry of "Bibliothek", a seat. One shape everywhere:
 * rows of icon and word on `menuSurfaceClass`, the key that does the same at
 * the row's end, the destructive row last behind a hairline. It holds only
 * what can be done another way too — the inspector, a shortcut — so nothing
 * is reachable by the menu alone.
 *
 * Portalled to the end of the page and placed in the window: at the pointer,
 * flipped to stay inside, and for a finger beside or above it. The focus
 * moves onto the first row, the arrow keys step, Escape closes it with the
 * focus back where it came from (`usePopoverFocus`); a press outside it, a
 * scroll or a resize closes it too.
 */
export default function ContextMenu({
  request,
  items,
  label,
  onClose,
  returnFocusRef,
  menuRef,
}: ContextMenuProps) {
  const ownRef = React.useRef<HTMLDivElement | null>(null);
  const contentRef = menuRef ?? ownRef;
  const [position, setPosition] = React.useState<{
    left: number;
    top: number;
  } | null>(null);
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => {
    onCloseRef.current = onClose;
  });

  const noReturnRef = React.useRef<HTMLElement | null>(null);
  usePopoverFocus({
    open: true,
    contentRef,
    anchorRef: (returnFocusRef ??
      noReturnRef) as React.RefObject<HTMLElement | null>,
    onClose,
  });

  React.useLayoutEffect(() => {
    const node = contentRef.current;
    if (!node) return;
    const width = node.offsetWidth;
    const height = node.offsetHeight;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    if (request.pointer === 'touch') {
      setPosition(
        placeTouchMenu({
          x: request.x,
          y: request.y,
          menuWidth: width,
          menuHeight: height,
          containerWidth: viewportWidth,
          containerHeight: viewportHeight,
        }),
      );
      return;
    }
    const clamp = (value: number, max: number) =>
      Math.min(Math.max(value, EDGE_MARGIN), Math.max(max, EDGE_MARGIN));
    // To the right and below the point; flipped where it would run out.
    const left =
      request.x + width + EDGE_MARGIN > viewportWidth
        ? request.x - width
        : request.x;
    const top =
      request.y + height + EDGE_MARGIN > viewportHeight
        ? request.y - height
        : request.y;
    setPosition({
      left: clamp(left, viewportWidth - width - EDGE_MARGIN),
      top: clamp(top, viewportHeight - height - EDGE_MARGIN),
    });
  }, [contentRef, request, items.length]);

  // It fades in once it stands where it belongs.
  const placed = position !== null;
  React.useLayoutEffect(() => {
    const node = contentRef.current;
    if (!placed || !node || !motionEnabled(node)) return;
    node.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: MOTION_DURATION.menuIn,
      easing: MOTION_EASE.arrive,
    });
  }, [contentRef, placed]);

  React.useEffect(() => {
    const isInside = (target: EventTarget | null) =>
      target instanceof Node && !!contentRef.current?.contains(target);
    const handlePointerDown = (event: PointerEvent) => {
      if (!isInside(event.target)) onCloseRef.current();
    };
    // A scroll the teacher starts closes it — by the wheel or a finger, not
    // by a `scroll` event, which a column sliding into view raises as well.
    const handleScrollGesture = (event: Event) => {
      if (!isInside(event.target)) onCloseRef.current();
    };
    const handleClose = () => onCloseRef.current();
    const passive = { capture: true, passive: true };
    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('wheel', handleScrollGesture, passive);
    window.addEventListener('touchmove', handleScrollGesture, passive);
    window.addEventListener('resize', handleClose);
    window.addEventListener('blur', handleClose);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('wheel', handleScrollGesture, passive);
      window.removeEventListener('touchmove', handleScrollGesture, passive);
      window.removeEventListener('resize', handleClose);
      window.removeEventListener('blur', handleClose);
    };
  }, [contentRef]);

  const idPrefix = React.useId();

  const choose = (item: ContextMenuItem) => {
    if (item.disabled) return;
    onClose();
    (returnFocusRef?.current as HTMLElement | null)?.focus?.({
      preventScroll: true,
    });
    item.onSelect();
  };

  if (typeof document === 'undefined' || items.length === 0) return null;

  return createPortal(
    <div
      ref={contentRef}
      role="menu"
      aria-label={label}
      // Focusable from script, so the focus has somewhere to go when every
      // row is greyed out.
      tabIndex={-1}
      data-context-menu
      onContextMenu={(event) => event.preventDefault()}
      className={`${menuSurfaceClass} fixed z-50 flex w-max max-w-80 min-w-48 flex-col focus:outline-none ${
        position ? '' : 'invisible'
      }`}
      style={{ left: position?.left ?? 0, top: position?.top ?? 0 }}
    >
      {items.map((item, index) => {
        const Glyph = item.icon;
        const hintId = item.hint ? `${idPrefix}-hint-${index}` : undefined;
        const separated =
          index > 0 &&
          (item.separatorBefore || (item.danger && !items[index - 1].danger));
        return (
          <React.Fragment key={item.label}>
            {separated && (
              <div
                role="separator"
                className="-mx-3 my-1 border-t border-(--border-card)"
              />
            )}
            <button
              type="button"
              role="menuitem"
              // Greyed out but reachable, so its hint is read too.
              aria-disabled={item.disabled || undefined}
              aria-describedby={hintId}
              onClick={() => choose(item)}
              className={`${
                item.danger && !item.disabled
                  ? menuItemDangerClass
                  : menuItemClass
              } gap-2.5 pointer-coarse:min-h-11 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 aria-disabled:hover:bg-transparent`}
            >
              <Glyph size={16} aria-hidden="true" className="shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{item.label}</span>
                {item.hint && (
                  // Its description, not part of its name.
                  <span
                    id={hintId}
                    aria-hidden="true"
                    className="block text-xs text-(--text-muted)"
                  >
                    {item.hint}
                  </span>
                )}
              </span>
              {item.shortcut && (
                // Seen beside the word, as a desktop menu shows it; the
                // name a screen reader hears stays the action's alone.
                <span
                  aria-hidden="true"
                  className="ml-4 shrink-0 text-xs text-(--text-muted)"
                >
                  {item.shortcut}
                </span>
              )}
            </button>
          </React.Fragment>
        );
      })}
    </div>,
    document.body,
  );
}
