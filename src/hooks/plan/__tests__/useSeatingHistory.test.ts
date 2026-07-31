// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useSeatingHistory,
  type SeatingSnapshot,
} from '@/hooks/plan/useSeatingHistory';
import { createMockStudent } from '@/__tests__/utils';
import type { LockedPositions, SeatingArrangement } from '@/types';
import type { CircleLayout } from '@/types/Circle';

const anna = createMockStudent({ id: 'a', name: 'Anna' });
const ben = createMockStudent({ id: 'b', name: 'Ben' });

const seatedAnnaFirst: SeatingArrangement = [[anna, ben]];
const seatedBenFirst: SeatingArrangement = [[ben, anna]];

const circleWith = (order: (typeof anna)[]): CircleLayout =>
  ({
    students: order.map((student, index) => ({
      student,
      angle: index * 180,
      x: 0,
      y: 0,
      preservedNeighbors: [],
      lostNeighbors: [],
      newNeighbors: [],
    })),
    radius: { horizontal: 10, vertical: 10 },
    center: { x: 0, y: 0 },
    preservedNeighborhoods: 0,
    totalOriginalNeighborhoods: 0,
    newNeighborhoods: 0,
    preservationRate: 1,
    mode: 'preserve-neighbors',
    timestamp: 0,
    neighborhoodPairs: [],
  }) satisfies CircleLayout;

/**
 * Drives the hook like the app does: the live values it reads come from state
 * that the applied snapshot writes back.
 */
function setup(initial?: {
  seating?: SeatingArrangement;
  lockedPositions?: LockedPositions;
  circleLayout?: CircleLayout | null;
}) {
  const applied: SeatingSnapshot[] = [];
  const live = {
    seating: initial?.seating ?? seatedAnnaFirst,
    lockedPositions: initial?.lockedPositions ?? {},
    circleLayout: initial?.circleLayout ?? null,
  };

  const applySnapshot = vi.fn((snapshot: SeatingSnapshot) => {
    applied.push(snapshot);
    live.seating = snapshot.seating;
    live.lockedPositions = snapshot.lockedPositions;
    live.circleLayout = snapshot.circleLayout;
  });

  const view = renderHook(() =>
    useSeatingHistory({
      seating: live.seating,
      lockedPositions: live.lockedPositions,
      circleLayout: live.circleLayout,
      applySnapshot,
    }),
  );

  /** Mimic a mutating action: change the live state, then re-render. */
  const mutate = (next: Partial<typeof live>) => {
    act(() => {
      Object.assign(live, next);
      view.rerender();
    });
  };

  return { view, applied, applySnapshot, live, mutate };
}

describe('useSeatingHistory', () => {
  it('starts with nothing to undo or redo', () => {
    const { view } = setup();
    expect(view.result.current.canUndo).toBe(false);
    expect(view.result.current.canRedo).toBe(false);
  });

  it('restores the state captured before the action', () => {
    const { view, applied, mutate } = setup();

    act(() => view.result.current.recordSnapshot());
    mutate({ seating: seatedBenFirst });
    expect(view.result.current.canUndo).toBe(true);

    act(() => view.result.current.undo());

    expect(applied.at(-1)?.seating).toEqual(seatedAnnaFirst);
    expect(view.result.current.canUndo).toBe(false);
    expect(view.result.current.canRedo).toBe(true);
  });

  it('redo returns to the state the undo left', () => {
    const { view, applied, mutate } = setup();

    act(() => view.result.current.recordSnapshot());
    mutate({ seating: seatedBenFirst });
    act(() => view.result.current.undo());
    act(() => view.result.current.redo());

    expect(applied.at(-1)?.seating).toEqual(seatedBenFirst);
    expect(view.result.current.canRedo).toBe(false);
  });

  it('covers locks and the circle layout, not just the table seating', () => {
    const { view, applied, mutate } = setup();

    act(() => view.result.current.recordSnapshot());
    mutate({
      lockedPositions: { a: { table: 0, seat: 0 } },
      circleLayout: circleWith([ben, anna]),
    });
    act(() => view.result.current.undo());

    expect(applied.at(-1)?.lockedPositions).toEqual({});
    expect(applied.at(-1)?.circleLayout).toBeNull();
  });

  it('ignores a recorded snapshot when nothing changed', () => {
    const { view } = setup();

    act(() => view.result.current.recordSnapshot());
    act(() => view.result.current.recordSnapshot());
    act(() => view.result.current.undo());

    // Only one step existed, so the second record was deduped.
    expect(view.result.current.canUndo).toBe(false);
  });

  it('a new action after an undo discards the redo branch', () => {
    const { view, mutate } = setup();

    act(() => view.result.current.recordSnapshot());
    mutate({ seating: seatedBenFirst });
    act(() => view.result.current.undo());
    expect(view.result.current.canRedo).toBe(true);

    act(() => view.result.current.recordSnapshot());
    mutate({ seating: seatedBenFirst });
    expect(view.result.current.canRedo).toBe(false);
  });

  it('chained undos walk back step by step', () => {
    const seatedNobody: SeatingArrangement = [[null, null]];
    const { view, applied, mutate } = setup();

    act(() => view.result.current.recordSnapshot());
    mutate({ seating: seatedBenFirst });
    act(() => view.result.current.recordSnapshot());
    mutate({ seating: seatedNobody });

    act(() => view.result.current.undo());
    expect(applied.at(-1)?.seating).toEqual(seatedBenFirst);

    act(() => view.result.current.undo());
    expect(applied.at(-1)?.seating).toEqual(seatedAnnaFirst);
    expect(view.result.current.canUndo).toBe(false);
  });

  it('capture + push only records when the action reported a change', () => {
    const { view, mutate } = setup();

    // A rejected drag: captured, but never pushed.
    act(() => {
      view.result.current.captureSnapshot();
    });
    expect(view.result.current.canUndo).toBe(false);

    // An accepted one.
    act(() => {
      const before = view.result.current.captureSnapshot();
      view.result.current.pushSnapshot(before);
    });
    mutate({ seating: seatedBenFirst });
    expect(view.result.current.canUndo).toBe(true);
  });

  it('resetHistory drops both stacks when the class changes', () => {
    const { view, mutate } = setup();

    act(() => view.result.current.recordSnapshot());
    mutate({ seating: seatedBenFirst });
    act(() => view.result.current.undo());

    act(() => view.result.current.resetHistory());

    expect(view.result.current.canUndo).toBe(false);
    expect(view.result.current.canRedo).toBe(false);
  });
});
