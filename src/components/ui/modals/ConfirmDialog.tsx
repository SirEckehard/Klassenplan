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
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Handle Enter key press
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onConfirm]);

  // Auto-focus confirm button for better keyboard navigation
  useEffect(() => {
    if (open && confirmButtonRef.current) {
      confirmButtonRef.current.focus();
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
          type="button"
          onClick={onCancel}
          className={secondaryButtonClass}
        >
          {cancelLabel}
        </button>
        <button
          ref={confirmButtonRef}
          type="button"
          onClick={onConfirm}
          className={dangerButtonClass}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
