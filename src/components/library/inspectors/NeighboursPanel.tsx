// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { UsersThreeIcon } from '@phosphor-icons/react';
import {
  InspectorBody,
  InspectorHeader,
} from '@/components/shell/InspectorPanel';
import NeighborhoodMatrix from '@/components/ui/history/NeighborhoodMatrix';
import { usePlanUsageRecords } from '@/hooks/plan/usePlanUsageRecords';
import type { Student } from '@/types';
import { logError } from '@/utils';
import { showToast } from '@/utils/ui/toast';
import { IconTile } from './panelParts';

/**
 * Who has sat next to whom in a class, across all its rooms — the plans that
 * were really in use (decision 0010). "Zurücksetzen" starts afresh in one
 * click, and the message after it takes it back (decision 0023).
 */
export default function NeighboursPanel({
  classId,
  className,
  students,
}: {
  classId: string;
  className: string;
  students: Student[];
}) {
  const { t } = useTranslation('generator');
  const {
    planUsage,
    planUsageSince,
    setUsageConfirmed,
    resetUsage,
    undoReset,
  } = usePlanUsageRecords(classId);

  const handleReset = React.useCallback(() => {
    resetUsage()
      .then((snapshot) => {
        if (!snapshot) return;
        showToast('info', 'toast:planUsage.reset', {
          duration: 8000,
          action: {
            label: t('toast:planUsage.resetAction'),
            onClick: () => {
              undoReset(snapshot)
                .then(() => showToast('success', 'toast:planUsage.resetUndone'))
                .catch((error: unknown) => {
                  logError(
                    'Undoing the neighbourhood reset failed',
                    { error },
                    'NeighboursPanel',
                  );
                });
            },
          },
        });
      })
      .catch((error: unknown) => {
        logError(
          'Resetting the neighbourhoods failed',
          { error },
          'NeighboursPanel',
        );
      });
  }, [resetUsage, t, undoReset]);

  return (
    <>
      <InspectorHeader
        media={<IconTile icon={UsersThreeIcon} />}
        title={t('storage.neighbors.tab')}
        subtitle={className}
      />
      <InspectorBody>
        <NeighborhoodMatrix
          planUsage={planUsage}
          students={students}
          onSetConfirmed={setUsageConfirmed}
          resetAt={planUsageSince}
          onReset={handleReset}
        />
      </InspectorBody>
    </>
  );
}
