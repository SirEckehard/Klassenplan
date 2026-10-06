// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import StudentList from '../StudentList';
import { InspectorProvider, useInspector } from '@/contexts/InspectorContext';
import { createMockStudent } from '@/__tests__/utils';
import type { Student } from '@/types';

const layout = vi.hoisted(() => ({ isPhone: false }));

vi.mock('@/hooks/ui/useLayoutMode', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/ui/useLayoutMode')>()),
  useIsPhone: () => layout.isPhone,
}));

const students: Student[] = [
  createMockStudent({ id: 'a', name: 'Anna' }),
  createMockStudent({ id: 'b', name: 'Ben' }),
  createMockStudent({ id: 'c', name: 'Cem' }),
];

const Probe = () => {
  const { selection } = useInspector();
  return (
    <output data-testid="inspected">
      {selection
        ? `${selection.id}${selection.keepFocus ? ' keepFocus' : ''}`
        : 'none'}
    </output>
  );
};

const renderList = (
  props: Partial<React.ComponentProps<typeof StudentList>> = {},
) =>
  render(
    <InspectorProvider>
      <Probe />
      <StudentList
        students={students}
        lastAddedId={null}
        listContainerRef={{ current: null }}
        maxHeight={null}
        {...props}
      />
    </InspectorProvider>,
  );

const row = (name: string) =>
  screen.getByRole('button', {
    name: new RegExp(
      `${name} im Inspektor öffnen|Open ${name} in the inspector`,
      'i',
    ),
  });

afterEach(() => {
  cleanup();
  layout.isPhone = false;
});

describe('StudentList keyboard', () => {
  it('steps from row to row with the arrows and opens each one, keeping the focus', () => {
    renderList();
    row('Anna').focus();

    fireEvent.keyDown(row('Anna'), { key: 'ArrowDown' });
    expect(row('Ben')).toHaveFocus();
    expect(screen.getByTestId('inspected')).toHaveTextContent('b keepFocus');

    fireEvent.keyDown(row('Ben'), { key: 'ArrowUp' });
    expect(row('Anna')).toHaveFocus();
    expect(screen.getByTestId('inspected')).toHaveTextContent('a keepFocus');
  });

  it('goes to the ends with Home and End and stops there', () => {
    renderList();
    row('Anna').focus();

    fireEvent.keyDown(row('Anna'), { key: 'End' });
    expect(row('Cem')).toHaveFocus();
    fireEvent.keyDown(row('Cem'), { key: 'ArrowDown' });
    expect(row('Cem')).toHaveFocus();

    fireEvent.keyDown(row('Cem'), { key: 'Home' });
    expect(row('Anna')).toHaveFocus();
    expect(screen.getByTestId('inspected')).toHaveTextContent('a');
  });

  it('steps from checkbox to checkbox without ticking or opening', () => {
    const onToggleSelected = vi.fn();
    renderList({ isSelected: () => false, onToggleSelected });
    const boxes = screen.getAllByRole('checkbox', {
      name: /auswählen|select/i,
    });
    // The first one is the header's select-all.
    const [, anna, ben] = boxes;
    anna.focus();

    fireEvent.keyDown(anna, { key: 'ArrowDown' });
    expect(ben).toHaveFocus();
    expect(onToggleSelected).not.toHaveBeenCalled();
    expect(screen.getByTestId('inspected')).toHaveTextContent('none');
  });

  it('only moves the focus while students are ticked', () => {
    renderList({
      isSelected: (id) => id === 'c',
      onToggleSelected: vi.fn(),
      selectionActive: true,
    });
    const rows = screen.getAllByRole('button', { pressed: false });
    rows[0].focus();

    fireEvent.keyDown(rows[0], { key: 'ArrowDown' });
    expect(rows[1]).toHaveFocus();
    expect(screen.getByTestId('inspected')).toHaveTextContent('none');
  });

  it('only moves the focus on a phone, whose student is a sheet', () => {
    layout.isPhone = true;
    renderList();
    row('Anna').focus();

    fireEvent.keyDown(row('Anna'), { key: 'ArrowDown' });
    expect(row('Ben')).toHaveFocus();
    expect(screen.getByTestId('inspected')).toHaveTextContent('none');
  });
});
