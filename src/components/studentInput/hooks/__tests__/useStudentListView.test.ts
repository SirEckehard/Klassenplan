// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, beforeEach, vi } from 'vitest';
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
  // The sort order is persisted, so it must not leak between cases.
  beforeEach(() => localStorage.clear());

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

  it('sorts by last name in both directions', () => {
    const { result } = renderHook(() => useStudentListView(students));

    act(() => result.current.setSortMode('lastName-asc'));
    expect(names(result.current.visibleStudents).slice(1)).toEqual([
      'José Alvarez',
      'Anna Beispiel',
      'Zoë Meier',
    ]);

    act(() => result.current.setSortMode('lastName-desc'));
    expect(names(result.current.visibleStudents).slice(0, 3)).toEqual([
      'Zoë Meier',
      'Anna Beispiel',
      'José Alvarez',
    ]);
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

  it('keeps the sorting when the list is mounted again', () => {
    const first = renderHook(() => useStudentListView(students));
    act(() => first.result.current.setSortMode('name-asc'));
    first.unmount();

    const second = renderHook(() => useStudentListView(students));

    expect(second.result.current.sortMode).toBe('name-asc');
    expect(names(second.result.current.visibleStudents)[0]).toBe('');
  });

  it('falls back to the manual order when the stored value is unknown', () => {
    localStorage.setItem('spg.studentSortMode', '"name-descending"');

    const { result } = renderHook(() => useStudentListView(students));

    expect(result.current.sortMode).toBe('manual');
    expect(names(result.current.visibleStudents)).toEqual(names(students));
  });

  describe('search match', () => {
    const roster = [
      createMockStudent({ id: 'a', name: 'Anna Schmidt', shy: true }),
      createMockStudent({ id: 'j', name: 'Jan Hannover' }),
      createMockStudent({ id: 'h', name: 'Hannah Berg' }),
      createMockStudent({ id: 'm', name: 'Max Müller' }),
      createMockStudent({ id: 'x', name: 'Maximilian (Max) Schulz' }),
      createMockStudent({ id: 'l', name: 'Lea Maier' }),
    ];
    const matchFor = (query: string, filter?: 'shy', list = roster) => {
      const { result } = renderHook(() => useStudentListView(list));
      if (filter) act(() => result.current.setFilterMode(filter));
      act(() => result.current.setQuery(query));
      return result.current.searchMatch?.id ?? null;
    };

    it('is the only student found', () => {
      expect(matchFor('lea')).toBe('l');
      expect(matchFor('schu')).toBe('x');
    });

    it('is the only student whose name is the search', () => {
      const withNamesake = [
        ...roster,
        createMockStudent({ id: 'lh', name: 'Lea Maierhofer' }),
      ];
      expect(matchFor(' lea  maier ', undefined, withNamesake)).toBe('l');
    });

    it('is the only student with a word that is the search', () => {
      expect(matchFor('anna')).toBe('a');
    });

    it('is the only student with a word starting with the search', () => {
      // "an" is in Jan, Hannover and Hannah too, but starts only Anna.
      expect(matchFor('an')).toBe('a');
      expect(matchFor('anna s')).toBe('a');
    });

    it('stays empty while the search could mean several', () => {
      // A first name both carry, one of them as the name called by.
      expect(matchFor('max')).toBeNull();
      expect(matchFor('ma')).toBeNull();
      expect(matchFor('ha')).toBeNull();
    });

    it('needs two letters before a word start decides', () => {
      // "a" starts Anna alone, but also stands in every other name.
      expect(matchFor('a')).toBeNull();
    });

    it('stays empty without a search', () => {
      expect(matchFor('')).toBeNull();
      expect(matchFor('   ')).toBeNull();
    });

    it('only looks at the students the filter leaves', () => {
      expect(matchFor('a', 'shy')).toBe('a');
    });

    it('reports the match as the teacher types', () => {
      const onSearchMatch = vi.fn();
      const { result } = renderHook(() =>
        useStudentListView(roster, { onSearchMatch }),
      );

      act(() => result.current.setQuery('m'));
      act(() => result.current.setQuery('ma'));
      expect(onSearchMatch).not.toHaveBeenCalled();

      act(() => result.current.setQuery('mai'));
      expect(onSearchMatch).toHaveBeenCalledTimes(1);
      expect(onSearchMatch.mock.calls[0][0].id).toBe('l');
    });

    it('does not report it when only the students change', () => {
      const onSearchMatch = vi.fn();
      const { result, rerender } = renderHook(
        ({ list }) => useStudentListView(list, { onSearchMatch }),
        { initialProps: { list: roster } },
      );
      act(() => result.current.setQuery('ma'));

      // Max Müller renamed: "ma" now clearly means Maximilian.
      rerender({
        list: roster.map((student) =>
          student.id === 'm' ? { ...student, name: 'Moritz Müller' } : student,
        ),
      });

      expect(result.current.searchMatch?.id).toBeUndefined();
      expect(onSearchMatch).not.toHaveBeenCalled();
    });
  });
});
