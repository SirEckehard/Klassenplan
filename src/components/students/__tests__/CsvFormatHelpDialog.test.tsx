// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CsvFormatHelpDialog from '@/components/students/CsvFormatHelpDialog';
import { getButton } from '@/__tests__/utils';
import { CSV_COLUMN_HEADERS, resolveCsvLanguage } from '@/utils/csv/csvSchema';

vi.mock('@/utils/csv/csvTemplateDownload', async () => {
  const actual = await vi.importActual<
    typeof import('@/utils/csv/csvTemplateDownload')
  >('@/utils/csv/csvTemplateDownload');
  return { ...actual, downloadCsvTemplate: vi.fn() };
});
import {
  downloadCsvTemplate,
  getCsvExampleNames,
} from '@/utils/csv/csvTemplateDownload';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CsvFormatHelpDialog', () => {
  test('shows the schema headers and the template example students', () => {
    render(<CsvFormatHelpDialog open onClose={vi.fn()} />);

    const language = resolveCsvLanguage();

    // The name column is the required one, so it must lead the table.
    expect(screen.getAllByRole('columnheader')[0]).toHaveTextContent(
      CSV_COLUMN_HEADERS[language][0],
    );
    for (const name of getCsvExampleNames(language).slice(0, 3)) {
      expect(screen.getByRole('cell', { name })).toBeInTheDocument();
    }
  });

  test('repeats the example as plain text, comma separated', () => {
    render(<CsvFormatHelpDialog open onClose={vi.fn()} />);

    // The modal renders through a portal, so query the dialog, not the container.
    const raw =
      screen.getByRole('dialog').querySelector('pre')?.textContent ?? '';
    expect(raw.split('\n')).toHaveLength(4);
    expect(raw.split('\n')[0].split(',')).toHaveLength(4);
  });

  test('offers the template download as a second route', async () => {
    render(<CsvFormatHelpDialog open onClose={vi.fn()} />);

    await userEvent.click(getButton(/CSV-Vorlage|CSV template/i));

    expect(downloadCsvTemplate).toHaveBeenCalledTimes(1);
  });

  test('closes on the confirm button', async () => {
    const onClose = vi.fn();
    render(<CsvFormatHelpDialog open onClose={onClose} />);

    await userEvent.click(getButton(/Alles klar|Got it/i));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
