// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import usePersistentState from '@/hooks/usePersistentState';
import { LOCAL_STORAGE_KEYS } from '@/utils/data/storageKeys';

/**
 * The four view toggles of the classroom canvas.
 *
 * Deliberately its own context rather than a corner of
 * `ClassroomLayoutContext`: these are per-device view preferences, not class
 * data. Toggling the grid must not re-render everything that reads the scene,
 * and reading the grid flag must not subscribe a component to scene edits.
 */
export interface CanvasPreferencesContextValue {
  snapToGrid: boolean;
  setSnapToGrid: React.Dispatch<React.SetStateAction<boolean>>;
  showGrid: boolean;
  setShowGrid: React.Dispatch<React.SetStateAction<boolean>>;
  showAlignmentGuides: boolean;
  setShowAlignmentGuides: React.Dispatch<React.SetStateAction<boolean>>;
  showPhotoOverlapWarning: boolean;
  setShowPhotoOverlapWarning: React.Dispatch<React.SetStateAction<boolean>>;
}

const CanvasPreferencesContext =
  React.createContext<CanvasPreferencesContextValue | null>(null);

export function CanvasPreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Snapping is the one toggle that is *not* persisted: it is a per-session
  // editing aid, and a teacher who turned it off to nudge one table should not
  // find it still off next week.
  const [snapToGrid, setSnapToGrid] = React.useState(true);
  const [showGrid, setShowGrid] = usePersistentState<boolean>(
    LOCAL_STORAGE_KEYS.showGrid,
    true,
  );
  const [showAlignmentGuides, setShowAlignmentGuides] =
    usePersistentState<boolean>(LOCAL_STORAGE_KEYS.alignmentGuides, true);
  const [showPhotoOverlapWarning, setShowPhotoOverlapWarning] =
    usePersistentState<boolean>(LOCAL_STORAGE_KEYS.photoOverlapWarning, true);

  const value = React.useMemo<CanvasPreferencesContextValue>(
    () => ({
      snapToGrid,
      setSnapToGrid,
      showGrid,
      setShowGrid,
      showAlignmentGuides,
      setShowAlignmentGuides,
      showPhotoOverlapWarning,
      setShowPhotoOverlapWarning,
    }),
    [
      snapToGrid,
      showGrid,
      setShowGrid,
      showAlignmentGuides,
      setShowAlignmentGuides,
      showPhotoOverlapWarning,
      setShowPhotoOverlapWarning,
    ],
  );

  return (
    <CanvasPreferencesContext.Provider value={value}>
      {children}
    </CanvasPreferencesContext.Provider>
  );
}

/**
 * Provides the canvas view toggles (snapping, grid, alignment guides, photo
 * overlap warning) and their setters.
 *
 * @returns CanvasPreferencesContextValue
 * @throws Error if used outside SeatingPlanGeneratorProvider
 *
 * @example
 * ```tsx
 * const { showGrid, setShowGrid } = useCanvasPreferences();
 * ```
 */
export function useCanvasPreferences(): CanvasPreferencesContextValue {
  const context = React.useContext(CanvasPreferencesContext);
  if (!context) {
    throw new Error(
      'useCanvasPreferences must be used within a SeatingPlanGeneratorProvider',
    );
  }
  return context;
}
