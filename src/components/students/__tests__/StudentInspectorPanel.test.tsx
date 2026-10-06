// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import StudentInspectorPanel from '../StudentInspectorPanel';
import { createMockStudent } from '@/__tests__/utils';
import type { Student } from '@/types';

const anna = createMockStudent({ id: 'a', name: 'Anna' });
const ben = createMockStudent({ id: 'b', name: 'Ben' });
const unnamed = createMockStudent({ id: 'c', name: '' });

/** Holds the opened student, as the shell does. */
function Host({
  students,
  order,
  initialId,
  updateStudent = vi.fn(),
}: {
  students: Student[];
  order?: Student[];
  initialId: string;
  updateStudent?: (id: string, patch: Partial<Student>) => void;
}) {
  const [openId, setOpenId] = React.useState(initialId);
  const student = students.find((entry) => entry.id === openId)!;
  return (
    <>
      <input aria-label="Suche" />
      <output data-testid="open">{openId}</output>
      <StudentInspectorPanel
        student={student}
        students={students}
        order={order}
        updateStudent={updateStudent}
        removeStudent={vi.fn()}
        onOpen={setOpenId}
        onClose={vi.fn()}
      />
    </>
  );
}

const open = () => screen.getByTestId('open');

afterEach(cleanup);

describe('StudentInspectorPanel stepping', () => {
  it('steps with Alt/⌥+↑/↓ and stops at the ends', () => {
    render(<Host students={[anna, ben]} initialId="a" />);

    fireEvent.keyDown(window, { key: 'ArrowDown', altKey: true });
    expect(open()).toHaveTextContent('b');
    fireEvent.keyDown(window, { key: 'ArrowDown', altKey: true });
    expect(open()).toHaveTextContent('b');
    fireEvent.keyDown(window, { key: 'ArrowUp', altKey: true });
    expect(open()).toHaveTextContent('a');
  });

  it('steps and counts in the order the list shows', () => {
    render(<Host students={[anna, ben]} order={[ben, anna]} initialId="b" />);
    expect(screen.getByText(/1 (von|of) 2/)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowDown', altKey: true });
    expect(open()).toHaveTextContent('a');
    expect(screen.getByText(/2 (von|of) 2/)).toBeInTheDocument();
  });

  it('falls back to the class order for a student the list no longer shows', () => {
    render(<Host students={[anna, ben]} order={[ben]} initialId="a" />);

    fireEvent.keyDown(window, { key: 'ArrowDown', altKey: true });
    expect(open()).toHaveTextContent('b');
  });

  it('leaves Alt/⌥+↑/↓ to a text field', () => {
    render(<Host students={[anna, ben]} initialId="a" />);
    const search = screen.getByRole('textbox', { name: 'Suche' });
    search.focus();

    fireEvent.keyDown(search, { key: 'ArrowDown', altKey: true });
    expect(open()).toHaveTextContent('a');
  });

  it('does not let an unnamed student it steps to take the focus', () => {
    render(<Host students={[ben, unnamed]} initialId="b" />);
    const next = screen.getByRole('button', {
      name: /Nächster Schüler|Next student/i,
    });
    next.focus();

    fireEvent.keyDown(next, { key: 'ArrowDown', altKey: true });
    expect(open()).toHaveTextContent('c');
    expect(next).toHaveFocus();
  });

  it('steps on from an untouched name field', () => {
    render(<Host students={[unnamed, anna]} initialId="c" />);
    const field = document.querySelector<HTMLInputElement>(
      '[data-student-name-input]',
    )!;
    expect(field).toHaveFocus();

    fireEvent.keyDown(field, { key: 'ArrowDown', altKey: true });
    expect(open()).toHaveTextContent('a');
  });

  it('saves a typed name before stepping on, and holds the step when it is refused', () => {
    const updateStudent = vi.fn();
    render(
      <Host
        students={[unnamed, anna, ben]}
        initialId="c"
        updateStudent={updateStudent}
      />,
    );
    const field = document.querySelector<HTMLInputElement>(
      '[data-student-name-input]',
    )!;

    // "Anna" is taken: refused, the step does not happen.
    fireEvent.change(field, { target: { value: 'Anna' } });
    fireEvent.keyDown(field, { key: 'ArrowDown', altKey: true });
    expect(updateStudent).not.toHaveBeenCalled();
    expect(open()).toHaveTextContent('c');

    fireEvent.change(field, { target: { value: 'Clara' } });
    fireEvent.keyDown(field, { key: 'ArrowDown', altKey: true });
    expect(updateStudent).toHaveBeenCalledWith('c', { name: 'Clara' });
    expect(open()).toHaveTextContent('a');
  });
});
