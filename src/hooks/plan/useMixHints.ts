// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useMemo } from 'react';
import type { ClassroomScene, MixSettings, Student } from '@/types';
import {
  findMixHints,
  type MixHint,
} from '@/utils/algorithm/model/feasibility';

/**
 * What the mixing cannot meet in this class and room, by the weights it
 * would mix with (`findMixHints`, decision 0031).
 */
export function useMixHints(
  students: Student[],
  scene: ClassroomScene,
  settings: Partial<MixSettings>,
): MixHint[] {
  return useMemo(
    () => findMixHints(students, scene, settings),
    [students, scene, settings],
  );
}
