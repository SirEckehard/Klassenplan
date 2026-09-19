// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import {
  useSeatingPlanState,
  useSeatingPlanActions,
} from '@/contexts/SeatingPlanContext';

/**
 * The plan's name, beside the class it belongs to.
 *
 * It used to sit in a form under the canvas, next to a save button, which made
 * naming feel like a step of saving rather than a property of the thing on
 * screen. In the header it reads as what it is: the class is the document, the
 * plan is the version of it currently open. Saving moved to the toolbar and
 * keeps its Ctrl/Cmd+S.
 *
 * Below `md` it stands down — a phone header has no room, and a plan saved
 * without a name gets a timestamp, exactly as before.
 */
export default function HeaderPlanName() {
  const { planName, planNameError, planNameInputRef } = useSeatingPlanState();
  const { setPlanName, setPlanNameError } = useSeatingPlanActions();
  const { t } = useTranslation('generator');

  return (
    <input
      ref={planNameInputRef}
      type="text"
      value={planName}
      onChange={(event) => {
        setPlanName(event.target.value);
        if (planNameError) setPlanNameError(false);
      }}
      placeholder={t('circle.planNamePlaceholder')}
      aria-label={t('circle.planNameLabel')}
      aria-invalid={planNameError || undefined}
      className={`hidden h-9 w-40 rounded-lg border bg-transparent px-2.5 text-sm text-(--text-page) placeholder:text-(--text-muted) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary) md:block lg:w-56 ${
        planNameError
          ? 'border-(--button-danger-bg)'
          : 'border-transparent hover:border-(--border-card)'
      }`}
    />
  );
}
