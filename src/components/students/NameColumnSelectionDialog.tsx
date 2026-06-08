import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { XIcon } from '@phosphor-icons/react';
import type { NameColumnMode, NameColumnInfo } from '@/utils/data/csvUtils';
import {
  cardSurfaceClass,
  iconButtonClass,
  listContainerClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/utils';

type NameColumnSelectionDialogProps = {
  nameInfo: NameColumnInfo;
  previewData: Array<Record<string, unknown>>;
  onConfirm: (mode: NameColumnMode) => void;
  onCancel: () => void;
};

/**
 * Dialog to let user select which name columns to use for CSV import
 */
export default function NameColumnSelectionDialog({
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/70 p-4 backdrop-blur-sm dark:bg-gray-950/80">
      <div className={`${cardSurfaceClass} w-full max-w-xl`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-blue-100 pb-3 dark:border-blue-900/40">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('csvDialog.selectColumns', 'Namens-Spalten auswählen')}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className={`${iconButtonClass} h-9 w-9 p-0`}
            aria-label={t('csvDialog.closeDialog', 'Dialog schließen')}
          >
            <XIcon size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-5">
          {/* Info Text */}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t(
              'csvDialog.description',
              'Die CSV-Datei enthält mehrere Namens-Spalten. Bitte wähle, welche Kombination importiert werden soll:',
            )}
          </p>

          {/* Radio Options */}
          <div className="space-y-3">
            {nameInfo.hasFirstName && (
              <label
                className={`${cardSurfaceClass} flex cursor-pointer items-start gap-3 border transition hover:border-blue-300 dark:hover:border-blue-700`}
              >
                <input
                  type="radio"
                  name="nameMode"
                  value="firstName"
                  checked={selectedMode === 'firstName'}
                  onChange={() => setSelectedMode('firstName')}
                  className="mt-1 h-4 w-4 border-blue-300 text-blue-600 focus:ring-blue-400 dark:border-blue-700"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900 transition group-hover:text-blue-700 dark:text-gray-100 dark:group-hover:text-blue-300">
                    {t('csvDialog.firstNameOnly', 'Nur Vorname')}
                  </div>
                  {t('csvDialog.column', 'Spalte')}: {nameInfo.firstNameKey}
                </div>
              </label>
            )}

            {nameInfo.hasLastName && (
              <label
                className={`${cardSurfaceClass} flex cursor-pointer items-start gap-3 border transition hover:border-blue-300 dark:hover:border-blue-700`}
              >
                <input
                  type="radio"
                  name="nameMode"
                  value="lastName"
                  checked={selectedMode === 'lastName'}
                  onChange={() => setSelectedMode('lastName')}
                  className="mt-1 h-4 w-4 border-blue-300 text-blue-600 focus:ring-blue-400 dark:border-blue-700"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900 transition group-hover:text-blue-700 dark:text-gray-100 dark:group-hover:text-blue-300">
                    {t('csvDialog.lastNameOnly', 'Nur Nachname')}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Spalte: {nameInfo.lastNameKey}
                  </div>
                </div>
              </label>
            )}

            {nameInfo.hasFirstName && nameInfo.hasLastName && (
              <label
                className={`${cardSurfaceClass} flex cursor-pointer items-start gap-3 border transition hover:border-blue-300 dark:hover:border-blue-700`}
              >
                <input
                  type="radio"
                  name="nameMode"
                  value="fullName"
                  checked={selectedMode === 'fullName'}
                  onChange={() => setSelectedMode('fullName')}
                  className="mt-1 h-4 w-4 border-blue-300 text-blue-600 focus:ring-blue-400 dark:border-blue-700"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900 transition group-hover:text-blue-700 dark:text-gray-100 dark:group-hover:text-blue-300">
                    {t('csvDialog.fullName', 'Vorname + Nachname')}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t('csvDialog.combineColumns', 'Spalten kombinieren')}
                  </div>
                </div>
              </label>
            )}
          </div>

          {/* Preview */}
          <div className={`${listContainerClass} space-y-2`}>
            <div className="border-b border-blue-100 pb-2 text-sm font-semibold text-gray-800 dark:border-blue-900/40 dark:text-gray-200">
              {t('csvDialog.preview', 'Vorschau')} (
              {t('csvDialog.firstRows', 'erste {{count}} Zeilen', {
                count: preview.length,
              })}
              )
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
        </div>

        {/* Footer */}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
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
      </div>
    </div>
  );
}
