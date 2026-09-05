// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DownloadSimpleIcon } from '@phosphor-icons/react';
import Modal from '@/components/ui/modals/Modal';
import {
  optionCardClass,
  optionCardHintClass,
  optionCardTitleClass,
  optionRadioClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/utils/ui/designTokens';

export type BackupRestoreMode = 'replace' | 'merge';

type BackupRestoreModeModalProps = {
  open: boolean;
  onConfirm: (mode: BackupRestoreMode) => void;
  onCancel: () => void;
};

/**
 * Asks how a decrypted backup should be applied. `importAllFromJson` has always
 * supported merging; this dialog is what finally exposes it.
 */
export default function BackupRestoreModeModal({
  open,
  onConfirm,
  onCancel,
}: BackupRestoreModeModalProps) {
  const { t } = useTranslation('common');
  const [mode, setMode] = useState<BackupRestoreMode>('replace');

  const options = [
    {
      value: 'replace' as const,
      label: t('backupRestore.replaceLabel', 'Alles ersetzen'),
      hint: t(
        'backupRestore.replaceHint',
        'Vorhandene Schüler, Sitzpläne und Vorlagen werden durch das Backup ersetzt. Diese Aktion kann nicht rückgängig gemacht werden.',
      ),
    },
    {
      value: 'merge' as const,
      label: t('backupRestore.mergeLabel', 'Zusammenführen'),
      hint: t(
        'backupRestore.mergeHint',
        'Schüler und Sitzpläne aus dem Backup werden zu den vorhandenen hinzugefügt. Klassenraum und Einstellungen kommen aus dem Backup.',
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={t('backupRestore.title', 'Backup wiederherstellen')}
      subtitle={t(
        'backupRestore.subtitle',
        'Wie sollen die Daten aus dem Backup übernommen werden?',
      )}
      icon={<DownloadSimpleIcon size={24} aria-hidden="true" />}
      size="md"
    >
      <fieldset className="space-y-3">
        <legend className="sr-only">
          {t(
            'backupRestore.subtitle',
            'Wie sollen die Daten aus dem Backup übernommen werden?',
          )}
        </legend>
        {options.map((option) => (
          <label key={option.value} className={optionCardClass}>
            <input
              type="radio"
              name="restoreMode"
              value={option.value}
              checked={mode === option.value}
              onChange={() => setMode(option.value)}
              className={optionRadioClass}
            />
            <span className="min-w-0 flex-1">
              <span className={`block ${optionCardTitleClass}`}>
                {option.label}
              </span>
              <span className={`block ${optionCardHintClass}`}>
                {option.hint}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={onCancel}
        >
          {t('buttons.cancel', 'Abbrechen')}
        </button>
        <button
          type="button"
          className={primaryButtonClass}
          onClick={() => onConfirm(mode)}
        >
          {t('backupRestore.submit', 'Wiederherstellen')}
        </button>
      </div>
    </Modal>
  );
}
