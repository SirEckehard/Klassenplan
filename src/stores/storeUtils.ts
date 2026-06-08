import type { StateUpdater } from './featureStores';

export function evaluateStateUpdater<T>(
  previous: T,
  updater: StateUpdater<T>,
): T {
  return typeof updater === 'function'
    ? (updater as (value: T) => T)(previous)
    : updater;
}
