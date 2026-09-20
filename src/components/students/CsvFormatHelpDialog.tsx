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
      <div className="overflow-x-auto rounded-2xl border border-(--border-card) bg-(--surface-card) shadow-inner">
        <table className="w-full min-w-max border-collapse text-left text-xs sm:text-sm">
          <caption className="sr-only">{t('csvHelp.tableCaption')}</caption>
          <thead>
            <tr className="bg-(--surface-option-selected)">
              <td
                aria-hidden="true"
                className="w-10 border-b border-r border-(--border-card) px-2 py-2 text-center font-mono text-xs text-(--text-badge)"
              >
                1
              </td>
              {headers.map((header, index) => (
                <th
                  key={header}
                  scope="col"
                  className="border-b border-(--border-card) px-3 py-2 font-semibold whitespace-nowrap text-(--text-page)"
                >
                  {header}
                  {index === 0 && (
                    <span className="ml-2 rounded-full bg-(--button-primary-bg) px-2 py-0.5 text-xs font-semibold text-(--button-primary-text)">
                      {t('csvHelp.requiredBadge')}
                    </span>
                  )}
                </th>
              ))}
              <th
                scope="col"
                className="border-b border-l border-(--border-card) px-3 py-2 font-normal whitespace-nowrap text-(--text-badge)"
              >
                {t('csvHelp.moreColumns')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((cells, rowIndex) => (
              <tr key={cells[0]} className="odd:bg-(--surface-sunken)">
                <td
                  aria-hidden="true"
                  className="border-r border-(--border-card) px-2 py-2 text-center font-mono text-xs text-(--text-badge)"
                >
                  {rowIndex + 2}
                </td>
                {cells.map((cell, cellIndex) => (
                  <td
                    key={`${cells[0]}-${cellIndex}`}
                    className={`px-3 py-2 whitespace-nowrap text-(--text-page) ${
                      cellIndex === 0 ? 'font-medium' : ''
                    }`}
                  >
                    {cell}
                  </td>
                ))}
                <td
                  aria-hidden="true"
                  className="border-l border-(--border-card) px-3 py-2 text-(--text-muted)"
                >
                  …
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-2 text-sm text-(--text-page)">
        {['headerRow', 'oneRow', 'optional', 'saveAs'].map((rule) => (
          <li key={rule} className="flex items-start gap-2">
            <span
              aria-hidden="true"
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-(--button-primary-bg)"
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
        <p className="text-sm text-(--text-muted)">{t('csvHelp.rawTitle')}</p>
        <pre className="overflow-x-auto rounded-lg bg-(--text-page) p-4 text-xs leading-relaxed text-(--surface-card)">
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
