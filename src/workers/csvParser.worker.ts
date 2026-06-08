// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import Papa from 'papaparse';
import { normalizeCsvHeader } from '@/utils/data/csvNormalization';

type CsvWorkerRequest =
  | { type: 'parse'; payload: { file: File; previewRows?: number } }
  | { type: 'cancel' };

type CsvWorkerResponse =
  | { type: 'complete'; payload: Papa.ParseResult<Record<string, unknown>> }
  | { type: 'error'; payload: { message: string } };

const postError = (message: string): void => {
  postMessage({
    type: 'error',
    payload: { message },
  } satisfies CsvWorkerResponse);
};

const handleParse = (file: File, previewRows?: number): void => {
  try {
    Papa.parse<Record<string, unknown>>(file, {
      worker: false,
      header: true,
      skipEmptyLines: true,
      preview: previewRows,
      transformHeader: normalizeCsvHeader,
      complete: (results) => {
        postMessage({
          type: 'complete',
          payload: results,
        } satisfies CsvWorkerResponse);
        close();
      },
      error: (error: unknown) => {
        const message =
          error instanceof Error
            ? error.message
            : 'CSV worker encountered an unknown error';
        postError(message);
        close();
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'CSV worker failed to start parsing';
    postError(message);
    close();
  }
};

addEventListener('message', (event: MessageEvent<CsvWorkerRequest>) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'cancel') {
    close();
    return;
  }

  if (data.type === 'parse') {
    handleParse(data.payload.file, data.payload.previewRows);
  }
});
