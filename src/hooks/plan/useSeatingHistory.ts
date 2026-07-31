// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { LockedPositions, SeatingArrangement } from '@/types';
import type { CircleLayout } from '@/types/Circle';
import { deepClone } from '@/utils';

/**
 * One reversible step of the seating plan.
 *
 * Table seating, locks and the circle layout move together: mixing rewrites
 * the seating, a circle sync derives the circle from it, and locks decide
 * which seats a mix may touch. Undoing only part of that would leave the two
 * views describing different classrooms.
 */
export interface SeatingSnapshot {
  seating: SeatingArrangement;
  lockedPositions: LockedPositions;
  circleLayout: CircleLayout | null;
  /** Cheap change marker; identical signatures are not pushed twice. */
  signature: string;
}

export interface SeatingHistoryHook {
  /** Record the current state as a reversible step. Call *before* mutating. */
  recordSnapshot: () => void;
  /**
   * Capture without recording, for actions that may turn out to be no-ops
   * (a drag onto a locked seat). Pair with {@link SeatingHistoryHook.pushSnapshot}
   * once the mutation reports that it changed something.
   */
  captureSnapshot: () => SeatingSnapshot;
  pushSnapshot: (snapshot: SeatingSnapshot) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Drop both stacks — used when the underlying class changes. */
  resetHistory: () => void;
}

export interface UseSeatingHistoryParams {
  seating: SeatingArrangement;
  lockedPositions: LockedPositions;
  circleLayout: CircleLayout | null;
  applySnapshot: (snapshot: SeatingSnapshot) => void;
}

/**
 * Undo depth. Each entry holds a seating grid plus a circle layout; 30 steps
 * of a 36-seat class stay far below the memory the mix history already uses.
 */
const HISTORY_LIMIT = 30;

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME_32 = 0x01000193;

const mixInt = (hash: number, value: number): number =>
  Math.imul(hash ^ (value >>> 0), FNV_PRIME_32) >>> 0;

const mixString = (hash: number, value: string | undefined | null): number => {
  if (!value) {
    return mixInt(hash, 0);
  }
  let next = hash;
  for (let i = 0; i < value.length; i++) {
    next = mixInt(next, value.charCodeAt(i));
  }
  return next;
};

/**
 * Signature over what an undo would actually restore: who sits where, which
 * seats are locked, and the circle order. Deliberately ignores student
 * attributes — editing a name is not a seating change.
 */
const createSignature = (
  seating: SeatingArrangement,
  lockedPositions: LockedPositions,
  circleLayout: CircleLayout | null,
): string => {
  let hash = FNV_OFFSET_BASIS;
  hash = mixInt(hash, seating.length);
  seating.forEach((table) => {
    hash = mixInt(hash, table.length);
    table.forEach((seat) => {
      hash = seat ? mixString(hash, seat.id) : mixInt(hash, 0xffffffff);
    });
  });

  // Object key order is insertion order, so sort for a stable signature.
  const lockIds = Object.keys(lockedPositions).sort();
  hash = mixInt(hash, lockIds.length);
  lockIds.forEach((id) => {
    const position = lockedPositions[id];
    hash = mixString(hash, id);
    hash = mixInt(hash, position.table);
    hash = mixInt(hash, position.seat);
  });

  const circleStudents = circleLayout?.students ?? [];
  hash = mixInt(hash, circleStudents.length);
  circleStudents.forEach((entry) => {
    hash = mixString(hash, entry.student?.id);
  });

  return (hash >>> 0).toString(16);
};

/**
 * Undo/redo for seating plan actions — mixing, refining, drag swaps, locks and
 * every circle rearrangement.
 *
 * Mirrors `useSceneHistory` (which covers the *layout* editor): stacks live in
 * refs so consecutive actions inside one render cycle each record their own
 * entry, and state mirrors exist only to re-render the buttons.
 *
 * Timing contract: `recordSnapshot()` captures the last *committed* state. The
 * live mirror is refreshed after every commit and, additionally, the moment a
 * snapshot is applied — so a rapid undo → undo chain never records the state
 * it was about to leave twice.
 */
