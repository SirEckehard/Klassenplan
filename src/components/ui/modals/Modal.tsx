// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { useId, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { XIcon } from '@phosphor-icons/react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useDialogA11y } from '@/hooks/ui/useDialogA11y';
import { useDialogLayer } from '@/hooks/ui/useDialogLayer';
import { MOTION_DURATION, MOTION_EASE, motionEnabled } from '@/utils/ui/motion';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  /** `alertdialog` for a question that interrupts. */
  role?: 'dialog' | 'alertdialog';
  /** The content draws its own head and spacing, and names the dialog itself. */
  bare?: boolean;
  /** The id of the element that names a bare dialog. */
  labelledBy?: string;
  /** The id of the element that says what a bare dialog asks. */
  describedBy?: string;
  children: React.ReactNode;
};

const sizeClassMap: Record<NonNullable<Props['size']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-4xl',
};

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  size = 'md',
  showCloseButton = true,
  role = 'dialog',
  bare = false,
  labelledBy,
  describedBy,
  children,
}: Props) {
  const { t } = useTranslation('common');
  const dialogRef = useDialogA11y<HTMLDivElement>({ open });
  // Claims the Escape key for as long as this modal is up, so views underneath
  // (the student list, the room's canvas) leave it alone.
  useDialogLayer(open);
  // Where the press that ends in a click began: a text selection started in a
  // field and let go over the backdrop clicks the backdrop too, and must not
  // close the dialog with what was typed in it.
  const pressedOutsideRef = useRef(false);
  const isOutside = (target: EventTarget) =>
    !(target instanceof Node && dialogRef.current?.contains(target));
  // The quiet dialog comes in as a menu does; it goes at once. Keyed on `open`
  // alone: a dialog whose content changes while it stands does not move again.
  const scrimRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!open || !bare) return;
    const scrim = scrimRef.current;
    const panel = dialogRef.current;
    if (!scrim || !panel || !motionEnabled(panel)) return;
    const timing = {
      duration: MOTION_DURATION.menuIn,
      easing: MOTION_EASE.arrive,
    };
    scrim.animate([{ opacity: 0 }, { opacity: 1 }], timing);
    panel.animate(
      [{ transform: 'translateY(4px)' }, { transform: 'none' }],
      timing,
    );
  }, [bare, dialogRef, open]);
  const titleId = useId();
  const descriptionId = useId();
  const hasHeaderContent = Boolean(
    title || subtitle || icon || showCloseButton,
  );

  useKeyboardShortcuts(
    {
      escape: onClose,
    },
    {
      condition: () => open,
    },
  );

  if (!open) return null;

  const modalContent = (
    <div
      ref={scrimRef}
      className="fixed inset-0 z-60 overflow-y-auto bg-(--scrim) px-4 py-6"
      onPointerDown={(event) => {
        pressedOutsideRef.current = isOutside(event.target);
      }}
      onClick={(event) => {
        if (pressedOutsideRef.current && isOutside(event.target)) onClose();
        pressedOutsideRef.current = false;
      }}
    >
      <div className="flex min-h-full w-full items-center justify-center py-6">
        <div
          ref={dialogRef}
          tabIndex={-1}
          role={role}
          aria-modal="true"
          aria-labelledby={labelledBy ?? (title ? titleId : undefined)}
          aria-describedby={
            describedBy ?? (subtitle ? descriptionId : undefined)
          }
          className={`relative w-full ${sizeClassMap[size]} focus:outline-none`}
          onClick={(e) => {
            // React carries a click up through the portal to whatever renders
            // the dialog, a row that opens it on click included.
            e.stopPropagation();
          }}
        >
          <div className="rounded-panel shadow-(--dialog-shadow)">
            <div className="flex max-h-[calc(100dvh-3rem)] flex-col overflow-hidden rounded-panel border border-(--border-card) bg-(--surface-card)">
              {bare ? (
                <div className="flex-1 overflow-y-auto">{children}</div>
              ) : (
                <div className="flex-1 overflow-y-auto p-6 sm:p-8">
                  <div className="flex flex-col gap-6">
                    {hasHeaderContent && (
                      <div className="flex items-start justify-between gap-4 sm:gap-6">
                        <div className="flex flex-1 items-start gap-4">
                          {/* Paper, not blue: the icon names the dialog, and
                            blue is kept for what can be pressed. */}
                          {icon ? (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-(--surface-sunken) text-(--text-page)">
                              {icon}
                            </div>
                          ) : null}
                          <div className="min-w-0">
                            {title ? (
                              <h2
                                id={titleId}
                                className="text-xl font-semibold text-(--text-page) sm:text-2xl"
                              >
                                {title}
                              </h2>
                            ) : null}
                            {subtitle ? (
                              <p
                                id={descriptionId}
                                className="mt-1 text-sm text-(--text-muted)"
                              >
                                {subtitle}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        {showCloseButton ? (
                          <button
                            type="button"
                            onClick={onClose}
                            className="cursor-pointer rounded-lg p-2 text-(--text-muted) transition hover:bg-(--surface-sunken) hover:text-(--text-page) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)"
                            aria-label={t('common.closeDialog')}
                          >
                            <XIcon size={20} aria-hidden="true" />
                          </button>
                        ) : null}
                      </div>
                    )}
                    <div className="space-y-6 text-(--text-page)">
                      {children}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return modalContent;
  }

  return createPortal(modalContent, document.body);
}
