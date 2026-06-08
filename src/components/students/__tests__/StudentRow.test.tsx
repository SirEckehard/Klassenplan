import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import '@/i18n'; // Initialize i18n for tests
import StudentRow from '../StudentRow';
import type { Student } from '../../../types';

const baseStudent: Student = {
  id: '1',
  name: 'Alice',
  restless: false,
  shy: false,
  concentrationIssues: false,
  needsFrontSeat: false,
};

test('shows optional gender hint and updates gender', () => {
  const updateStudent = vi.fn();
  render(
    <StudentRow
      student={baseStudent}
      index={0}
      highlight={false}
      updateStudent={updateStudent}
      removeStudent={() => {}}
      allStudents={[baseStudent]}
    />,
  );

  const genderButton = screen.getByRole('button', {
    name: /geschlecht: keine angabe|gender: not specified/i,
  });
  expect(genderButton).toBeInTheDocument();
  fireEvent.click(genderButton);

  expect(
    screen.queryByText(
      'Geschlechtsangaben sind optional. Aktuell ist „keine Angabe“ hinterlegt.',
    ),
  ).not.toBeInTheDocument();

  // Select "Junge" from dropdown - use getByText since buttons contain icon+text
  const jungeOption = screen.getByText(/^Junge$|^Boy$/i);
  fireEvent.click(jungeOption);

  expect(updateStudent).toHaveBeenCalledWith('1', { gender: 'boy' });
});

test('sets gender to diverse', () => {
  const updateStudent = vi.fn();
  render(
    <StudentRow
      student={baseStudent}
      index={0}
      highlight={false}
      updateStudent={updateStudent}
      removeStudent={() => {}}
      allStudents={[baseStudent]}
    />,
  );

  // First open the gender dropdown
  const genderButton = screen.getByRole('button', {
    name: /geschlecht: keine angabe|gender: not specified/i,
  });
  fireEvent.click(genderButton);

  // Then select "Divers" from dropdown - use getByText since buttons contain icon+text
  const diversOption = screen.getByText(/^Divers$|^Diverse$/i);
  fireEvent.click(diversOption);

  expect(updateStudent).toHaveBeenCalledWith('1', { gender: 'diverse' });
});

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
