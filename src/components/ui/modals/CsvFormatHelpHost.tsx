// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useEffect, useState } from 'react';
import { registerCsvFormatHelpHandler } from '@/utils/ui/csvFormatHelp';
import {
  loadOnDemand,
  reportChunkLoadFailure,
} from '@/utils/performance/chunkLoad';

// Only teachers who hit an import problem (or ask for the example) ever see
// this, so it stays out of the initial bundle. Not through `React.lazy`: the
// host sits above every page, and a chunk that cannot be fetched offline would
// take the whole app down to its error screen.
const csvFormatHelpDialog = loadOnDemand(
  () => import('@/components/students/CsvFormatHelpDialog'),
  'CsvFormatHelpHost',
);

type CsvFormatHelpDialogComponent =
  typeof import('@/components/students/CsvFormatHelpDialog').default;

/**
 * App-wide host for the CSV format example. Mounted once in `App`; the import
 * service reaches it through `openCsvFormatHelp()` so a toast action can open
 * the dialog without prop drilling.
 */
export default function CsvFormatHelpHost() {
  const [Dialog, setDialog] = useState<CsvFormatHelpDialogComponent | null>(
    null,
  );
  const [open, setOpen] = useState(false);

  useEffect(
    () =>
      registerCsvFormatHelpHandler(() => {
        csvFormatHelpDialog.load().then(
          (module) => {
            setDialog(() => module.default);
            setOpen(true);
          },
          (error: unknown) => {
            reportChunkLoadFailure(error, 'CsvFormatHelpHost');
          },
        );
      }),
    [],
  );

  if (!open || !Dialog) {
    return null;
  }

  return <Dialog open onClose={() => setOpen(false)} />;
}
