// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { PlanFeedbackFlow } from '@/hooks/plan/usePlanFeedbackFlow';

/**
 * How the plan on the stage went, as the plan layer gives it (decision 0054):
 * the table view, which owns "Mischen", holds the flow, and the plan's
 * inspector reads it, so the row there, the tables on the stage and the
 * question before a mix say the same. Outside that view there is none.
 */
export const PlanFeedbackContext = React.createContext<PlanFeedbackFlow | null>(
  null,
);

/** The plan layer's feedback flow, or null outside the table view. */
export function usePlanFeedback(): PlanFeedbackFlow | null {
  return React.useContext(PlanFeedbackContext);
}
