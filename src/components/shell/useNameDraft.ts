// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { NameProblem } from '@/utils';

export type NameDraftOptions = {
  value: string;
  /** What speaks against a draft, checked as it is typed. */
  problemFor?: (draft: string) => NameProblem | null;
  /** Gives the name; resolves with what spoke against it after all. */
  onCommit: (name: string) => Promise<NameProblem | null> | NameProblem | null;
  /** An emptied field is kept empty instead of going back. */
  optional?: boolean;
};

/**
 * The draft of a name renamed where it is read, shared by the inspector's
 * fields (`NameField`) and the name in its header (`InspectorTitleField`):
 * a name that cannot be given is refused as it is typed, an emptied field
 * goes back to the name it had unless it may stay empty, and a name changed
 * elsewhere replaces the draft.
 */
export function useNameDraft({
  value,
  problemFor,
  onCommit,
  optional = false,
}: NameDraftOptions) {
  const [draft, setDraftState] = React.useState(value);
  const [refused, setRefused] = React.useState<NameProblem | null>(null);
  const committingRef = React.useRef(false);

  // A name changed elsewhere — or another entry with its own — shows here.
  const [shownValue, setShownValue] = React.useState(value);
  if (shownValue !== value) {
    setShownValue(value);
    setDraftState(value);
    setRefused(null);
  }

  const problem =
    draft.trim() === value || (optional && draft.trim() === '')
      ? null
      : (problemFor?.(draft) ?? null);
  // Only a taken name needs words: an empty field goes back, and the field
  // takes no more than a name may have.
  const taken = refused === 'taken' || problem === 'taken';

  const setDraft = (next: string) => {
    setDraftState(next);
    setRefused(null);
  };

  const reset = () => {
    setDraftState(value);
    setRefused(null);
  };

  /**
   * Gives the draft; resolves with whether it is settled — kept, unchanged
   * or gone back — rather than refused or still on its way.
   */
  const commit = async (): Promise<boolean> => {
    const trimmed = draft.trim();
    if (committingRef.current) return false;
    if (trimmed === value) return true;
    if (trimmed === '' && !optional) {
      setDraftState(value);
      return true;
    }
    if (problem) return false;
    committingRef.current = true;
    try {
      const result = await onCommit(trimmed);
      setRefused(result);
      return result === null;
    } finally {
      committingRef.current = false;
    }
  };

  return { draft, setDraft, reset, problem, taken, commit };
}
