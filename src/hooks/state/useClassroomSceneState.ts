import { useLayoutStore } from '@/stores/layoutStore';

/**
 * Manage the classroom scene configuration via the layout store.
 */
export function useClassroomSceneState() {
  return useLayoutStore((state) => state);
}
