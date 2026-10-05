// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { ShuffleIcon } from '@phosphor-icons/react';
import {
  InspectorBody,
  InspectorHeader,
  InspectorSection,
} from '@/components/shell/InspectorPanel';
import type { MixResult } from '@/types';
import {
  criterionImportance,
  criterionWeight,
  formatDateAndTime,
  SCALAR_MIX_SETTING_KEYS,
} from '@/utils';
import { CRITERIA_ICON_MAP } from '@/utils/ui/criteriaIcons';
import { DeleteFooter, IconTile } from './panelParts';

/**
 * A recent mix: when it was made and in which room, the criteria it was
 * mixed by in words — a mix keeps no tables of its own, so one that no
 * longer fits its room says so — and removing it.
 */
export default function MixPanel({
  mix,
  roomName,
  fits,
  onDelete,
}: {
  mix: MixResult;
  roomName?: string;
  /** Whether it still fits the tables of the room it was made in. */
  fits: boolean;
  onDelete: () => void;
}) {
  const { t } = useTranslation('generator');
  // The second distractibility weight is part of "distractibility", not a
  // criterion of its own, as the criteria panel has it.
  const active = SCALAR_MIX_SETTING_KEYS.filter(
    (key) => key !== 'avoidConcentrationNearRestless',
  ).filter((key) => criterionWeight(mix.mixSettings, key) > 0);

  return (
    <>
      <InspectorHeader
        media={<IconTile icon={ShuffleIcon} />}
        title={formatDateAndTime(mix.timestamp)}
        subtitle={roomName}
      />
      <InspectorBody>
        {!fits && (
          <p className="pb-3 text-xs leading-relaxed text-(--status-alert-text)">
            {t('toast:mix.doesNotFit')}
          </p>
        )}
        <InspectorSection title={t('library.mix.criteria')}>
          {active.length === 0 ? (
            <p className="text-[13px] text-(--text-muted)">
              {t('library.mix.random')}
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {active.map((key) => {
                const Icon = CRITERIA_ICON_MAP[key];
                return (
                  <li
                    key={key}
                    className="flex items-center gap-2 text-[13px] text-(--text-page)"
                  >
                    <Icon
                      size={14}
                      aria-hidden="true"
                      className="shrink-0 text-(--text-muted)"
                    />
                    <span className="min-w-0 flex-1">
                      {t(`mix.criteria.${key}.label`)}
                    </span>
                    <span className="shrink-0 text-xs text-(--text-muted)">
                      {t(
                        `mix.importance.${criterionImportance(mix.mixSettings, key)}`,
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </InspectorSection>
      </InspectorBody>
      <DeleteFooter label={t('library.mix.delete')} onDelete={onDelete} />
    </>
  );
}
