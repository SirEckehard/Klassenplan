// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import i18n from '@/i18n';
import { confirmInStatusBar } from './statusNotice';

/**
 * A plan was saved: its inspector's head says so where it shows ("Heute
 * gespeichert"), the status bar's line where it does not, and a screen
 * reader hears the name (decision 0037).
 */
export function announcePlanSaved(finalName: string): void {
  confirmInStatusBar(
    'planSaved',
    i18n.t('toast:plan.saved', { name: finalName }),
  );
}
