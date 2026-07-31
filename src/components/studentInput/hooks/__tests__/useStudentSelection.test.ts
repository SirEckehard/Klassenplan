// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStudentSelection } from '@/components/studentInput/hooks/useStudentSelection';
import { createMockStudent } from '@/__tests__/utils';

const anna = createMockStudent({ id: 'a', name: 'Anna' });
const ben = createMockStudent({ id: 'b', name: 'Ben' });
const cem = createMockStudent({ id: 'c', name: 'Cem' });
const all = [anna, ben, cem];

describe('useStudentSelection', () => {
  it('toggles a single student', () => {
    const { result } = renderHook(() => useStudentSelection(all, all));

    act(() => result.current.toggle('a'));
    expect(result.current.isSelected('a')).toBe(true);
    expect(result.current.selectedCount).toBe(1);

    act(() => result.current.toggle('a'));
    expect(result.current.isSelected('a')).toBe(false);
  });

  it('select-all covers only the visible students', () => {
    const visible = [anna, ben];
    const { result } = renderHook(() => useStudentSelection(all, visible));

    act(() => result.current.toggleAllVisible());

    expect(result.current.selectedCount).toBe(2);
    expect(result.current.isSelected('c')).toBe(false);
    expect(result.current.allVisibleSelected).toBe(true);
  });

  it('select-all clears when everything visible is already selected', () => {
    const { result } = renderHook(() => useStudentSelection(all, all));

    act(() => result.current.toggleAllVisible());
    act(() => result.current.toggleAllVisible());

    expect(result.current.selectedCount).toBe(0);
  });

  it('keeps selections that a filter hides', () => {
    const { result, rerender } = renderHook(
      ({ visible }) => useStudentSelection(all, visible),
      { initialProps: { visible: all } },
    );

    act(() => result.current.toggle('c'));
    rerender({ visible: [anna, ben] });

    expect(result.current.isSelected('c')).toBe(true);
  });

  it('drops students that left the class entirely', () => {
    const { result, rerender } = renderHook(
      ({ roster }) => useStudentSelection(roster, roster),
      { initialProps: { roster: all } },
    );

    act(() => result.current.toggleAllVisible());
    expect(result.current.selectedCount).toBe(3);

    rerender({ roster: [anna, ben] });

    expect(result.current.selectedCount).toBe(2);
    expect(result.current.isSelected('c')).toBe(false);
  });

  it('clear resets the selection', () => {
    const { result } = renderHook(() => useStudentSelection(all, all));

    act(() => result.current.toggleAllVisible());
    act(() => result.current.clear());

    expect(result.current.selectedCount).toBe(0);
  });

  it('reports nothing selected for an empty visible list', () => {
    const { result } = renderHook(() => useStudentSelection(all, []));

    expect(result.current.allVisibleSelected).toBe(false);
  });
});
