// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type React from 'react';
import { useTranslation } from 'react-i18next';
import { UsersIcon } from '@phosphor-icons/react';
import {
  InspectorBody,
  InspectorHeader,
  InspectorSection,
} from '@/components/shell/InspectorPanel';
import type { PlanUsage } from '@/types';
import { formatDate } from '@/utils';
import { isCountedUsage } from '@/utils/data/planUsage';
import { seatPairKey } from '@/utils/pairs';
import { IconTile, ValueRow } from './panelParts';
import { UsageRecordList } from './NeighboursPanel';

/**
 * Two students who sat next to each other: how often and when last, and the
 * plans it rests on — each of which can be taken out of the count here, as
 * in the neighbourhoods' own panel.
 */
export default function NeighbourPairPanel({
  studentName,
  neighbourName,
  studentId,
  neighbourId,
  planUsage,
  onSetConfirmed,
  media,
}: {
  studentName: string;
  neighbourName: string;
  studentId: string;
  neighbourId: string;
  planUsage: readonly PlanUsage[];
  onSetConfirmed: (usageId: string, confirmed: boolean) => void;
  /** What stands for the pair in place of the icon: their photos. */
  media?: React.ReactNode;
}) {
  const { t } = useTranslation('generator');
  const key = seatPairKey(studentId, neighbourId);
  const records = planUsage.filter((entry) => entry.pairs.includes(key));
  const counted = records.filter(isCountedUsage);
  const lastSeenAt = counted.reduce<string | null>(
    (latest, entry) =>
      latest === null || entry.lastSeenAt > latest ? entry.lastSeenAt : latest,
    null,
  );

  return (
    <>
      <InspectorHeader
        media={media ?? <IconTile icon={UsersIcon} />}
        title={t('storage.neighbors.pair', {
          a: studentName,
          b: neighbourName,
        })}
        subtitle={t('storage.neighbors.tab')}
      />
      <InspectorBody>
        <InspectorSection title={t('storage.neighbors.pairSection')}>
          <ValueRow label={t('storage.neighbors.together')}>
            {t('storage.neighbors.times', { count: counted.length })}
          </ValueRow>
          {lastSeenAt && (
            <ValueRow label={t('storage.neighbors.lastTogether')}>
              {formatDate(lastSeenAt)}
            </ValueRow>
          )}
        </InspectorSection>
        {records.length > 0 && (
          <InspectorSection title={t('storage.neighbors.basisTitle')}>
            <UsageRecordList
              records={records}
              onSetConfirmed={onSetConfirmed}
            />
          </InspectorSection>
        )}
      </InspectorBody>
    </>
  );
}
