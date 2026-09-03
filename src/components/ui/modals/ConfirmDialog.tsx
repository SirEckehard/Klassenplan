// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useEffect, useRef } from 'react';
import { WarningIcon } from '@phosphor-icons/react';
import Modal from '../modals/Modal';

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

import {
  cardSurfaceClass,
  secondaryButtonClass,
  dangerButtonClass,
} from '@/utils/ui/designTokens';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: Props) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // No global Enter handler on purpose: the focused button handles Enter
  // natively, and a window-wide listener would confirm this (destructive)
  // dialog even after the user moved focus elsewhere.

  // Auto-focus the *cancel* button: this dialog always guards a destructive
  // action, so a reflexive Enter must abort it, never carry it out. The
  // confirm button stays one Tab (or a click) away.
  useEffect(() => {
    if (open && cancelButtonRef.current) {
      cancelButtonRef.current.focus();
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      icon={<WarningIcon size={24} aria-hidden="true" />}
      size="sm"
    >
      <div
        className={`${cardSurfaceClass} p-4 text-sm text-gray-700 dark:text-gray-200 shadow-sm`}
      >
        {message}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <button
          ref={cancelButtonRef}
          type="button"
          onClick={onCancel}
          className={secondaryButtonClass}
        >
          {cancelLabel}
        </button>
        <button type="button" onClick={onConfirm} className={dangerButtonClass}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
