// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileArrowUpIcon, SealCheckIcon } from '@phosphor-icons/react';
import type {
  CsvImportSelection,
  NameColumnMode,
  NameColumnInfo,
} from '@/utils/data/csvUtils';
import type { CsvPreset } from '@/utils/csv/csvPresets';
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
  selectFieldClass,
} from '@/utils';

type NameColumnSelectionDialogProps = {
  open: boolean;
  nameInfo: NameColumnInfo;
  previewData: Array<Record<string, unknown>>;
  /** Recognised export format, or null when the headings identify none. */
  preset?: CsvPreset | null;
  /** Class names to pick from; empty when the file holds a single class. */
  classOptions?: string[];
  /** Header of the class column, used to preview one class at a time. */
  classKey?: string;
  onConfirm: (selection: CsvImportSelection) => void;
  onCancel: () => void;
};

/** How many example names the preview shows. */
const PREVIEW_ROW_COUNT = 3;

type ModeOption = {
  mode: NameColumnMode;
  title: string;
  hint: string;
};

/**
 * Asks everything that has to be settled before a class list can be imported:
 * which name column(s) to read, and — for exports carrying a whole school —
 * which class is meant.
 *
 * A recognised export format is named rather than applied silently. Getting the
 * recognition wrong would produce a plausible-looking but wrong seating plan,
 * so the teacher can always turn it off here.
 */
export default function NameColumnSelectionDialog({
  open,
  nameInfo,
  previewData,
  preset = null,
  classOptions = [],
  classKey,
  onConfirm,
  onCancel,
}: NameColumnSelectionDialogProps) {
  const { t } = useTranslation('students');

  const modeOptions = useMemo<ModeOption[]>(() => {
    const options: ModeOption[] = [];
    const column = t('csvDialog.column');

    if (nameInfo.hasFirstName) {
      options.push({
        mode: 'firstName',
        title: t('csvDialog.firstNameOnly'),
        hint: `${column}: ${nameInfo.firstNameKey}`,
      });
    }
    if (nameInfo.hasLastName) {
      options.push({
        mode: 'lastName',
        title: t('csvDialog.lastNameOnly'),
        hint: `${column}: ${nameInfo.lastNameKey}`,
      });
    }
    if (nameInfo.hasFirstName && nameInfo.hasLastName) {
      options.push({
        mode: 'fullName',
        title: t('csvDialog.fullName'),
        hint: t('csvDialog.combineColumns'),
      });
    }
    if (nameInfo.hasFullName) {
      options.push({
        mode: 'nameColumn',
        title: t('csvDialog.nameColumnOnly'),
        hint: `${column}: ${nameInfo.fullNameKey}`,
      });
    }
    return options;
  }, [nameInfo, t]);

  const [selectedMode, setSelectedMode] = useState<NameColumnMode>(() => {
    const preferred = preset?.defaultNameMode;
    if (preferred && modeOptions.some((option) => option.mode === preferred)) {
      return preferred;
    }
    return modeOptions[0]?.mode ?? 'firstName';
  });
  const [selectedClass, setSelectedClass] = useState<string>(
    () => classOptions[0] ?? '',
  );
  const [applyPreset, setApplyPreset] = useState(true);

  const needsNameChoice = modeOptions.length > 1;
  const needsClassChoice = classOptions.length > 0;

  // Guards against a mode that no longer has an option to back it.
  const effectiveMode = modeOptions.some(
    (option) => option.mode === selectedMode,
  )
    ? selectedMode
    : (modeOptions[0]?.mode ?? 'firstName');

  const handleConfirm = () => {
    onConfirm({
      mode: modeOptions.length > 0 ? effectiveMode : undefined,
      className: needsClassChoice ? selectedClass : undefined,
      usePreset: preset && !applyPreset ? false : undefined,
    });
  };

  const getPreviewName = (row: Record<string, unknown>): string => {
    const readCell = (key?: string): string =>
      key ? String(row[key] ?? '').trim() : '';

    if (effectiveMode === 'firstName') return readCell(nameInfo.firstNameKey);
    if (effectiveMode === 'lastName') return readCell(nameInfo.lastNameKey);
    if (effectiveMode === 'nameColumn') return readCell(nameInfo.fullNameKey);
    return `${readCell(nameInfo.firstNameKey)} ${readCell(nameInfo.lastNameKey)}`.trim();
  };

  // Previewing the class that is actually going to be imported — the first rows
  // of the file usually belong to a different one.
  const previewRows = useMemo(() => {
    const scoped =
      classKey && selectedClass
        ? previewData.filter(
            (row) => String(row[classKey] ?? '').trim() === selectedClass,
          )
        : previewData;
    return (scoped.length > 0 ? scoped : previewData).slice(
      0,
      PREVIEW_ROW_COUNT,
    );
  }, [classKey, previewData, selectedClass]);

  const preview = previewRows.map((row) => getPreviewName(row));

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={
        needsNameChoice
          ? t('csvDialog.selectColumns', 'Namens-Spalten auswählen')
          : t('csvDialog.selectClass')
      }
      subtitle={
        needsNameChoice
          ? t(
              'csvDialog.description',
              'Die CSV-Datei enthält mehrere Namens-Spalten. Bitte wähle, welche Kombination importiert werden soll:',
            )
          : t('csvDialog.classDescription')
      }
      icon={<FileArrowUpIcon size={24} aria-hidden="true" />}
      size="md"
    >
      {preset && (
        <div
          className={`${cardSurfaceClass} border border-green-200/70 dark:border-green-900/50`}
        >
          <p className="flex items-center gap-2 text-sm font-semibold text-green-800 dark:text-green-200">
            <SealCheckIcon size={18} aria-hidden="true" />
            {t('csvDialog.presetDetected', { vendor: preset.vendor })}
          </p>
          <p className="mt-1 text-xs text-green-800 dark:text-green-200">
            {t('csvDialog.presetNote')}
          </p>
          <label className="mt-2 flex items-center gap-2 text-xs text-green-900 dark:text-green-100">
            <input
              type="checkbox"
              checked={!applyPreset}
              onChange={(event) => setApplyPreset(!event.target.checked)}
              className={optionRadioClass}
            />
            {t('csvDialog.presetIgnore')}
          </label>
        </div>
      )}

      {needsClassChoice && (
        <div className="space-y-2">
          <label
            htmlFor="csv-class-select"
            className="block text-sm font-semibold text-gray-800 dark:text-gray-200"
          >
            {t('csvDialog.classLabel')}
          </label>
          <select
            id="csv-class-select"
            value={selectedClass}
            onChange={(event) => setSelectedClass(event.target.value)}
            className={selectFieldClass}
          >
            {classOptions.map((className) => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('csvDialog.classHint', { count: classOptions.length })}
          </p>
        </div>
      )}

      {needsNameChoice && (
        <div className="space-y-3">
          {modeOptions.map((option) => (
            <label key={option.mode} className={optionCardClass}>
              <input
                type="radio"
                name="nameMode"
                value={option.mode}
                checked={effectiveMode === option.mode}
                onChange={() => setSelectedMode(option.mode)}
                className={optionRadioClass}
              />
              <span className="min-w-0 flex-1">
                <span className={`block ${optionCardTitleClass}`}>
                  {option.title}
                </span>
                <span className={`block ${optionCardHintClass}`}>
                  {option.hint}
                </span>
              </span>
            </label>
          ))}
        </div>
      )}

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
