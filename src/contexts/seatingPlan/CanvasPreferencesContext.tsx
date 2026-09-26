// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { PhotoDisplayMode } from '@/types';
import type { NameDisplayMode } from '@/utils';
import usePersistentState from '@/hooks/usePersistentState';
import { LOCAL_STORAGE_KEYS } from '@/utils/data/storageKeys';
import {
  BADGE_DISPLAY_MODES,
  DEFAULT_BADGE_HOVER,
  normalizeBadgeHover,
  type BadgeDisplayMode,
  type BadgeHoverSettings,
} from '@/utils/ui/seatBadges';

const PHOTO_DISPLAY_MODES: readonly PhotoDisplayMode[] = [
  'all',
  'hover',
  'off',
];

/**
 * The view preferences of the classroom canvas: the editing toggles of the
 * room, and how the plan shows its students — photos, names, badges.
 *
 * Deliberately its own context rather than a corner of
 * `ClassroomLayoutContext`: these are per-device view preferences, not class
 * data. Toggling the grid must not re-render everything that reads the scene,
 * and reading the grid flag must not subscribe a component to scene edits.
 *
 * The table plan and the circle read the same values from here. Each used to
 * keep a copy of its own, and the circle's container — mounted for both
 * arrangements — never saw what was changed in the table plan.
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
  /** How student photos grow on the seats and tokens: all / hover / off. */
  photoDisplayMode: PhotoDisplayMode;
  setPhotoDisplayMode: React.Dispatch<React.SetStateAction<PhotoDisplayMode>>;
  /** One name rule for every seat and token of the editor. */
  nameDisplay: NameDisplayMode;
  setNameDisplay: React.Dispatch<React.SetStateAction<NameDisplayMode>>;
  /** Which badges the seats and tokens show. */
  badgeDisplay: BadgeDisplayMode;
  setBadgeDisplay: React.Dispatch<React.SetStateAction<BadgeDisplayMode>>;
  /** What pointing at a badge does. */
  badgeHover: BadgeHoverSettings;
  setBadgeHover: React.Dispatch<React.SetStateAction<BadgeHoverSettings>>;
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
  const [storedPhotoDisplayMode, setPhotoDisplayMode] =
    usePersistentState<PhotoDisplayMode>(
      LOCAL_STORAGE_KEYS.photoDisplayMode,
      'hover',
    );
  const [nameDisplay, setNameDisplay] = usePersistentState<NameDisplayMode>(
    LOCAL_STORAGE_KEYS.nameDisplay,
    'firstNameInitial',
  );
  const [storedBadgeDisplay, setBadgeDisplay] =
    usePersistentState<BadgeDisplayMode>(
      LOCAL_STORAGE_KEYS.badgeDisplay,
      'all',
    );
  const [storedBadgeHover, setBadgeHover] =
    usePersistentState<BadgeHoverSettings>(
      LOCAL_STORAGE_KEYS.badgeHover,
      DEFAULT_BADGE_HOVER,
    );

  // A value from an older or a hand-edited store falls back to the default.
  const photoDisplayMode = PHOTO_DISPLAY_MODES.includes(storedPhotoDisplayMode)
    ? storedPhotoDisplayMode
    : 'hover';
  const badgeDisplay = BADGE_DISPLAY_MODES.includes(storedBadgeDisplay)
    ? storedBadgeDisplay
    : 'all';
  const badgeHover = React.useMemo(
    () => normalizeBadgeHover(storedBadgeHover),
    [storedBadgeHover],
  );

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
      photoDisplayMode,
      setPhotoDisplayMode,
      nameDisplay,
      setNameDisplay,
      badgeDisplay,
      setBadgeDisplay,
      badgeHover,
      setBadgeHover,
    }),
    [
      snapToGrid,
      showGrid,
      setShowGrid,
      showAlignmentGuides,
      setShowAlignmentGuides,
      showPhotoOverlapWarning,
      setShowPhotoOverlapWarning,
      photoDisplayMode,
      setPhotoDisplayMode,
      nameDisplay,
      setNameDisplay,
      badgeDisplay,
      setBadgeDisplay,
      badgeHover,
      setBadgeHover,
    ],
  );

  return (
    <CanvasPreferencesContext.Provider value={value}>
      {children}
    </CanvasPreferencesContext.Provider>
  );
}

/**
 * Provides the canvas view preferences (snapping, grid, alignment guides,
 * photo overlap warning, photos, names, badges) and their setters.
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
