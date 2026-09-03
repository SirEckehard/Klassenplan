// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { DownloadSimpleIcon, TableIcon } from '@phosphor-icons/react';
import Modal from '@/components/ui/modals/Modal';
import {
  CSV_COLUMN_HEADERS,
  CSV_GENDER_LABELS,
  CSV_HEIGHT_LABELS,
  CSV_LANGUAGE_SKILL_LABELS,
  type CsvLanguage,
} from '@/utils/csv/csvSchema';
import {
  downloadCsvTemplate,
  getCsvExampleNames,
} from '@/utils/csv/csvTemplateDownload';
import { primaryButtonClass, secondaryButtonClass } from '@/utils';

type CsvFormatHelpDialogProps = {
  open: boolean;
  onClose: () => void;
};

/** Columns the example shows. The rest of the schema is optional anyway. */
const PREVIEW_COLUMN_COUNT = 4;

/**
 * The three example students, described by the schema's own value labels so the
 * preview can never show a spelling the parser would reject. Index `i` matches
 * example row `i` of the downloadable template.
 */
const EXAMPLE_ATTRIBUTES = [
  { gender: 'boy', height: 'medium', languageSkill: 'native' },
  { gender: 'girl', height: 'small', languageSkill: 'fluent' },
  { gender: 'boy', height: 'tall', languageSkill: 'beginner' },
] as const;

const buildExampleTable = (
  language: CsvLanguage,
): { headers: string[]; rows: string[][] } => {
  const names = getCsvExampleNames(language);
  return {
    headers: [...CSV_COLUMN_HEADERS[language]].slice(0, PREVIEW_COLUMN_COUNT),
    rows: EXAMPLE_ATTRIBUTES.map((attributes, index) => [
      names[index] ?? '',
      CSV_GENDER_LABELS[language][attributes.gender],
      CSV_HEIGHT_LABELS[language][attributes.height],
      CSV_LANGUAGE_SKILL_LABELS[language][attributes.languageSkill],
    ]),
  };
};

/**
 * Shows what a class list has to look like — as a table that reads like a
 * spreadsheet, plus the same data as plain text.
 *
 * Downloading the template answers the same question, but many teachers would
 * rather glance at an example than open a file, and after a failed import the
 * answer has to be one click away.
 */
export default function CsvFormatHelpDialog({
  open,
  onClose,
}: CsvFormatHelpDialogProps) {
  const { t, i18n } = useTranslation('students');
  const language: CsvLanguage = i18n.language?.startsWith('en') ? 'en' : 'de';

  const { headers, rows } = useMemo(
    () => buildExampleTable(language),
    [language],
  );
  const rawLines = useMemo(
    () => [headers, ...rows].map((cells) => cells.join(',')),
    [headers, rows],
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('csvHelp.title')}
      subtitle={t('csvHelp.subtitle')}
      icon={<TableIcon size={24} aria-hidden="true" />}
      size="lg"
    >
      <div className="overflow-x-auto rounded-2xl border border-blue-200/80 bg-white shadow-inner dark:border-blue-900/40 dark:bg-gray-900">
        <table className="w-full min-w-max border-collapse text-left text-xs sm:text-sm">
          <caption className="sr-only">{t('csvHelp.tableCaption')}</caption>
          <thead>
            <tr className="bg-blue-100/70 dark:bg-blue-950/50">
              <td
                aria-hidden="true"
                className="w-10 border-b border-r border-blue-200/80 px-2 py-2 text-center font-mono text-xs text-blue-500 dark:border-blue-900/40 dark:text-blue-300"
              >
                1
              </td>
              {headers.map((header, index) => (
                <th
                  key={header}
                  scope="col"
                  className="border-b border-blue-200/80 px-3 py-2 font-semibold whitespace-nowrap text-blue-900 dark:border-blue-900/40 dark:text-blue-100"
                >
                  {header}
                  {index === 0 && (
                    <span className="ml-2 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white dark:bg-blue-500">
                      {t('csvHelp.requiredBadge')}
                    </span>
                  )}
                </th>
              ))}
              <th
                scope="col"
                className="border-b border-l border-blue-200/80 px-3 py-2 font-normal whitespace-nowrap text-blue-500 dark:border-blue-900/40 dark:text-blue-300"
              >
                {t('csvHelp.moreColumns')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((cells, rowIndex) => (
              <tr
                key={cells[0]}
                className="odd:bg-gray-50/70 dark:odd:bg-gray-800/40"
              >
                <td
                  aria-hidden="true"
                  className="border-r border-blue-200/80 px-2 py-2 text-center font-mono text-xs text-blue-500 dark:border-blue-900/40 dark:text-blue-300"
                >
                  {rowIndex + 2}
                </td>
                {cells.map((cell, cellIndex) => (
                  <td
                    key={`${cells[0]}-${cellIndex}`}
                    className={`px-3 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200 ${
                      cellIndex === 0 ? 'font-medium' : ''
                    }`}
                  >
                    {cell}
                  </td>
                ))}
                <td
                  aria-hidden="true"
                  className="border-l border-blue-200/80 px-3 py-2 text-gray-400 dark:border-blue-900/40 dark:text-gray-500"
                >
                  …
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
        {['headerRow', 'oneRow', 'optional', 'saveAs'].map((rule) => (
          <li key={rule} className="flex items-start gap-2">
            <span
              aria-hidden="true"
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500"
            />
            <span className="leading-relaxed">
              <Trans
                i18nKey={`csvHelp.rules.${rule}`}
                ns="students"
                components={{ strong: <strong /> }}
              />
            </span>
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {t('csvHelp.rawTitle')}
        </p>
        <pre className="overflow-x-auto rounded-2xl bg-gray-900 p-4 text-xs leading-relaxed text-gray-100 dark:bg-gray-950">
          <code>{rawLines.join('\n')}</code>
        </pre>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => downloadCsvTemplate()}
          className={`${secondaryButtonClass} w-full justify-center gap-2`}
        >
          <DownloadSimpleIcon size={18} aria-hidden="true" />
          {t('csv.downloadTemplate')}
        </button>
        <button
          type="button"
          onClick={onClose}
          className={`${primaryButtonClass} w-full justify-center`}
        >
          {t('csvHelp.close')}
        </button>
      </div>
    </Modal>
  );
}
