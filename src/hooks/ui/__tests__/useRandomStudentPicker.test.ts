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
