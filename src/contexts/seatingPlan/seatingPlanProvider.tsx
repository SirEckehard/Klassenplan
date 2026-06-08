// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useSeatingGenerator } from '@/hooks/useSeatingGenerator';
import {
  SeatingPlanStoreContext,
  useSeatingPlanStoreValue,
} from './seatingPlanSelectors';

/**
 * SeatingPlanStoreProvider builds the snapshot store that powers every context selector.
 * It keeps `state`/`actions` from `useSeatingGenerator` in sync with `useSyncExternalStore`
 * consumers so individual domains can subscribe without forcing global re-renders.
 */
export function SeatingPlanStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { state, actions } = useSeatingGenerator();
  const store = useSeatingPlanStoreValue(state, actions);

  return (
    <SeatingPlanStoreContext.Provider value={store}>
      {children}
    </SeatingPlanStoreContext.Provider>
  );
}
