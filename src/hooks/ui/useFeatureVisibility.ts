// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { ClassroomFeatureType } from '@/types';
import usePersistentState from '@/hooks/usePersistentState';
import { withBrowserLocalStorage } from '@/utils';
import {
  LEGACY_FEATURE_VISIBILITY_KEYS,
  LOCAL_STORAGE_KEYS,
} from '@/utils/data/storageKeys';
import {
  DEFAULT_FEATURE_VISIBILITY,
  FEATURE_TYPES,
  FEATURE_VISIBILITY_TOGGLE_KEYS,
  type FeatureVisibilityFlags,
} from '@/utils/ui';

/**
 * One-time migration: merge the pre-record per-type flags (`showBoard`, …)
 * into the initial visibility record and drop the legacy keys.
 */
const readInitialFeatureVisibility = (): FeatureVisibilityFlags =>
  withBrowserLocalStorage<FeatureVisibilityFlags>((storage) => {
    const flags: FeatureVisibilityFlags = { ...DEFAULT_FEATURE_VISIBILITY };
    for (const type of FEATURE_TYPES) {
      const legacyKey = FEATURE_VISIBILITY_TOGGLE_KEYS[type];
      const stored = storage.getItem(legacyKey);
      if (stored !== null) {
        flags[type] = stored !== 'false';
      }
    }
    for (const legacyKey of LEGACY_FEATURE_VISIBILITY_KEYS) {
      storage.removeItem(legacyKey);
    }
    return flags;
  }, DEFAULT_FEATURE_VISIBILITY) ?? DEFAULT_FEATURE_VISIBILITY;

/**
 * Persistent per-type visibility flags for classroom features (board,
 * windows, door, podium, …), stored as a single record under
 * `spg.featureVisibility`. New feature types are visible by default.
 */
export function useFeatureVisibility() {
  const [initialVisibility] = React.useState(readInitialFeatureVisibility);
  const [featureVisibility, setFeatureVisibility] =
    usePersistentState<FeatureVisibilityFlags>(
      LOCAL_STORAGE_KEYS.featureVisibility,
      initialVisibility,
    );

  // Ref mirrors the flags synchronously so history snapshots taken in the
  // same event handler as a visibility change read the up-to-date record.
  const featureVisibilityRef = React.useRef(featureVisibility);

  const setFeatureVisible = React.useCallback(
    (type: ClassroomFeatureType, visible: boolean) => {
      const next = { ...featureVisibilityRef.current, [type]: visible };
      featureVisibilityRef.current = next;
      setFeatureVisibility(next);
    },
    [setFeatureVisibility],
  );

  const setAllFeatureVisibility = React.useCallback(
    (flags: FeatureVisibilityFlags) => {
      const next = { ...flags };
      featureVisibilityRef.current = next;
      setFeatureVisibility(next);
    },
    [setFeatureVisibility],
  );

  const getFeatureVisibility = React.useCallback(
    (): FeatureVisibilityFlags => featureVisibilityRef.current,
    [],
  );

  return {
    featureVisibility,
    setFeatureVisible,
    setAllFeatureVisibility,
    getFeatureVisibility,
  };
}
