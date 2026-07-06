// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { useEffect, useRef, useId, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { XIcon } from '@phosphor-icons/react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

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
  const dialogRef = useRef<HTMLDivElement>(null);
  // Element that had focus before the modal opened; focus returns to it on
  // close (WCAG 2.4.3).
  const restoreFocusRef = useRef<HTMLElement | null>(null);
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

  // Trap focus inside the modal when open
  const handleFocusTrap = useCallback((e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, []);

  useEffect(() => {
    if (open) {
      restoreFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      // Focus the dialog when it opens
      dialogRef.current?.focus();
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleFocusTrap);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleFocusTrap);
      const restoreTarget = restoreFocusRef.current;
      restoreFocusRef.current = null;
      if (restoreTarget && document.contains(restoreTarget)) {
        restoreTarget.focus();
      }
    };
  }, [open, handleFocusTrap]);

  if (!open) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-60 overflow-y-auto bg-white/90 px-4 py-6 backdrop-blur-md dark:bg-gray-950/85"
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
          <div className="rounded-3xl shadow-2xl">
            <div className="flex max-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-3xl border-2 border-blue-200 bg-linear-to-br from-blue-50 via-white to-indigo-50 dark:border-blue-900/40 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950">
              <div className="flex-1 overflow-y-auto p-6 sm:p-8">
                <div className="flex flex-col gap-6">
                  {hasHeaderContent && (
                    <div className="flex items-start justify-between gap-4 sm:gap-6">
                      <div className="flex flex-1 items-start gap-4">
                        {icon ? (
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md dark:bg-blue-500">
                            {icon}
                          </div>
                        ) : null}
                        <div className="min-w-0">
                          {title ? (
                            <h2
                              id={titleId}
                              className="text-xl font-semibold text-gray-900 dark:text-gray-100 sm:text-2xl"
                            >
                              {title}
                            </h2>
                          ) : null}
                          {subtitle ? (
                            <p
                              id={descriptionId}
                              className="mt-1 text-sm text-gray-600 dark:text-gray-400"
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
                          className="cursor-pointer rounded-full p-2 text-gray-500 transition hover:bg-white/70 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
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
                  <div className="space-y-6 text-gray-800 dark:text-gray-200">
                    {children}
                  </div>
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
