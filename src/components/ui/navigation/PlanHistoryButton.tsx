// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClockCounterClockwiseIcon } from '@phosphor-icons/react';
import StorageHistoryModal from '@/components/ui/navigation/StorageHistoryModal';
import { iconButtonClass } from '@/utils';

interface PlanHistoryButtonProps {
  /** Additional layout classes for the button. */
  className?: string;
}

/**
 * Opens the saved plans / shuffle history modal from within the generator.
 *
 * The same modal is reachable through the footer settings menu, but step 3 is
 * where loading an earlier plan actually matters, so the action lives next to
 * the save field as well.
 */
export default function PlanHistoryButton({
  className = '',
}: PlanHistoryButtonProps) {
  const { t } = useTranslation('generator');
  const [open, setOpen] = useState(false);
  const label = t(
    'storage.historyTitle',
    'Gespeicherte Pläne & Misch-Historie',
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        aria-haspopup="dialog"
        title={label}
        className={`${iconButtonClass} w-full justify-center gap-2 sm:w-auto ${className}`.trimEnd()}
      >
        <ClockCounterClockwiseIcon className="h-5 w-5" aria-hidden="true" />
        {/* The icon alone carries the meaning once the bar is horizontal. */}
        <span className="text-sm font-medium sm:hidden">
          {t('storage.savedPlans', 'Gespeicherte Pläne')}
        </span>
      </button>
      <StorageHistoryModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
