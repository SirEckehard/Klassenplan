// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test } from 'vitest';
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

test('shows a chip for every attribute that is set, and none for the rest', () => {
  render(
    <StudentRow
      student={{ ...baseStudent, restless: true, height: 'tall' }}
      index={0}
      highlight={false}
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

test('the whole row opens its student in the inspector', () => {
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
        allStudents={[baseStudent]}
      />
    </InspectorProvider>,
  );

  const row = screen.getByRole('button', {
    name: /Alice im Inspektor öffnen|Open Alice in the inspector/i,
  });
  expect(row).not.toHaveAttribute('aria-current');
  expect(screen.getByRole('status')).toHaveTextContent('none');

  fireEvent.click(row);
  expect(screen.getByRole('status')).toHaveTextContent('1');
  expect(row).toHaveAttribute('aria-current', 'true');

  // Pressing the row that is already showing keeps it, rather than shutting
  // the panel the teacher is working in.
  fireEvent.click(row);
  expect(screen.getByRole('status')).toHaveTextContent('1');
});
