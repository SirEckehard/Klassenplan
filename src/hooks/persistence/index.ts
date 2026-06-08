/**
 * Persistence hooks for managing IndexedDB data storage.
 *
 * This module provides specialized hooks for different aspects of persistence:
 * - usePersistErrorHandling: Error handling and toast display
 * - usePersistQueue: Queue management with debouncing
 * - useClassDataPersistence: Auto-persist effects for class data
 */

export * from './types';
export { usePersistErrorHandling } from './usePersistErrorHandling';
export type { PersistErrorHandlingReturn } from './usePersistErrorHandling';
export { usePersistQueue } from './usePersistQueue';
export type { PersistQueueReturn } from './usePersistQueue';
export { useClassDataPersistence } from './useClassDataPersistence';
export type {
  ClassDataState,
  ClassDataPersistenceReturn,
  LoadedSnapshot,
} from './useClassDataPersistence';
