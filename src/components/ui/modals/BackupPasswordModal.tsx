// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  EyeIcon,
  EyeSlashIcon,
  LockKeyIcon,
  LockKeyOpenIcon,
} from '@phosphor-icons/react';
import Modal from '@/components/ui/modals/Modal';
import {
  inputFieldClass,
  primaryButtonClass,
  quietIconButtonClass,
  secondaryButtonClass,
} from '@/utils/ui/designTokens';
import {
  MIN_BACKUP_PASSWORD_LENGTH,
  ratePasswordStrength,
  type PasswordStrength,
} from '@/utils/validation/passwordStrength';

export type BackupPasswordMode = 'create' | 'unlock';

type BackupPasswordModalProps = {
  open: boolean;
  mode: BackupPasswordMode;
  onSubmit: (password: string) => void;
  onCancel: () => void;
};

const STRENGTH_BAR_CLASS: Record<PasswordStrength, string> = {
  weak: 'w-1/3 bg-red-500',
  medium: 'w-2/3 bg-amber-500',
  strong: 'w-full bg-green-600',
};

const STRENGTH_TEXT_CLASS: Record<PasswordStrength, string> = {
  weak: 'text-red-600 dark:text-red-400',
  medium: 'text-amber-600 dark:text-amber-400',
  strong: 'text-green-700 dark:text-green-400',
};

/**
 * Password dialog for encrypted backups. Replaces the previous chain of two
 * bare prompts: creation asks for password and confirmation in one step and
 * shows why a password is rejected before it is submitted.
 */
export default function BackupPasswordModal({
  open,
  mode,
  onSubmit,
  onCancel,
}: BackupPasswordModalProps) {
  const { t } = useTranslation('common');
  const isCreate = mode === 'create';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const passwordId = useId();
  const confirmationId = useId();
  const hintId = useId();

  // Modal focuses its own container first; move on to the password field.
  // No reset branch: callers mount the dialog fresh for every request.
  useEffect(() => {
    if (open) {
      passwordRef.current?.focus();
    }
  }, [open]);

  const strength = useMemo(() => ratePasswordStrength(password), [password]);

  const tooShort = password.length < MIN_BACKUP_PASSWORD_LENGTH;
  const mismatch = isCreate && confirmation !== password;
  const error = (() => {
    if (!isCreate) {
      return password.length === 0
        ? t('backupPassword.errorEmpty', 'Bitte gib das Passwort ein.')
        : null;
    }
    if (tooShort) {
      return t('backupPassword.errorTooShort', {
        min: MIN_BACKUP_PASSWORD_LENGTH,
        defaultValue: `Das Passwort muss mindestens ${MIN_BACKUP_PASSWORD_LENGTH} Zeichen lang sein.`,
      });
    }
    if (mismatch) {
      return t(
        'backupPassword.errorMismatch',
        'Die Passwörter stimmen nicht überein.',
      );
    }
    return null;
  })();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (error) {
      return;
    }
    onSubmit(password);
  };

  const inputType = revealed ? 'text' : 'password';
  const visibleError = submitted ? error : null;

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={
        isCreate
          ? t('backupPassword.createTitle', 'Backup verschlüsseln')
          : t('backupPassword.unlockTitle', 'Backup entschlüsseln')
      }
      subtitle={
        isCreate
          ? t('backupPassword.createSubtitle', {
              min: MIN_BACKUP_PASSWORD_LENGTH,
              defaultValue: `Das Backup wird mit deinem Passwort verschlüsselt (mindestens ${MIN_BACKUP_PASSWORD_LENGTH} Zeichen). Ohne dieses Passwort lässt sich die Datei nicht wiederherstellen.`,
            })
          : t(
              'backupPassword.unlockSubtitle',
              'Gib das Passwort ein, mit dem dieses Backup verschlüsselt wurde.',
            )
      }
      icon={
        isCreate ? (
          <LockKeyIcon size={24} aria-hidden="true" />
        ) : (
          <LockKeyOpenIcon size={24} aria-hidden="true" />
        )
      }
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label
            htmlFor={passwordId}
            className="block text-sm font-medium text-gray-800 dark:text-gray-200"
          >
            {t('backupPassword.passwordLabel', 'Passwort')}
          </label>
          <div className="relative">
            <input
              id={passwordId}
              ref={passwordRef}
              type={inputType}
              value={password}
              autoComplete={isCreate ? 'new-password' : 'current-password'}
              onChange={(event) => setPassword(event.target.value)}
              className={`${inputFieldClass} pr-12`}
              aria-describedby={isCreate ? hintId : undefined}
              aria-invalid={visibleError ? true : undefined}
            />
            <button
              type="button"
              className={`${quietIconButtonClass} absolute right-3 top-1/2 -translate-y-1/2 p-1.5`}
              onClick={() => setRevealed((value) => !value)}
              aria-label={
                revealed
                  ? t('password.hide', 'Passwort verbergen')
                  : t('password.show', 'Passwort anzeigen')
              }
            >
              {revealed ? (
                <EyeSlashIcon className="h-4 w-4" aria-hidden="true" />
              ) : (
                <EyeIcon className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>

          {isCreate && (
            <div id={hintId} className="space-y-1">
              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
                aria-hidden="true"
              >
                <div
                  className={`h-full rounded-full transition-all duration-200 ${
                    password.length === 0 ? 'w-0' : STRENGTH_BAR_CLASS[strength]
                  }`}
                />
              </div>
              <p
                className={`text-xs ${
                  password.length === 0
                    ? 'text-gray-500 dark:text-gray-400'
                    : STRENGTH_TEXT_CLASS[strength]
                }`}
              >
                {password.length === 0
                  ? t('backupPassword.strengthHint', {
                      min: MIN_BACKUP_PASSWORD_LENGTH,
                      defaultValue: `Mindestens ${MIN_BACKUP_PASSWORD_LENGTH} Zeichen; Länge und gemischte Zeichenarten erhöhen die Stärke.`,
                    })
                  : t(`backupPassword.strength.${strength}`)}
              </p>
            </div>
          )}
        </div>

        {isCreate && (
          <div className="space-y-2">
            <label
              htmlFor={confirmationId}
              className="block text-sm font-medium text-gray-800 dark:text-gray-200"
            >
              {t('backupPassword.confirmLabel', 'Passwort wiederholen')}
            </label>
            <input
              id={confirmationId}
              type={inputType}
              value={confirmation}
              autoComplete="new-password"
              onChange={(event) => setConfirmation(event.target.value)}
              className={inputFieldClass}
              aria-invalid={visibleError && mismatch ? true : undefined}
            />
          </div>
        )}

        {visibleError && (
          <p
            role="alert"
            className="text-sm font-medium text-red-600 dark:text-red-400"
          >
            {visibleError}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={onCancel}
          >
            {t('buttons.cancel', 'Abbrechen')}
          </button>
          <button type="submit" className={primaryButtonClass}>
            {isCreate
              ? t('backupPassword.submitCreate', 'Backup erstellen')
              : t('backupPassword.submitUnlock', 'Entschlüsseln')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