export function useSeatingHistory({
  seating,
  lockedPositions,
  circleLayout,
  applySnapshot,
}: UseSeatingHistoryParams): SeatingHistoryHook {
  const undoStackRef = React.useRef<SeatingSnapshot[]>([]);
  const redoStackRef = React.useRef<SeatingSnapshot[]>([]);
  const [undoLength, setUndoLength] = React.useState(0);
  const [redoLength, setRedoLength] = React.useState(0);

  const liveRef = React.useRef<{
    seating: SeatingArrangement;
    lockedPositions: LockedPositions;
    circleLayout: CircleLayout | null;
  }>({ seating, lockedPositions, circleLayout });

  React.useEffect(() => {
    liveRef.current = { seating, lockedPositions, circleLayout };
  }, [seating, lockedPositions, circleLayout]);

  const syncMirrors = React.useCallback(() => {
    setUndoLength(undoStackRef.current.length);
    setRedoLength(redoStackRef.current.length);
  }, []);

  const captureCurrent = React.useCallback((): SeatingSnapshot => {
    const live = liveRef.current;
    return {
      seating: deepClone(live.seating),
      lockedPositions: { ...live.lockedPositions },
      circleLayout: live.circleLayout ? deepClone(live.circleLayout) : null,
      signature: createSignature(
        live.seating,
        live.lockedPositions,
        live.circleLayout,
      ),
    };
  }, []);

  const restore = React.useCallback(
    (snapshot: SeatingSnapshot) => {
      // Keep the mirror in step with what we just applied, so a follow-up
      // undo in the same tick captures the restored state, not the old one.
      liveRef.current = {
        seating: snapshot.seating,
        lockedPositions: snapshot.lockedPositions,
        circleLayout: snapshot.circleLayout,
      };
      applySnapshot(snapshot);
    },
    [applySnapshot],
  );

  const pushSnapshot = React.useCallback(
    (snapshot: SeatingSnapshot) => {
      const stack = undoStackRef.current;

      // An action that changed nothing must not consume an undo step — and
      // must not discard the redo branch either.
      if (
        stack.length > 0 &&
        stack[stack.length - 1].signature === snapshot.signature
      ) {
        return;
      }

      stack.push(snapshot);
      if (stack.length > HISTORY_LIMIT) {
        undoStackRef.current = stack.slice(-HISTORY_LIMIT);
      }
      redoStackRef.current = [];
      syncMirrors();
    },
    [syncMirrors],
  );

  const recordSnapshot = React.useCallback(() => {
    pushSnapshot(captureCurrent());
  }, [captureCurrent, pushSnapshot]);

  const undo = React.useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0) {
      return;
    }

    const target = stack[stack.length - 1];
    undoStackRef.current = stack.slice(0, -1);
    redoStackRef.current = [...redoStackRef.current, captureCurrent()].slice(
      -HISTORY_LIMIT,
    );

    restore(target);
    syncMirrors();
  }, [captureCurrent, restore, syncMirrors]);

  const redo = React.useCallback(() => {
    const stack = redoStackRef.current;
    if (stack.length === 0) {
      return;
    }

    const target = stack[stack.length - 1];
    redoStackRef.current = stack.slice(0, -1);
    undoStackRef.current = [...undoStackRef.current, captureCurrent()].slice(
      -HISTORY_LIMIT,
    );

    restore(target);
    syncMirrors();
  }, [captureCurrent, restore, syncMirrors]);

  const resetHistory = React.useCallback(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    syncMirrors();
  }, [syncMirrors]);

  return {
    recordSnapshot,
    captureSnapshot: captureCurrent,
    pushSnapshot,
    undo,
    redo,
    canUndo: undoLength > 0,
    canRedo: redoLength > 0,
    resetHistory,
  };
}
