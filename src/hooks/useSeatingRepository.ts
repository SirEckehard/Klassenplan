import { useMemo } from 'react';
import { IndexedDBRepository } from '@/repositories';
import type { ISeatingPlanRepository } from '@/repositories';

// Module-level singleton - initialized once, never reassigned in hooks
const repositorySingleton: ISeatingPlanRepository = new IndexedDBRepository();

/**
 * Hook that provides access to the seating plan repository
 * Currently uses IndexedDB implementation, but can be swapped for other implementations
 */
export function useSeatingRepository(): ISeatingPlanRepository {
  // Return stable reference to singleton
  return useMemo(() => repositorySingleton, []);
}
