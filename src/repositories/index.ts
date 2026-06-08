// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Repository pattern barrel exports
 */

export { IndexedDBRepository } from './IndexedDBRepository';
export type {
  ISeatingPlanRepository,
  ActiveClassSnapshot,
} from './ISeatingPlanRepository';
export type { Result, Success, Failure, RepositoryError } from './types';
export { ResultHelpers, RepositoryErrorType } from './types';
