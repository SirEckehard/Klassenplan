import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@/i18n'; // Initialize i18n for tests
import SpecialNeedsToggles from '../SpecialNeedsToggles';
import type { Student } from '../../../types';

const createMockStudent = (overrides?: Partial<Student>): Student => ({
  id: '1',
  name: 'Max Mustermann',
  gender: 'boy',
  wishPartnerId: null,
  avoidPartnerId: null,
  needsFrontSeat: false,
  restless: false,
  shy: false,
  concentrationIssues: false,
  ...overrides,
});

describe('SpecialNeedsToggles', () => {
  describe('compact variant', () => {
    it('renders all special needs toggle buttons', () => {
      const student = createMockStudent();

      render(
        <SpecialNeedsToggles
          student={student}
          updateStudent={vi.fn()}
          variant="compact"
        />,
      );

      // Should render 6 flag buttons (restless, shy, concentration, sensory, performance strong/weak)
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(6);
    });

    it('shows inactive state for unchecked flags', () => {
      const student = createMockStudent({
        needsFrontSeat: false,
        restless: false,
        shy: false,
        concentrationIssues: false,
      });

      render(
        <SpecialNeedsToggles
          student={student}
          updateStudent={vi.fn()}
          variant="compact"
        />,
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveClass('text-gray-700!');
        expect(button).not.toHaveClass('bg-amber-300!');
      });
    });

    it('shows active state for checked flags', () => {
      const student = createMockStudent({
        restless: true,
      });

      render(
        <SpecialNeedsToggles
          student={student}
          updateStudent={vi.fn()}
          variant="compact"
        />,
      );

      const restlessButton = screen.getByRole('button', {
        name: /unruhig|restless/i,
      });
      expect(restlessButton).toHaveClass('bg-amber-300!');
    });

    it('toggles flag when button is clicked', async () => {
      const user = userEvent.setup();
      const student = createMockStudent({ restless: false });
      const updateStudent = vi.fn();

      render(
        <SpecialNeedsToggles
          student={student}
          updateStudent={updateStudent}
          variant="compact"
        />,
      );

      const buttons = screen.getAllByRole('button');
      await user.click(buttons[0]); // Click first flag

      expect(updateStudent).toHaveBeenCalledWith('1', expect.any(Object));
    });

    it('handles mutual exclusivity for performance strong/weak', async () => {
      const user = userEvent.setup();
      const student = createMockStudent({
        performanceStrong: true,
        performanceWeak: false,
      });
      const updateStudent = vi.fn();

      render(
        <SpecialNeedsToggles
          student={student}
          updateStudent={updateStudent}
          variant="compact"
        />,
      );

      const buttons = screen.getAllByRole('button');
      // Click performance weak button - index 1 per STUDENT_FLAGS order
      await user.click(buttons[1]);

      // Should toggle performance weak on and strong off
      const call = updateStudent.mock.calls[0];
      expect(call[1]).toHaveProperty('performanceWeak', true);
      expect(call[1]).toHaveProperty('performanceStrong', false);
    });
  });

  describe('detailed variant', () => {
    it('renders section with heading', () => {
      const student = createMockStudent();

      render(
        <SpecialNeedsToggles
          student={student}
          updateStudent={vi.fn()}
          variant="detailed"
        />,
      );

      expect(
        screen.getByText(/Besondere Bedürfnisse|Special Needs/i),
      ).toBeInTheDocument();
    });

    it('renders labeled buttons for all flags', () => {
      const student = createMockStudent();

      render(
        <SpecialNeedsToggles
          student={student}
          updateStudent={vi.fn()}
          variant="detailed"
        />,
      );

      // Check for some labels (these come from i18n translations)
      expect(screen.getByText(/unruhig|restless/i)).toBeInTheDocument();
      expect(screen.getByText(/leistungsstark|high performer/i)).toBeInTheDocument();
      expect(screen.getByText(/leistungsschwach|needs support/i)).toBeInTheDocument();
    });

    it('highlights active flags', () => {
      const student = createMockStudent({
        restless: true,
      });

      render(
        <SpecialNeedsToggles
          student={student}
          updateStudent={vi.fn()}
          variant="detailed"
        />,
      );

      const restlessButton = screen.getByRole('button', {
        name: /unruhig|restless/i,
      });
      expect(restlessButton).toHaveClass('bg-amber-300!');
    });

    it('toggles flag when button is clicked', async () => {
      const user = userEvent.setup();
      const student = createMockStudent({ restless: false });
      const updateStudent = vi.fn();

      render(
        <SpecialNeedsToggles
          student={student}
          updateStudent={updateStudent}
          variant="detailed"
        />,
      );

      const restlessButton = screen.getByRole('button', {
        name: /unruhig|restless/i,
      });
      await user.click(restlessButton);

      expect(updateStudent).toHaveBeenCalledWith('1', expect.any(Object));
    });
  });
});
