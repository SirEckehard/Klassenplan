// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { lazy, Suspense, useEffect, useState } from 'react';
import { registerCsvFormatHelpHandler } from '@/utils/ui/csvFormatHelp';

// Only teachers who hit an import problem (or ask for the example) ever see
// this, so it stays out of the initial bundle.
const CsvFormatHelpDialog = lazy(
  () => import('@/components/students/CsvFormatHelpDialog'),
);

/**
 * App-wide host for the CSV format example. Mounted once in `App`; the import
 * service reaches it through `openCsvFormatHelp()` so a toast action can open
 * the dialog without prop drilling.
 */
export default function CsvFormatHelpHost() {
  const [open, setOpen] = useState(false);

  useEffect(() => registerCsvFormatHelpHandler(() => setOpen(true)), []);

  if (!open) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <CsvFormatHelpDialog open onClose={() => setOpen(false)} />
    </Suspense>
  );
}
