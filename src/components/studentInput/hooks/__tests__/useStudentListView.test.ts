// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStudentListView } from '@/components/studentInput/hooks/useStudentListView';
import { createMockStudent } from '@/__tests__/utils';

const students = [
  createMockStudent({ id: '1', name: 'Zoë Meier', restless: true }),
  createMockStudent({ id: '2', name: 'Anna Beispiel', shy: true }),
  createMockStudent({ id: '3', name: 'José Alvarez', hasPhoto: true }),
  createMockStudent({ id: '4', name: '' }),
];

const names = (list: { name: string }[]) => list.map((entry) => entry.name);

describe('useStudentListView', () => {
  it('shows the whole class by default', () => {
    const { result } = renderHook(() => useStudentListView(students));

    expect(result.current.visibleStudents).toHaveLength(4);
    expect(result.current.isNarrowed).toBe(false);
  });

  it('searches case- and accent-insensitively', () => {
    const { result } = renderHook(() => useStudentListView(students));

    act(() => result.current.setQuery('jose'));

    expect(names(result.current.visibleStudents)).toEqual(['José Alvarez']);
    expect(result.current.isNarrowed).toBe(true);
  });

  it('filters by attribute', () => {
    const { result } = renderHook(() => useStudentListView(students));

    act(() => result.current.setFilterMode('shy'));

    expect(names(result.current.visibleStudents)).toEqual(['Anna Beispiel']);
  });

  it('finds students whose name is still missing', () => {
    const { result } = renderHook(() => useStudentListView(students));

    act(() => result.current.setFilterMode('missingName'));

    expect(result.current.visibleStudents).toHaveLength(1);
    expect(result.current.visibleStudents[0].id).toBe('4');
  });

  it('filters students without a photo', () => {
    const { result } = renderHook(() => useStudentListView(students));

    act(() => result.current.setFilterMode('withoutPhoto'));

    expect(result.current.visibleStudents.map((s) => s.id)).toEqual([
      '1',
      '2',
      '4',
    ]);
  });

  it('sorts by name in both directions without touching the input order', () => {
    const { result } = renderHook(() => useStudentListView(students));

    act(() => result.current.setSortMode('name-asc'));
    expect(names(result.current.visibleStudents)[0]).toBe('');
    expect(names(result.current.visibleStudents).at(-1)).toBe('Zoë Meier');

    act(() => result.current.setSortMode('name-desc'));
    expect(names(result.current.visibleStudents)[0]).toBe('Zoë Meier');

    // The stored class order is never rewritten.
    expect(names(students)).toEqual([
      'Zoë Meier',
      'Anna Beispiel',
      'José Alvarez',
      '',
    ]);
  });

  it('combines search and filter', () => {
    const { result } = renderHook(() => useStudentListView(students));

    act(() => {
      result.current.setQuery('a');
      result.current.setFilterMode('shy');
    });

    expect(names(result.current.visibleStudents)).toEqual(['Anna Beispiel']);
  });

  it('clear resets search and filter but keeps the sorting', () => {
    const { result } = renderHook(() => useStudentListView(students));

    act(() => {
      result.current.setQuery('anna');
      result.current.setFilterMode('shy');
      result.current.setSortMode('name-asc');
    });
    act(() => result.current.clear());

    expect(result.current.visibleStudents).toHaveLength(4);
    expect(result.current.sortMode).toBe('name-asc');
    expect(result.current.isNarrowed).toBe(false);
  });
});
