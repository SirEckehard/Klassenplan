// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useMemo } from 'react';
import { useSeatingPlanState } from '@/contexts/SeatingPlanContext';
import type { SavedPlan } from '@/types';

/**
 * The saved plan on screen, or `undefined` while the plan on screen has never
 * been saved.
 *
 * Found by `activePlanId`, the id a save writes to (`resolvePlanSlot`), not by
 * the name: looked up by name while the persistence goes by id, the panel and
 * the exits could see another plan than a save writes to, and the panel would
 * offer a rename the persistence then refuses.
 */
export function useOpenPlan(): SavedPlan | undefined {
  const { activePlanId, seatingHistory } = useSeatingPlanState();
  return useMemo(
    () =>
      activePlanId
        ? seatingHistory.find((plan) => plan.id === activePlanId)
        : undefined,
    [activePlanId, seatingHistory],
  );
}
