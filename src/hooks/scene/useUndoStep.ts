// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';

/**
 * Makes one gesture one undo step, however many operations carry it out.
 *
 * The room's tables and its elements have operations of their own, and each
 * takes a snapshot before it changes the scene. Run one after the other on a
 * mixed selection, the second snapshot already holds the first half's change,
 * and Ctrl+Z brings back only half. Handed this `snapshot` instead of the
 * history's, the operations take one snapshot per `asOneStep` — the first,
 * of the room before either half — and outside a step each takes its own.
 */
export function useUndoStep(snapshot: () => void) {
  const stepRef = React.useRef({ open: false, taken: false });

  const stepSnapshot = React.useCallback(() => {
    const step = stepRef.current;
    if (step.open) {
      if (step.taken) return;
      step.taken = true;
    }
    snapshot();
  }, [snapshot]);

  const asOneStep = React.useCallback((run: () => void) => {
    const step = stepRef.current;
    step.open = true;
    step.taken = false;
    try {
      run();
    } finally {
      step.open = false;
      step.taken = false;
    }
  }, []);

  return { snapshot: stepSnapshot, asOneStep };
}
