// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useLayoutStore } from '@/stores/layoutStore';

/**
 * Manage the classroom scene configuration via the layout store.
 */
export function useClassroomSceneState() {
  return useLayoutStore((state) => state);
}
