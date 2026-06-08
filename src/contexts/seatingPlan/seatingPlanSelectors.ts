// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/* eslint-disable react-hooks/refs -- refs used for store snapshots and subscriptions */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import { shallow } from 'zustand/shallow';
import type { SeatingPlanEqualityFn } from '@/hooks/useSeatingState';
import type {
  SeatingPlanState,
  SeatingPlanActions,
  SeatingPlanSnapshot,
  SeatingPlanCombined,
  SeatingPlanStoreValue,
} from './seatingPlanTypes';

export const SeatingPlanStoreContext =
  createContext<SeatingPlanStoreValue | null>(null);

const SELECTOR_ERROR =
  'useSeatingPlanSelector must be used within a SeatingPlanGeneratorProvider';

export function shallowEqual<T extends object>(a: T, b: T): boolean {
  return shallow(a, b);
}

export function useSeatingPlanStoreValue(
  state: SeatingPlanState,
  actions: SeatingPlanActions,
): SeatingPlanStoreValue {
  const combinedRef = useRef<SeatingPlanCombined>({
    ...state,
    ...actions,
  });
  const storeRef = useRef<SeatingPlanSnapshot>({
    state,
    actions,
    combined: combinedRef.current,
  });
  const listenersRef = useRef(new Set<() => void>());

  const combined = useMemo(() => {
    Object.assign(combinedRef.current, state, actions);
    return combinedRef.current;
  }, [state, actions]);

  const snapshot = useMemo(
    () => ({ state, actions, combined }),
    [state, actions, combined],
  );
  const hasChanged =
    storeRef.current.state !== snapshot.state ||
    storeRef.current.actions !== snapshot.actions;

  storeRef.current = snapshot;

  useEffect(() => {
    if (!hasChanged) {
      return;
    }
    listenersRef.current.forEach((listener) => listener());
  }, [hasChanged, snapshot]);

  const subscribe = useCallback((listener: () => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const getSnapshot = useCallback(() => storeRef.current, []);

  return useMemo(
    () => ({
      getSnapshot,
      subscribe,
    }),
    [getSnapshot, subscribe],
  );
}

function useSeatingPlanSelectorBase<T>(
  store: SeatingPlanStoreValue | null,
  selector: (snapshot: SeatingPlanSnapshot) => T,
  equalityFn: SeatingPlanEqualityFn<T>,
  errorMessage?: string,
  optional = false,
  fallback?: T,
): T {
  const lastSelectionRef = useRef<T | undefined>(undefined);
  const hasSelectionRef = useRef(false);

  useEffect(() => {
    if (!store) {
      hasSelectionRef.current = false;
      lastSelectionRef.current = fallback;
    }
  }, [store, fallback]);

  const getSelection = useCallback(() => {
    if (!store) {
      if (optional) {
        return fallback as T;
      }
      throw new Error(errorMessage ?? SELECTOR_ERROR);
    }

    const snapshot = store.getSnapshot();
    const selection = selector(snapshot);

    if (hasSelectionRef.current && lastSelectionRef.current !== undefined) {
      if (equalityFn(selection, lastSelectionRef.current)) {
        return lastSelectionRef.current;
      }
    }

    hasSelectionRef.current = true;
    lastSelectionRef.current = selection;
    return selection;
  }, [store, selector, equalityFn, optional, fallback, errorMessage]);

  const subscribe = useCallback(
    (listener: () => void) => {
      if (!store) {
        return () => {};
      }
      return store.subscribe(listener);
    },
    [store],
  );

  const getServerSnapshot = useCallback(() => getSelection(), [getSelection]);

  return useSyncExternalStore(subscribe, getSelection, getServerSnapshot);
}

/**
 * Selects a slice of the seating plan state using a custom selector function.
 * Re-renders only when the selected value changes according to the equality function.
 *
 * @template T - The type of the selected value
 * @param selector - Function to extract desired state from the snapshot
 * @param equalityFn - Optional comparison function (default: Object.is)
 * @returns The selected value from the seating plan state
 *
 * @example
 * ```tsx
 * const studentCount = useSeatingPlanSelector(
 *   (snapshot) => snapshot.state.students.length
 * );
 * ```
 */
export function useSeatingPlanSelector<T>(
  selector: (snapshot: SeatingPlanSnapshot) => T,
  equalityFn: SeatingPlanEqualityFn<T> = Object.is,
): T {
  const store = useContext(SeatingPlanStoreContext);
  return useSeatingPlanSelectorBase(store, selector, equalityFn);
}

/**
 * Returns the complete seating plan state.
 * Use `useSeatingPlanSelector` for granular subscriptions to avoid unnecessary re-renders.
 *
 * @returns The full SeatingPlanState object
 * @throws Error if used outside SeatingPlanGeneratorProvider
 */
export function useSeatingPlanState(): SeatingPlanState {
  const store = useContext(SeatingPlanStoreContext);
  return useSeatingPlanSelectorBase(
    store,
    (snapshot) => snapshot.state,
    Object.is,
    'useSeatingPlanState must be used within a SeatingPlanGeneratorProvider',
  );
}

export function useOptionalSeatingPlanState(): SeatingPlanState | null {
  const store = useContext(SeatingPlanStoreContext);
  return useSeatingPlanSelectorBase(
    store,
    (snapshot) => snapshot.state,
    Object.is,
    undefined,
    true,
    null,
  );
}

export function useOptionalSeatingPlanActions(): SeatingPlanActions | null {
  const store = useContext(SeatingPlanStoreContext);
  return useSeatingPlanSelectorBase(
    store,
    (snapshot) => snapshot.actions,
    Object.is,
    undefined,
    true,
    null,
  );
}

/**
 * Returns all available seating plan actions for state mutations.
 * Actions are stable references and won't cause re-renders when called.
 *
 * @returns The SeatingPlanActions object with all available actions
 * @throws Error if used outside SeatingPlanGeneratorProvider
 */
export function useSeatingPlanActions(): SeatingPlanActions {
  const store = useContext(SeatingPlanStoreContext);
  return useSeatingPlanSelectorBase(
    store,
    (snapshot) => snapshot.actions,
    Object.is,
    'useSeatingPlanActions must be used within a SeatingPlanGeneratorProvider',
  );
}

/**
 * Returns combined state and actions for convenience.
 * Prefer `useSeatingPlanState` or `useSeatingPlanActions` for better performance.
 *
 * @returns Combined state and actions object
 * @throws Error if used outside SeatingPlanGeneratorProvider
 */
export function useSeatingPlan(): SeatingPlanCombined {
  const store = useContext(SeatingPlanStoreContext);
  return useSeatingPlanSelectorBase<SeatingPlanCombined>(
    store,
    (snapshot) => snapshot.combined,
    Object.is,
    'useSeatingPlan must be used within a SeatingPlanGeneratorProvider',
  );
}
