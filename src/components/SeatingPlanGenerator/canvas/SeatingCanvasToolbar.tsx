// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MagicWandIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import SeatingHistoryToolbar from '@/components/SeatingPlanGenerator/canvas/SeatingHistoryToolbar';
import FloatingMixButton from '@/components/ui/buttons/FloatingMixButton';
import { useSeatingAlgorithmContext } from '@/contexts/SeatingPlanContext';
import {
  MANUAL_REFINE_PASSES,
  MANUAL_REFINE_TRIES_PER_PASS,
  logError,
  secondaryButtonClass,
} from '@/utils';
import { showToast, TOAST_MESSAGES } from '@/utils/ui/toast';

interface SeatingCanvasToolbarProps {
  onMix: () => Promise<void>;
  isMixing: boolean;
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

  const refineTitle = hasCriteria
    ? t(
        'editor.refineTitle',
        'Aktuellen Sitzplan weiter verbessern, ohne neu zu mischen',
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
        aria-label={t('editor.refineLabel', 'Sitzplan weiter optimieren')}
      >
        {isRefining ? (
          <SpinnerGapIcon size={18} className="animate-spin" aria-hidden />
        ) : (
          <MagicWandIcon size={18} aria-hidden />
        )}
        <span className="hidden text-sm sm:inline">
          {t('editor.refineButton', 'Optimieren')}
        </span>
      </button>
    </div>
  );
}
