// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { StateUpdater } from './featureStores';

export function evaluateStateUpdater<T>(
  previous: T,
  updater: StateUpdater<T>,
): T {
  return typeof updater === 'function'
    ? (updater as (value: T) => T)(previous)
    : updater;
}
