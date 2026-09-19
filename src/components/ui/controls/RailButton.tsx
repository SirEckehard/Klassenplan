// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { sidebarRailButtonClass } from '@/utils';
import { useLongPress } from '@/hooks/ui/useLongPress';

type RailButtonProps = {
  label: string;
  title: string;
  /** For a button whose press switches something on or off. */
  pressed?: boolean;
  /** For a button whose press opens the flyout: whether it is open. */
  flyoutOpen?: boolean;
  className: string;
  describedBy?: string;
  onPress: (button: HTMLButtonElement) => void;
  onOpenFlyout: (button: HTMLButtonElement) => void;
  /**
   * Pointer or keyboard focus resting on the button, for a preview it shows
   * elsewhere — the rail is too narrow to show one itself. Focus counts as
   * hover so the preview is reachable without a mouse.
   */
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
  children: React.ReactNode;
};

/**
 * A round button of the collapsed sidebar with two actions: a press runs the
 * primary one, a right click, a long press, Shift+F10 or → opens its flyout
 * (`SidebarFlyout`).
 */
export default function RailButton({
  label,
  title,
  pressed,
  flyoutOpen,
  className,
  describedBy,
  onPress,
  onOpenFlyout,
  onHoverStart,
  onHoverEnd,
  children,
}: RailButtonProps) {
  const longPress = useLongPress<HTMLButtonElement>(onOpenFlyout);

  return (
    <button
      type="button"
      {...longPress.handlers}
      onClick={(event) => {
        if (!longPress.isClickAfterLongPress()) {
          onPress(event.currentTarget);
        }
      }}
      // Also the keyboard path: Shift+F10 and the context menu key fire it.
      onContextMenu={(event) => {
        event.preventDefault();
        onOpenFlyout(event.currentTarget);
      }}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onFocus={onHoverStart}
      onBlur={onHoverEnd}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          onOpenFlyout(event.currentTarget);
        }
      }}
      className={`${sidebarRailButtonClass} ${className}`}
      title={title}
      aria-label={label}
      aria-pressed={pressed}
      aria-haspopup={flyoutOpen === undefined ? undefined : 'dialog'}
      aria-expanded={flyoutOpen}
      aria-describedby={describedBy}
      aria-keyshortcuts="Shift+F10 ArrowRight"
    >
      {children}
    </button>
  );
}
