// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { XIcon } from '@phosphor-icons/react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useDialogA11y } from '@/hooks/ui/useDialogA11y';
import { useDialogLayer } from '@/hooks/ui/useDialogLayer';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
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
  children,
}: Props) {
  const { t } = useTranslation('common');
  const dialogRef = useDialogA11y<HTMLDivElement>({ open });
  // Claims the Escape key for as long as this modal is up, so views underneath
  // (the student list, the Quick Setup overlay) leave it alone.
  useDialogLayer(open);
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
      className="fixed inset-0 z-60 overflow-y-auto bg-(--scrim) px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="flex min-h-full w-full items-center justify-center py-6">
        <div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={subtitle ? descriptionId : undefined}
          className={`relative w-full ${sizeClassMap[size]} focus:outline-none`}
          onClick={(e) => {
            // Prevent closing when clicking inside the dialog
            e.stopPropagation();
          }}
        >
          <div className="rounded-xl shadow-2xl">
            <div className="flex max-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-xl border border-(--border-card) bg-(--surface-card)">
              <div className="flex-1 overflow-y-auto p-6 sm:p-8">
                <div className="flex flex-col gap-6">
                  {hasHeaderContent && (
                    <div className="flex items-start justify-between gap-4 sm:gap-6">
                      <div className="flex flex-1 items-start gap-4">
                        {icon ? (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-(--button-primary-bg) text-(--button-primary-text)">
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
                          className="cursor-pointer rounded-lg p-2 text-(--text-muted) transition hover:bg-(--surface-sunken) hover:text-(--text-page) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary)"
                          aria-label={t(
                            'common.closeDialog',
                            'Dialog schließen',
                          )}
                        >
                          <XIcon size={20} aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                  )}
                  <div className="space-y-6 text-(--text-page)">{children}</div>
                </div>
              </div>
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
