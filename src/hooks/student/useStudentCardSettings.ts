// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import usePersistentState from '@/hooks/usePersistentState';
import { LOCAL_STORAGE_KEYS } from '@/utils';

/**
 * Which cards the class layer opens on its own (`useStudentCard`): the one
 * over a badge, and the one over a name or a face. Both on unless the
 * teacher switches them off — under "Merkmale" in the class toolbar's view
 * settings, as the seats' tooltip is switched off in the plan's.
 */
export type StudentCardSettings = { badge: boolean; profile: boolean };

const DEFAULT_STUDENT_CARDS: StudentCardSettings = {
  badge: true,
  profile: true,
};

/** A stored value read back safely: anything but `false` keeps the default. */
function normalizeStudentCards(value: unknown): StudentCardSettings {
  const record =
    value && typeof value === 'object'
      ? (value as Partial<Record<keyof StudentCardSettings, unknown>>)
      : {};
  return {
    badge: record.badge !== false,
    profile: record.profile !== false,
  };
}

/**
 * The class layer's card settings, kept on this device. Read once by the
 * layer and handed to the toolbar and the views, so a switch reaches the
 * list at once.
 */
export function useStudentCardSettings(): [
  StudentCardSettings,
  (next: StudentCardSettings) => void,
] {
  const [stored, setStored] = usePersistentState<StudentCardSettings>(
    LOCAL_STORAGE_KEYS.studentCards,
    DEFAULT_STUDENT_CARDS,
  );
  const settings = React.useMemo(() => normalizeStudentCards(stored), [stored]);
  const set = React.useCallback(
    (next: StudentCardSettings) => setStored(() => next),
    [setStored],
  );
  return [settings, set];
}
