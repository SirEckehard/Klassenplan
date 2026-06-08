/**
 * @internal
 * Adapter hook exposing the student Zustand store as a React-friendly interface.
 */
import type { StudentStoreSlice } from '@/stores/featureStores';
import { useStudentStore } from '@/stores/studentsStore';

export function useStudentsState(): StudentStoreSlice {
  return useStudentStore((state) => state);
}
