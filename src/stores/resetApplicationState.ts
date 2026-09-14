// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { LockedPositions, SeatingArrangement } from '@/types';
import { resetStudentStore } from '@/stores/studentsStore';
import { resetAlgorithmStore } from '@/stores/algorithmStore';
import { resetLayoutStore } from '@/stores/layoutStore';
import {
  DEFAULT_CLASSROOM_SCENE,
  DEFAULT_MIX_WEIGHTS,
  neutralSettings,
  normalizeMixSettings,
} from '@/utils';

export interface ApplicationStateResetHandlers {
  setCurrentSeating?: (value: SeatingArrangement) => void;
  setActivePlanId?: (value: string | null) => void;
  setLockedPositions?: (value: LockedPositions) => void;
}

const defaultMixSettings = normalizeMixSettings(
  {
    avoidPreviousPairs: DEFAULT_MIX_WEIGHTS.avoidPreviousPairs,
    preferGenderMix: DEFAULT_MIX_WEIGHTS.preferGenderMix,
  },
  neutralSettings,
);

/**
 * Reset all application-wide stores and optional local state handlers
 * to their default values. Keeps store resets centralized so privacy,
 * onboarding and backup flows can stay in sync.
 */
export function resetApplicationState(
  handlers: ApplicationStateResetHandlers = {},
): void {
  resetStudentStore();
  resetAlgorithmStore({
    step: 1,
    mixSettings: defaultMixSettings,
    seatingHistory: [],
    mixHistory: [],
    planName: '',
    planNameError: false,
    lastStatistics: null,
    showStatisticsBadge: false,
    showPostUpdateNotice: false,
  });
  resetLayoutStore({
    classroomScene: DEFAULT_CLASSROOM_SCENE,
    classroomEdited: false,
    seatingMode: 'table',
    circleLayout: null,
    circleGenerationInProgress: false,
    circleGenerationStatus: null,
  });

  handlers.setCurrentSeating?.([]);
  handlers.setActivePlanId?.(null);
  handlers.setLockedPositions?.({});
}
