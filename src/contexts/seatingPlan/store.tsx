// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
export type {
  SeatingPlanState,
  SeatingPlanActions,
  SeatingPlanSnapshot,
  SeatingPlanCombined,
  SeatingPlanStoreValue,
} from './seatingPlanTypes';

export {
  SeatingPlanStoreContext,
  shallowEqual,
  useSeatingPlanStoreValue,
  useSeatingPlanSelector,
  useSeatingPlanState,
  useOptionalSeatingPlanState,
  useOptionalSeatingPlanActions,
  useSeatingPlanActions,
  useSeatingPlan,
} from './seatingPlanSelectors';

export { SeatingPlanStoreProvider } from './seatingPlanProvider';
