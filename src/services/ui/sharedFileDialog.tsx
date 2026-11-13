// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import i18n from '@/i18n';
import { ENTITY_ICONS } from '@/components/shell/entityIcons';
import type { ConfirmFact } from '@/components/ui/modals/ConfirmDialog';
import { tableFacts } from '@/components/ui/modals/confirmFacts';
import type { MixPresetWeights } from '@/types';
import type { SharedFile } from '@/utils/data/shareFiles';
import { recipeLevels } from '@/utils';
import { confirmDialog } from './dialogs';

/** The criteria a preset sets, by level: "Sehr wichtig 2", "Wichtig 3" … */
function presetFacts(weights: MixPresetWeights): ConfirmFact[] {
  const levels = recipeLevels(weights);
  return (['essential', 'important', 'consider'] as const).map((level) => ({
    label: i18n.t(`generator:mix.importance.${level}`),
    count: levels[level].length,
  }));
}

/**
 * Asks before a room template's or a preset's file is added (decision 0046),
 * naming what it brings under the name it will get. Loaded when such a file
 * is opened, as the backup's dialogs are.
 */
export function confirmSharedFile(
  shared: SharedFile,
  name: string,
): Promise<boolean> {
  if (shared.kind === 'template') {
    const seats = shared.scene.tables.reduce(
      (sum, table) => sum + table.seatCount,
      0,
    );
    return confirmDialog({
      title: i18n.t('generator:library.share.templateQuestion', { name }),
      icon: ENTITY_ICONS.template,
      meta: i18n.t('generator:library.share.templateMeta'),
      facts: tableFacts(shared.scene.tables.length, seats),
      message: i18n.t('generator:library.share.templateMessage'),
      confirmLabel: i18n.t('generator:library.share.take'),
      tone: 'primary',
    });
  }
  return confirmDialog({
    title: i18n.t('generator:library.share.presetQuestion', { name }),
    icon: ENTITY_ICONS.preset,
    meta: i18n.t('generator:library.share.presetMeta'),
    facts: presetFacts(shared.weights),
    message: i18n.t('generator:library.share.presetMessage'),
    confirmLabel: i18n.t('generator:library.share.take'),
    tone: 'primary',
  });
}
