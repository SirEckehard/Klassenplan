// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileArrowUpIcon } from '@phosphor-icons/react';
import type { NameColumnMode, NameColumnInfo } from '@/utils/data/csvUtils';
import Modal from '@/components/ui/modals/Modal';
import {
  cardSurfaceClass,
  listContainerClass,
  optionCardClass,
  optionCardHintClass,
  optionCardTitleClass,
  optionRadioClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/utils';

type NameColumnSelectionDialogProps = {
  open: boolean;
  nameInfo: NameColumnInfo;
  previewData: Array<Record<string, unknown>>;
  onConfirm: (mode: NameColumnMode) => void;
  onCancel: () => void;
};

/**
 * Dialog to let user select which name columns to use for CSV import
 */
export default function NameColumnSelectionDialog({
  open,
  nameInfo,
  previewData,
  onConfirm,
  onCancel,
}: NameColumnSelectionDialogProps) {
  const { t } = useTranslation('students');
  const [selectedMode, setSelectedMode] = useState<NameColumnMode>('firstName');

  const handleConfirm = () => {
    onConfirm(selectedMode);
  };

  // Generate preview based on selected mode
  const getPreviewName = (row: Record<string, unknown>): string => {
    if (selectedMode === 'firstName' && nameInfo.firstNameKey) {
      return String(row[nameInfo.firstNameKey] ?? '').trim();
    }
    if (selectedMode === 'lastName' && nameInfo.lastNameKey) {
      return String(row[nameInfo.lastNameKey] ?? '').trim();
    }
    if (selectedMode === 'fullName') {
      const firstName = nameInfo.firstNameKey
        ? String(row[nameInfo.firstNameKey] ?? '').trim()
        : '';
      const lastName = nameInfo.lastNameKey
        ? String(row[nameInfo.lastNameKey] ?? '').trim()
        : '';
      return `${firstName} ${lastName}`.trim();
    }
    return '';
  };

  const preview = previewData.slice(0, 3).map((row) => getPreviewName(row));

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={t('csvDialog.selectColumns', 'Namens-Spalten auswählen')}
      subtitle={t(
        'csvDialog.description',
        'Die CSV-Datei enthält mehrere Namens-Spalten. Bitte wähle, welche Kombination importiert werden soll:',
      )}
      icon={<FileArrowUpIcon size={24} aria-hidden="true" />}
      size="md"
    >
      {/* Radio Options */}
      <div className="space-y-3">
        {nameInfo.hasFirstName && (
          <label className={optionCardClass}>
            <input
              type="radio"
              name="nameMode"
              value="firstName"
              checked={selectedMode === 'firstName'}
              onChange={() => setSelectedMode('firstName')}
              className={optionRadioClass}
            />
            <span className="min-w-0 flex-1">
              <span className={`block ${optionCardTitleClass}`}>
                {t('csvDialog.firstNameOnly', 'Nur Vorname')}
              </span>
              <span className={`block ${optionCardHintClass}`}>
                {t('csvDialog.column', 'Spalte')}: {nameInfo.firstNameKey}
              </span>
            </span>
          </label>
        )}

        {nameInfo.hasLastName && (
          <label className={optionCardClass}>
            <input
              type="radio"
              name="nameMode"
              value="lastName"
              checked={selectedMode === 'lastName'}
              onChange={() => setSelectedMode('lastName')}
              className={optionRadioClass}
            />
            <span className="min-w-0 flex-1">
              <span className={`block ${optionCardTitleClass}`}>
                {t('csvDialog.lastNameOnly', 'Nur Nachname')}
              </span>
              <span className={`block ${optionCardHintClass}`}>
                {t('csvDialog.column', 'Spalte')}: {nameInfo.lastNameKey}
              </span>
            </span>
          </label>
        )}

        {nameInfo.hasFirstName && nameInfo.hasLastName && (
          <label className={optionCardClass}>
            <input
              type="radio"
              name="nameMode"
              value="fullName"
              checked={selectedMode === 'fullName'}
              onChange={() => setSelectedMode('fullName')}
              className={optionRadioClass}
            />
            <span className="min-w-0 flex-1">
              <span className={`block ${optionCardTitleClass}`}>
                {t('csvDialog.fullName', 'Vorname + Nachname')}
              </span>
              <span className={`block ${optionCardHintClass}`}>
                {t('csvDialog.combineColumns', 'Spalten kombinieren')}
              </span>
            </span>
          </label>
        )}
      </div>

      {/* Preview */}
      <div className={`${listContainerClass} space-y-2`}>
        <div className="border-b border-blue-100 pb-2 text-sm font-semibold text-gray-800 dark:border-blue-900/40 dark:text-gray-200">
          {t('csvDialog.preview', 'Vorschau')} (
          {t('csvDialog.firstRows', { count: preview.length })})
        </div>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
          {preview.map((name, idx) => (
            <li key={idx} className="flex items-center gap-2">
              <span className="font-medium text-blue-600 dark:text-blue-300">
                {idx + 1}.
              </span>
              {name ? (
                <span>{name}</span>
              ) : (
                <em className="text-gray-400 dark:text-gray-500">
                  ({t('csvDialog.empty', 'leer')})
                </em>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Privacy Notice */}
      <div className={`${cardSurfaceClass} border border-blue-200/70`}>
        <p className="text-xs text-blue-800 dark:text-blue-200">
          <strong>{t('csvDialog.privacy', 'Datenschutz')}:</strong>{' '}
          {t(
            'csvDialog.privacyNote',
            'Klassenplan speichert nur Name, Geschlecht und Lernbedürfnisse. Alle anderen Spalten werden ignoriert.',
          )}
        </p>
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onCancel}
          className={`${secondaryButtonClass} w-full justify-center`}
        >
          {t('common.cancel', 'Abbrechen')}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className={`${primaryButtonClass} w-full justify-center`}
        >
          {t('csvDialog.import', 'Importieren')}
        </button>
      </div>
    </Modal>
  );
}
