// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  HardDriveIcon,
  ClockCounterClockwiseIcon,
  ShuffleIcon,
} from '@phosphor-icons/react';
import Modal from '@/components/ui/modals/Modal';
import CompactPlanList from '@/components/ui/history/CompactPlanList';
import CompactMixHistory from '@/components/ui/history/CompactMixHistory';
import { useSeatingAlgorithmContext } from '@/contexts/SeatingPlanContext';
import {
  cardSurfaceClass,
  pillTabActiveClass,
  pillTabBaseClass,
  pillTabInactiveClass,
} from '@/utils';
import { showToast } from '@/utils/ui/toast';
import type { SavedPlan, MixResult } from '@/types';

type TabId = 'plans' | 'mixes';

interface StorageHistoryModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Modal showing saved plans and mix history.
 * Re-uses existing CompactPlanList and CompactMixHistory components.
 */
export default function StorageHistoryModal({
  open,
  onClose,
}: StorageHistoryModalProps) {
  const { t } = useTranslation('generator');
  const [activeTab, setActiveTab] = useState<TabId>('plans');

  const {
    seatingHistory,
    mixHistory,
    handleHistoryLoad,
    deleteSeatingPlan,
    renameSeatingPlan,
    handleMixLoad,
    deleteMixResult,
  } = useSeatingAlgorithmContext();

  // Plan handlers
  const handlePlanLoad = useCallback(
    (plan: SavedPlan) => {
      handleHistoryLoad(plan);
      showToast(
        'success',
        t('storage.planLoaded', 'Plan „{{name}}" geladen.', {
          name: plan.name,
        }),
      );
      onClose();
    },
    [handleHistoryLoad, t, onClose],
  );

  const handlePlanDelete = useCallback(
    (plan: SavedPlan) => {
      deleteSeatingPlan(plan.id);
      showToast(
        'success',
        t('storage.planDeleted', 'Plan „{{name}}" gelöscht.', {
          name: plan.name,
        }),
      );
    },
    [deleteSeatingPlan, t],
  );

  const handlePlanRename = useCallback(
    (planId: string, newName: string): boolean => {
      renameSeatingPlan(planId, newName);
      return true;
    },
    [renameSeatingPlan],
  );

  // Mix handlers
  const handleMixLoadAction = useCallback(
    (result: MixResult) => {
      handleMixLoad(result);
      const date = new Date(result.timestamp).toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
      });
      showToast(
        'success',
        t('storage.mixLoaded', 'Mischergebnis von {{time}} geladen.', {
          time: date,
        }),
      );
      onClose();
    },
    [handleMixLoad, t, onClose],
  );

  const handleMixDelete = useCallback(
    (id: number) => {
      deleteMixResult(id);
      showToast('success', t('storage.mixDeleted', 'Mischergebnis gelöscht.'));
    },
    [deleteMixResult, t],
  );

  const hasPlans = seatingHistory.length > 0;
  const hasMixes = mixHistory.length > 0;

  const tabContainerClass =
    'flex gap-2 rounded-full border border-blue-200 bg-white/80 p-1 shadow-inner dark:border-blue-900/50 dark:bg-gray-950/60';

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={<HardDriveIcon size={24} aria-hidden="true" />}
      title={t('storage.historyTitle', 'Gespeicherte Pläne & Misch-Historie')}
      size="lg"
    >
      <div className="mt-2 flex flex-col gap-4">
        {/* Tab Switcher */}
        <div role="tablist" aria-label="Historie" className={tabContainerClass}>
          <button
            role="tab"
            id="storage-tab-plans"
            aria-selected={activeTab === 'plans'}
            aria-controls="storage-panel-plans"
            className={[
              pillTabBaseClass,
              activeTab === 'plans' ? pillTabActiveClass : pillTabInactiveClass,
            ].join(' ')}
            onClick={() => setActiveTab('plans')}
            type="button"
          >
            <ClockCounterClockwiseIcon size={14} className="mr-1.5" />
            {t('storage.savedPlans', 'Gespeicherte Pläne')}
            {hasPlans && (
              <span className="ml-1.5 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                {seatingHistory.length}
              </span>
            )}
          </button>
          <button
            role="tab"
            id="storage-tab-mixes"
            aria-selected={activeTab === 'mixes'}
            aria-controls="storage-panel-mixes"
            className={[
              pillTabBaseClass,
              activeTab === 'mixes' ? pillTabActiveClass : pillTabInactiveClass,
            ].join(' ')}
            onClick={() => setActiveTab('mixes')}
            type="button"
          >
            <ShuffleIcon size={14} className="mr-1.5" />
            {t('storage.mixHistory', 'Misch-Historie')}
            {hasMixes && (
              <span className="ml-1.5 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                {mixHistory.length}
              </span>
            )}
          </button>
        </div>

        {/* Plans Panel */}
        <div
          id="storage-panel-plans"
          role="tabpanel"
          aria-labelledby="storage-tab-plans"
          hidden={activeTab !== 'plans'}
          className={`${cardSurfaceClass} border px-4 py-4`}
        >
          {hasPlans ? (
            <CompactPlanList
              plans={seatingHistory}
              onLoad={handlePlanLoad}
              onDelete={handlePlanDelete}
              onRename={handlePlanRename}
            />
          ) : (
            <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              {t('storage.noPlans', 'Keine gespeicherten Pläne vorhanden.')}
            </p>
          )}
        </div>

        {/* Mixes Panel */}
        <div
          id="storage-panel-mixes"
          role="tabpanel"
          aria-labelledby="storage-tab-mixes"
          hidden={activeTab !== 'mixes'}
          className={`${cardSurfaceClass} border px-4 py-4`}
        >
          {hasMixes ? (
            <CompactMixHistory
              mixHistory={mixHistory}
              onLoad={handleMixLoadAction}
              onDelete={handleMixDelete}
            />
          ) : (
            <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              {t('storage.noMixes', 'Keine Misch-Ergebnisse vorhanden.')}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
