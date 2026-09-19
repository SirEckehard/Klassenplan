// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import '@/i18n'; // Initialize i18n for tests
import StudentRow from '../StudentRow';
import { InspectorProvider, useInspector } from '@/contexts/InspectorContext';
import type { Student } from '../../../types';

const baseStudent: Student = {
  id: '1',
  name: 'Alice',
  restless: false,
  shy: false,
  concentrationIssues: false,
  needsFrontSeat: false,
};

test('removes student via callback', () => {
  const removeStudent = vi.fn();
  render(
    <StudentRow
      student={{ ...baseStudent, gender: 'girl' }}
      index={0}
      highlight={false}
      updateStudent={() => {}}
      removeStudent={removeStudent}
      allStudents={[baseStudent]}
    />,
  );

  fireEvent.click(screen.getByLabelText(/Alice entfernen|Remove Alice/i));
  expect(removeStudent).toHaveBeenCalledWith('1');
});

test('shows a chip for every attribute that is set, and none for the rest', () => {
  render(
    <StudentRow
      student={{ ...baseStudent, restless: true, height: 'tall' }}
      index={0}
      highlight={false}
      updateStudent={() => {}}
      removeStudent={() => {}}
      allStudents={[baseStudent]}
    />,
  );

  expect(screen.getByText(/^(unruhig|restless)$/i)).toBeInTheDocument();
  expect(screen.getByText(/^(Gross|Groß|Tall)$/i)).toBeInTheDocument();
  // Unset attributes have no representation at all — that was the point.
  expect(
    screen.queryByText(/^(sch(ü|ue)chtern|shy)$/i),
  ).not.toBeInTheDocument();
});

test('opens and closes the inspector for its student', () => {
  const Probe = () => {
    const { selection } = useInspector();
    return (
      <output>{selection?.kind === 'student' ? selection.id : 'none'}</output>
    );
  };

  render(
    <InspectorProvider>
      <Probe />
      <StudentRow
        student={baseStudent}
        index={0}
        highlight={false}
        updateStudent={() => {}}
        removeStudent={() => {}}
        allStudents={[baseStudent]}
      />
    </InspectorProvider>,
  );

  const inspect = screen.getByRole('button', {
    name: /Merkmale von Alice bearbeiten|Edit attributes of Alice/i,
  });
  expect(inspect).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByRole('status')).toHaveTextContent('none');

  fireEvent.click(inspect);
  expect(screen.getByRole('status')).toHaveTextContent('1');
  expect(inspect).toHaveAttribute('aria-pressed', 'true');

  fireEvent.click(inspect);
  expect(screen.getByRole('status')).toHaveTextContent('none');
});
