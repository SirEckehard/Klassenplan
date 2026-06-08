import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import '@/i18n'; // Initialize i18n for tests
import HeightSelector from '../HeightSelector';
import type { Student } from '../../../types';

const createMockStudent = (overrides?: Partial<Student>): Student => ({
  id: '1',
  name: 'Max Mustermann',
  gender: 'boy',
  height: 'medium',
  wishPartnerId: null,
  avoidPartnerId: null,
  needsFrontSeat: false,
  restless: false,
  shy: false,
  concentrationIssues: false,
  ...overrides,
});

describe('HeightSelector', () => {
  describe('compact variant', () => {
    it('displays medium height by default', () => {
      const student = createMockStudent({ height: undefined });
      const dropdownRef = createRef<HTMLDivElement>();

      render(
        <HeightSelector
          student={student}
          updateStudent={vi.fn()}
          variant="compact"
          showDropdown={false}
          setShowDropdown={vi.fn()}
          dropdownRef={dropdownRef}
        />,
      );

      const button = screen.getByRole('button', {
        name: /körpergröße:|height:/i,
      });
      // Neutral/undefined height uses gray-200 styling like GenderSelector
      expect(button).toHaveClass('border-gray-200!');
    });

    it('displays small height icon when height is small', () => {
      const student = createMockStudent({ height: 'small' });
      const dropdownRef = createRef<HTMLDivElement>();

      render(
        <HeightSelector
          student={student}
          updateStudent={vi.fn()}
          variant="compact"
          showDropdown={false}
          setShowDropdown={vi.fn()}
          dropdownRef={dropdownRef}
        />,
      );

      const button = screen.getByRole('button', {
        name: /körpergröße:|height:/i,
      });
      expect(button).toHaveClass('border-blue-400!');
    });

    it('displays tall height icon when height is tall', () => {
      const student = createMockStudent({ height: 'tall' });
      const dropdownRef = createRef<HTMLDivElement>();

      render(
        <HeightSelector
          student={student}
          updateStudent={vi.fn()}
          variant="compact"
          showDropdown={false}
          setShowDropdown={vi.fn()}
          dropdownRef={dropdownRef}
        />,
      );

      const button = screen.getByRole('button', {
        name: /körpergröße:|height:/i,
      });
      expect(button).toHaveClass('border-orange-500!');
    });

    it('toggles dropdown when button is clicked', async () => {
      const user = userEvent.setup();
      const student = createMockStudent();
      const setShowDropdown = vi.fn();
      const dropdownRef = createRef<HTMLDivElement>();

      render(
        <HeightSelector
          student={student}
          updateStudent={vi.fn()}
          variant="compact"
          showDropdown={false}
          setShowDropdown={setShowDropdown}
          dropdownRef={dropdownRef}
        />,
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(setShowDropdown).toHaveBeenCalledWith(true);
    });

    it('renders all height options in dropdown', () => {
      const student = createMockStudent();
      const dropdownRef = createRef<HTMLDivElement>();

      render(
        <HeightSelector
          student={student}
          updateStudent={vi.fn()}
          variant="compact"
          showDropdown={true}
          setShowDropdown={vi.fn()}
          dropdownRef={dropdownRef}
        />,
      );

      expect(screen.getByText(/Klein|Short/i)).toBeInTheDocument();
      expect(screen.getByText(/Mittel|Medium/i)).toBeInTheDocument();
      expect(screen.getByText(/Groß|Tall/i)).toBeInTheDocument();
    });

    it('updates student when height is selected from dropdown', async () => {
      const user = userEvent.setup();
      const student = createMockStudent({ height: 'medium' });
      const updateStudent = vi.fn();
      const dropdownRef = createRef<HTMLDivElement>();
      const setShowDropdown = vi.fn();

      render(
        <HeightSelector
          student={student}
          updateStudent={updateStudent}
          variant="compact"
          showDropdown={true}
          setShowDropdown={setShowDropdown}
          dropdownRef={dropdownRef}
        />,
      );

      // Dropdown options contain icon+text, use getByText to find the option
      const smallOption = screen.getByText(/^Klein$|^Short$/i);
      await user.click(smallOption);

      expect(updateStudent).toHaveBeenCalledWith('1', { height: 'small' });
      expect(setShowDropdown).toHaveBeenCalledWith(false);
    });

    it('closes dropdown after selecting height in compact mode', async () => {
      const user = userEvent.setup();
      const student = createMockStudent({ height: 'medium' });
      const updateStudent = vi.fn();
      const setShowDropdown = vi.fn();
      const dropdownRef = createRef<HTMLDivElement>();

      render(
        <HeightSelector
          student={student}
          updateStudent={updateStudent}
          variant="compact"
          showDropdown={true}
          setShowDropdown={setShowDropdown}
          dropdownRef={dropdownRef}
        />,
      );

      // Dropdown options contain icon+text, use getByText to find the option
      const tallOption = screen.getByText(/^Groß$|^Tall$/i);
      await user.click(tallOption);

      expect(setShowDropdown).toHaveBeenCalledWith(false);
    });
  });

  describe('detailed variant', () => {
    it('renders section header', () => {
      const student = createMockStudent();

      render(
        <HeightSelector
          student={student}
          updateStudent={vi.fn()}
          variant="detailed"
        />,
      );

      expect(screen.getByText(/Körpergröße|Height/i)).toBeInTheDocument();
    });

    it('renders all three height buttons', () => {
      const student = createMockStudent();

      render(
        <HeightSelector
          student={student}
          updateStudent={vi.fn()}
          variant="detailed"
        />,
      );

      expect(
        screen.getByRole('button', { name: /klein|short/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /mittel|medium/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /groß|tall/i }),
      ).toBeInTheDocument();
    });

    it('highlights selected height', () => {
      const student = createMockStudent({ height: 'small' });

      render(
        <HeightSelector
          student={student}
          updateStudent={vi.fn()}
          variant="detailed"
        />,
      );

      const smallButton = screen.getByRole('button', { name: /klein|short/i });
      expect(smallButton).toHaveClass('border-blue-400!');
      expect(smallButton).toHaveClass('bg-blue-200/50!');

      const mediumButton = screen.getByRole('button', {
        name: /mittel|medium/i,
      });
      expect(mediumButton).not.toHaveClass('border-blue-400!');
    });

    it('updates student when height button is clicked', async () => {
      const user = userEvent.setup();
      const student = createMockStudent({ height: 'medium' });
      const updateStudent = vi.fn();

      render(
        <HeightSelector
          student={student}
          updateStudent={updateStudent}
          variant="detailed"
        />,
      );

      const tallButton = screen.getByRole('button', { name: /groß|tall/i });
      await user.click(tallButton);

      expect(updateStudent).toHaveBeenCalledWith('1', { height: 'tall' });
    });

    it('does not close dropdown in detailed mode (no dropdown)', async () => {
      const user = userEvent.setup();
      const student = createMockStudent();
      const updateStudent = vi.fn();

      render(
        <HeightSelector
          student={student}
          updateStudent={updateStudent}
          variant="detailed"
        />,
      );

      const smallButton = screen.getByRole('button', { name: /klein|short/i });
      await user.click(smallButton);

      // Just verify no errors occur
      expect(updateStudent).toHaveBeenCalled();
    });

    it('provides tooltips for height buttons', () => {
      const student = createMockStudent();

      render(
        <HeightSelector
          student={student}
          updateStudent={vi.fn()}
          variant="detailed"
        />,
      );

      const smallButton = screen.getByRole('button', { name: /klein|short/i });
      expect(smallButton.getAttribute('title')).toMatch(
        /Kleinere Schüler|Shorter students/i,
      );

      const mediumButton = screen.getByRole('button', {
        name: /mittel|medium/i,
      });
      expect(mediumButton.getAttribute('title')).toMatch(
        /Mittlere Größe|Medium height/i,
      );

      const tallButton = screen.getByRole('button', { name: /groß|tall/i });
      expect(tallButton.getAttribute('title')).toMatch(
        /Größere Schüler|Taller students/i,
      );
    });
  });
});
