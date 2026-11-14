// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRandomStudentPicker } from '@/hooks/ui/useRandomStudentPicker';
import { createMockStudent } from '@/__tests__/utils';
import type { SeatingArrangement } from '@/types';

const anna = createMockStudent({ id: 'a', name: 'Anna' });
const ben = createMockStudent({ id: 'b', name: 'Ben' });
const cem = createMockStudent({ id: 'c', name: 'Cem' });

const seating: SeatingArrangement = [
  [anna, ben],
  [cem, null],
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useRandomStudentPicker', () => {
  it('counts only seated students', () => {
    const { result } = renderHook(() => useRandomStudentPicker(seating));

    expect(result.current.total).toBe(3);
    expect(result.current.remaining).toBe(3);
    expect(result.current.picked).toBeNull();
  });

  it('reports the seat of the drawn student', () => {
    const { result } = renderHook(() => useRandomStudentPicker(seating));

    act(() => result.current.pick());

    const picked = result.current.picked;
    expect(picked).not.toBeNull();
    expect(seating[picked!.tableIndex]?.[picked!.seatIndex]).toBe(
      picked!.student,
    );
  });

  it('gives everyone a turn before repeating', () => {
    const { result } = renderHook(() => useRandomStudentPicker(seating));
    const drawn: string[] = [];

    for (let i = 0; i < 3; i++) {
      act(() => result.current.pick());
      drawn.push(result.current.picked!.student.id);
    }

    expect(new Set(drawn).size).toBe(3);
    expect(result.current.remaining).toBe(0);
  });

  it('starts a fresh round once everyone has been drawn', () => {
    const { result } = renderHook(() => useRandomStudentPicker(seating));

    for (let i = 0; i < 3; i++) {
      act(() => result.current.pick());
    }
    expect(result.current.remaining).toBe(0);

    act(() => result.current.pick());
    expect(result.current.remaining).toBe(2);
  });

  it('reset clears the pick and the round', () => {
    const { result } = renderHook(() => useRandomStudentPicker(seating));

    act(() => result.current.pick());
    act(() => result.current.reset());

    expect(result.current.picked).toBeNull();
    expect(result.current.remaining).toBe(3);
  });

  it('starts over when the seating plan changes', () => {
    const { result, rerender } = renderHook(
      ({ plan }) => useRandomStudentPicker(plan),
      { initialProps: { plan: seating } },
    );

    act(() => result.current.pick());
    expect(result.current.picked).not.toBeNull();

    rerender({ plan: [[anna, cem]] as SeatingArrangement });

    expect(result.current.picked).toBeNull();
    expect(result.current.total).toBe(2);
    expect(result.current.remaining).toBe(2);
  });

  it('does nothing without seated students', () => {
    const { result } = renderHook(() => useRandomStudentPicker([]));

    act(() => result.current.pick());

    expect(result.current.picked).toBeNull();
    expect(result.current.total).toBe(0);
  });
});

// Decision 0045: who is missing today is never drawn, and marking someone
// keeps the round as it was.
describe('useRandomStudentPicker with students missing today', () => {
  it('never draws a student missing today', () => {
    const absent = new Set(['a', 'b']);
    const { result } = renderHook(() =>
      useRandomStudentPicker(seating, [], absent),
    );

    expect(result.current.total).toBe(1);
    for (let draw = 0; draw < 5; draw++) {
      act(() => result.current.pick());
      expect(result.current.picked?.student.id).toBe('c');
    }
  });

  it('keeps who had a turn when someone is marked', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { result, rerender } = renderHook(
      ({ absent }) => useRandomStudentPicker(seating, [], absent),
      { initialProps: { absent: new Set<string>() as ReadonlySet<string> } },
    );
    act(() => result.current.pick());
    const first = result.current.picked!.student.id;

    rerender({ absent: new Set(['c']) });

    expect(result.current.recent.map((student) => student.id)).toEqual([first]);
    expect(result.current.total).toBe(2);
    expect(result.current.remaining).toBe(1);
  });

  // "Wer kommt dran?" draws Anna, Anna is not there, the teacher taps her
  // seat: the light goes out, and Anna had no turn.
  it('puts out the light on the one just drawn when they are marked', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { result, rerender } = renderHook(
      ({ absent }) => useRandomStudentPicker(seating, [], absent),
      { initialProps: { absent: new Set<string>() as ReadonlySet<string> } },
    );
    act(() => result.current.pick());
    act(() => result.current.pick());
    const [current, earlier] = result.current.recent.map((s) => s.id);

    rerender({ absent: new Set([current!]) });

    expect(result.current.picked).toBeNull();
    expect(result.current.recent.map((student) => student.id)).toEqual([
      earlier,
    ]);
    expect(result.current.total).toBe(2);
    expect(result.current.remaining).toBe(1);

    // Back again later the same day, they are still waiting for a turn.
    rerender({ absent: new Set<string>() });
    expect(result.current.remaining).toBe(2);
  });
});
