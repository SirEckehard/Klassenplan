// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MagicWandIcon, SpinnerGapIcon, XIcon } from '@phosphor-icons/react';
import SeatingHistoryToolbar from '@/components/SeatingPlanGenerator/canvas/SeatingHistoryToolbar';
import FloatingMixButton from '@/components/ui/buttons/FloatingMixButton';
import { useSeatingAlgorithmContext } from '@/contexts/SeatingPlanContext';
import {
  MANUAL_REFINE_PASSES,
  MANUAL_REFINE_TRIES_PER_PASS,
  floatingStatusClass,
  logError,
  neutralButtonClass,
  secondaryButtonClass,
} from '@/utils';
import type { MixStatus } from '@/hooks/useSeatingMixHandler';
import { showToast, TOAST_MESSAGES } from '@/utils/ui/toast';

interface SeatingCanvasToolbarProps {
  onMix: () => Promise<void>;
  isMixing: boolean;
  /** Progress of the running mix; `null` while idle. */
  mixStatus: MixStatus | null;
  onCancelMix: () => void;
}

/**
 * Canvas overlay row for step 3: undo/redo, mix, and "optimise further".
 *
 * Reads its actions from the algorithm context rather than through props —
 * `SeatingPlanEditorView` already carries ~50 of them, and none of these are
 * needed anywhere else.
 *
 * Sits where the layout editor puts its undo/redo, so the same gesture works
 * in both steps.
 */
export default function SeatingCanvasToolbar({
  onMix,
  isMixing,
  mixStatus,
  onCancelMix,
}: SeatingCanvasToolbarProps) {
  const { t } = useTranslation('generator');
  const { refineCurrentSeating, currentSeating, mixSettings } =
    useSeatingAlgorithmContext();
  const [isRefining, setIsRefining] = React.useState(false);

  // Refinement scores against the mix criteria; with none active there is
  // nothing to optimise towards.
  const hasCriteria = React.useMemo(
    () => Object.values(mixSettings).some((value) => Number(value) > 0),
    [mixSettings],
  );
  const canRefine =
    !isRefining && !isMixing && currentSeating.length > 0 && hasCriteria;

  const handleRefine = React.useCallback(async () => {
    if (!canRefine) {
      return;
    }
    setIsRefining(true);
    try {
      await refineCurrentSeating({
        triesPerPass: MANUAL_REFINE_TRIES_PER_PASS,
        passes: MANUAL_REFINE_PASSES,
      });
    } catch (error) {
      logError('Manual refinement failed', { error }, 'SeatingCanvasToolbar');
      showToast('error', TOAST_MESSAGES.GENERATION_ERROR);
    } finally {
      setIsRefining(false);
    }
  }, [canRefine, refineCurrentSeating]);

  const progressPercent = Math.round((mixStatus?.progress ?? 0) * 100);

  const refineTitle = hasCriteria
    ? t(
        'editor.refineTitle',
        'Aktuellen Sitzplan in kleinen Schritten verfeinern',
      )
    : t(
        'editor.refineNoCriteria',
        'Aktiviere zuerst mindestens ein Mischkriterium in der Seitenleiste.',
      );

  return (
    <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2">
      <SeatingHistoryToolbar />
      <FloatingMixButton
        onMix={onMix}
        isLoading={isMixing}
        disabled={isMixing}
      />
      <button
        type="button"
        onClick={() => void handleRefine()}
        disabled={!canRefine}
        className={`${secondaryButtonClass} h-9 gap-2 px-3 disabled:cursor-not-allowed disabled:opacity-60`}
        title={refineTitle}
        aria-label={t('editor.refineLabel', 'Sitzplan verfeinern')}
      >
        {isRefining ? (
          <SpinnerGapIcon size={18} className="animate-spin" aria-hidden />
        ) : (
          <MagicWandIcon size={18} aria-hidden />
        )}
        <span className="hidden text-sm sm:inline">
          {t('editor.refineButton', 'Verfeinern')}
        </span>
      </button>
      {mixStatus ? (
        <div
          className={`${floatingStatusClass} flex h-9 items-center gap-2 px-3`}
          role="status"
          aria-live="polite"
        >
          <span className="text-xs whitespace-nowrap">{mixStatus.message}</span>
          <span
            className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
            aria-label={t('mixButton.progressLabel')}
          >
            <span
              className="block h-full rounded-full bg-blue-600 transition-[width] duration-200 dark:bg-blue-500"
              style={{ width: `${Math.max(progressPercent, 4)}%` }}
            />
          </span>
          <span className="text-xs tabular-nums">{progressPercent}%</span>
          {/* The full bar lingers for a moment after the mix is done; there is
              nothing left to cancel at that point. */}
          {mixStatus.progress < 1 ? (
            <button
              type="button"
              onClick={onCancelMix}
              className={`${neutralButtonClass} h-6 gap-1 px-2 text-xs`}
              title={t('mixButton.cancelTitle')}
            >
              <XIcon size={12} aria-hidden />
              {t('common.cancel')}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
