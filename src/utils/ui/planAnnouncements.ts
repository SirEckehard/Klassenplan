// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import i18n from '@/i18n';
import { showToast } from './toast';

export function announcePlanSaved(finalName: string): void {
  showToast('success', i18n.t('toast:plan.saved', { name: finalName }));
}
