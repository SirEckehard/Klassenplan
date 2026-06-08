import { useCallback } from 'react';
import type React from 'react';
import type { ClassroomScene } from '@/types';
import type { CircleLayout } from '@/types/Circle';
import type { SyncSnapshotOptions } from './useUnsavedSeatingTracker';
import {
  announcePlanSaved,
  createTimestampPlanName,
  logError,
  showToast,
  TOAST_MESSAGES,
} from '@/utils';

type UseHomeNavigationParams = {
  step: number;
  currentSeatingLength: number;
  planName: string;
  saveSeatingPlan: (
    name: string,
    scene: ClassroomScene,
    circleLayout?: CircleLayout | null,
  ) => boolean;
  classroomScene: ClassroomScene;
  navigate: (path: string) => void;
  hasUnsavedSeatingChanges: boolean;
  syncSeatingSnapshot?: (options?: SyncSnapshotOptions) => void;
};

export function useHomeNavigationHandler({
  step,
  currentSeatingLength,
  planName,
  saveSeatingPlan,
  classroomScene,
  navigate,
  hasUnsavedSeatingChanges,
  syncSeatingSnapshot,
}: UseHomeNavigationParams) {
  return useCallback<React.MouseEventHandler<HTMLAnchorElement>>(
    (event) => {
      event.preventDefault();
      const shouldAutosave =
        step === 3 && currentSeatingLength > 0 && hasUnsavedSeatingChanges;
      if (shouldAutosave) {
        const trimmed = planName.trim();
        const finalName =
          trimmed.length > 0 ? trimmed : createTimestampPlanName();
        setTimeout(() => {
          try {
            const ok = saveSeatingPlan(finalName, classroomScene);
            if (ok) {
              announcePlanSaved(finalName);
              syncSeatingSnapshot?.({ planName: finalName });
            } else {
              showToast('error', TOAST_MESSAGES.PLAN_SAVE_FAILED);
              logError(
                'Autosave on home navigation returned false',
                { planName: finalName },
                'useHomeNavigationHandler',
              );
            }
          } catch (error) {
            logError(
              'Autosave on home navigation failed',
              { error, planName: finalName },
              'useHomeNavigationHandler',
            );
            showToast('error', TOAST_MESSAGES.PLAN_SAVE_FAILED);
          }
        }, 0);
      }
      navigate('/');
    },
    [
      classroomScene,
      currentSeatingLength,
      navigate,
      planName,
      saveSeatingPlan,
      step,
      hasUnsavedSeatingChanges,
      syncSeatingSnapshot,
    ],
  );
}
