// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { ClassroomScene } from '@/types';
import { useIsLgUp } from '@/hooks/ui/useIsLgUp';
import { usePortraitViewport } from '@/hooks/ui/usePortraitViewport';
import { portraitPlanTurn, type PlanTurn } from '@/utils/ui/portraitPlan';

/**
 * The quarter turn the room and the plan are drawn with: below `lg`, while
 * the window is held upright, the board to the bottom (`portraitPlanTurn`).
 * The room and the plan ask the same, so turning from one layer to the other
 * never turns the picture.
 */
export function usePortraitTurn(
  scene: Pick<ClassroomScene, 'features'>,
): PlanTurn | null {
  const isLgUp = useIsLgUp();
  const portrait = usePortraitViewport();
  return !isLgUp && portrait ? portraitPlanTurn(scene) : null;
}
