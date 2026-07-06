// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useRef, useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import Modal from '@/components/ui/modals/Modal';
import ConfirmDialog from '@/components/ui/modals/ConfirmDialog';
import { PencilLineIcon, EyeIcon, EyeSlashIcon } from '@phosphor-icons/react';
import i18n from '@/i18n';
import {
  inputFieldClass,
  primaryButtonClass,
  secondaryButtonClass,
  quietIconButtonClass,
} from '@/utils/ui/designTokens';

interface ConfirmDialogOptions {
  confirmLabel?: string;
  cancelLabel?: string;
}

export function confirmDialog(
  message: string,
  options: ConfirmDialogOptions = {},
): Promise<boolean> {
  const {
    confirmLabel = 'OK',
    cancelLabel = i18n.t('buttons.cancel', { ns: 'common' }),
  } = options;
  return new Promise((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const handleClose = (val: boolean) => {
      root.unmount();
      container.remove();
      resolve(val);
    };

    root.render(
      <ConfirmDialog
        open={true}
        title={i18n.t('dialogs.confirmTitle', { ns: 'common' })}
        message={message}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        onConfirm={() => handleClose(true)}
        onCancel={() => handleClose(false)}
      />,
    );
  });
}

interface PromptDialogProps {
  message: string;
  defaultValue: string;
  type: 'text' | 'password';
  resolve: (val: string | null) => void;
}

function PromptDialog({
  message,
  defaultValue,
  type,
  resolve,
}: PromptDialogProps) {
  const [open, setOpen] = useState(true);
  const [show, setShow] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleClose = useCallback(
    (val: string | null) => {
      setOpen(false);
      resolve(val);
    },
    [resolve],
  );

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={() => handleClose(null)}
      title={message}
      icon={<PencilLineIcon size={24} aria-hidden="true" />}
      size="sm"
    >
      <div className="relative">
        <input
          ref={inputRef}
          defaultValue={defaultValue}
          type={type === 'password' && !show ? 'password' : 'text'}
          className={inputFieldClass}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleClose(inputRef.current?.value ?? '');
          }}
        />
        {type === 'password' && (
          <button
            type="button"
            className={`${quietIconButtonClass} absolute right-3 top-1/2 -translate-y-1/2 p-1.5`}
            onClick={() => setShow((v) => !v)}
            aria-label={
              show
                ? i18n.t('password.hide', { ns: 'common' })
                : i18n.t('password.show', { ns: 'common' })
            }
          >
            {show ? (
              <EyeSlashIcon className="w-4 h-4" aria-hidden="true" />
            ) : (
              <EyeIcon className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        )}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() => handleClose(null)}
        >
          {i18n.t('buttons.cancel', { ns: 'common' })}
        </button>
        <button
          type="button"
          className={primaryButtonClass}
          onClick={() => handleClose(inputRef.current?.value ?? '')}
        >
          OK
        </button>
      </div>
    </Modal>
  );
}

export function promptDialog(
  message: string,
  defaultValue = '',
  type: 'text' | 'password' = 'text',
): Promise<string | null> {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const handleResolve = (val: string | null) => {
      root.unmount();
      container.remove();
      resolve(val);
    };

    root.render(
      <PromptDialog
        message={message}
        defaultValue={defaultValue}
        type={type}
        resolve={handleResolve}
      />,
    );
  });
}
