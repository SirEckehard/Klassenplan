// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import '@/i18n'; // Initialize i18n for tests
import GenderSelector from '../GenderSelector';
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

describe('GenderSelector', () => {
  describe('compact variant', () => {
    it('renders neutral fallback when no gender is selected', () => {
      const student = createMockStudent({ gender: undefined });
      const dropdownRef = createRef<HTMLDivElement>();

      render(
        <GenderSelector
          student={student}
          updateStudent={vi.fn()}
          variant="compact"
          showDropdown={false}
          setShowDropdown={vi.fn()}
          dropdownRef={dropdownRef}
          hintId="hint-1"
        />,
      );

      const button = screen.getByRole('button', {
        name: /geschlecht: keine angabe|gender: not specified/i,
      });
      expect(button).toHaveClass('border-gray-200!');
      expect(button).toHaveClass('bg-white!');
      expect(button).toHaveClass('dark:bg-gray-900!');
      expect(button).toHaveAttribute(
        'title',
        expect.stringMatching(/Keine Angabe|Not specified/i),
      );
      expect(
        within(button).queryByText('Keine Angabe'),
      ).not.toBeInTheDocument();
      expect(button.querySelector('svg')).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-describedby', 'hint-1');
    });

    it('omits aria-describedby when no hint id is provided', () => {
      const student = createMockStudent({ gender: undefined });
      const dropdownRef = createRef<HTMLDivElement>();

      render(
        <GenderSelector
          student={student}
          updateStudent={vi.fn()}
          variant="compact"
          showDropdown={false}
          setShowDropdown={vi.fn()}
          dropdownRef={dropdownRef}
        />,
      );

      const button = screen.getByRole('button', {
        name: /geschlecht: keine angabe|gender: not specified/i,
      });
      expect(button).not.toHaveAttribute('aria-describedby');
    });

    it('displays gender icon when gender is selected', () => {
      const student = createMockStudent({ gender: 'boy' });
      const dropdownRef = createRef<HTMLDivElement>();

      render(
        <GenderSelector
          student={student}
          updateStudent={vi.fn()}
          variant="compact"
          showDropdown={false}
          setShowDropdown={vi.fn()}
          dropdownRef={dropdownRef}
        />,
      );

      const button = screen.getByRole('button', {
        name: /^(geschlecht: männlich|gender: male)$/i,
      });
      expect(button).toHaveClass('border-emerald-400!');
    });

    it('toggles dropdown when button is clicked', async () => {
      const user = userEvent.setup();
      const student = createMockStudent();
      const setShowDropdown = vi.fn();
      const dropdownRef = createRef<HTMLDivElement>();

      render(
        <GenderSelector
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

    it('renders all gender options in dropdown', () => {
      const student = createMockStudent();
      const dropdownRef = createRef<HTMLDivElement>();

      render(
        <GenderSelector
          student={student}
          updateStudent={vi.fn()}
          variant="compact"
          showDropdown={true}
          setShowDropdown={vi.fn()}
          dropdownRef={dropdownRef}
        />,
      );

      expect(screen.getByText(/^(Männlich|Male)$/i)).toBeInTheDocument();
      expect(screen.getByText(/^(Weiblich|Female)$/i)).toBeInTheDocument();
      expect(screen.getByText(/^(Divers|Diverse)$/i)).toBeInTheDocument();
    });

    it('updates student when gender is selected from dropdown', async () => {
      const user = userEvent.setup();
      const student = createMockStudent({ gender: undefined });
      const updateStudent = vi.fn();
      const dropdownRef = createRef<HTMLDivElement>();
      const setShowDropdown = vi.fn();

      render(
        <GenderSelector
          student={student}
          updateStudent={updateStudent}
          variant="compact"
          showDropdown={true}
          setShowDropdown={setShowDropdown}
          dropdownRef={dropdownRef}
        />,
      );

      // Dropdown options contain icon+text, use getByText to find the option
      const girlOption = screen.getByText(/^(Weiblich|Female)$/i);
      await user.click(girlOption);

      expect(updateStudent).toHaveBeenCalledWith('1', { gender: 'girl' });
      expect(setShowDropdown).toHaveBeenCalledWith(false);
    });

    it('closes dropdown after selecting gender in compact mode', async () => {
      const user = userEvent.setup();
      const student = createMockStudent({ gender: undefined });
      const updateStudent = vi.fn();
      const setShowDropdown = vi.fn();
      const dropdownRef = createRef<HTMLDivElement>();

      render(
        <GenderSelector
          student={student}
          updateStudent={updateStudent}
          variant="compact"
          showDropdown={true}
          setShowDropdown={setShowDropdown}
          dropdownRef={dropdownRef}
        />,
      );

      // Dropdown options contain icon+text, use getByText to find the option
      const boyOption = screen.getByText(/^(Männlich|Male)$/i);
      await user.click(boyOption);

      expect(updateStudent).toHaveBeenCalledWith('1', { gender: 'boy' });
      expect(setShowDropdown).toHaveBeenLastCalledWith(false);
    });

    it('resets gender when selecting the active option from dropdown', async () => {
      const user = userEvent.setup();
      const student = createMockStudent({ gender: 'boy' });
      const updateStudent = vi.fn();
      const setShowDropdown = vi.fn();
      const dropdownRef = createRef<HTMLDivElement>();

      render(
        <GenderSelector
          student={student}
          updateStudent={updateStudent}
          variant="compact"
          showDropdown={true}
          setShowDropdown={setShowDropdown}
          dropdownRef={dropdownRef}
        />,
      );

      // Dropdown options contain icon+text, use getByText to find the option
      const boyOption = screen.getByText(/^(Männlich|Male)$/i);
      await user.click(boyOption);

      expect(updateStudent).toHaveBeenCalledWith('1', { gender: undefined });
      expect(setShowDropdown).toHaveBeenCalledWith(false);
    });
  });

  describe('detailed variant', () => {
    it('renders section with heading', () => {
      const student = createMockStudent({ gender: undefined });

      render(
        <GenderSelector
          student={student}
          updateStudent={vi.fn()}
          variant="detailed"
        />,
      );

      // Both heading and hint contain 'Geschlecht', so use getAllByText
      const genderTexts = screen.getAllByText(/Geschlecht|Gender/i);
      expect(genderTexts.length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByText(
          /Geschlechtsangaben sind optional|Gender is optional/i,
        ),
      ).toBeInTheDocument();
    });

    it('shows all three gender buttons', () => {
      const student = createMockStudent();

      render(
        <GenderSelector
          student={student}
          updateStudent={vi.fn()}
          variant="detailed"
        />,
      );

      expect(
        screen.getByRole('button', {
          name: /^(geschlecht: männlich|gender: male)$/i,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', {
          name: /^(geschlecht: weiblich|gender: female)$/i,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', {
          name: /^(geschlecht: divers|gender: diverse)$/i,
        }),
      ).toBeInTheDocument();
    });

    it('highlights selected gender button', () => {
      const student = createMockStudent({ gender: 'girl' });

      render(
        <GenderSelector
          student={student}
          updateStudent={vi.fn()}
          variant="detailed"
        />,
      );

      const girlButton = screen.getByRole('button', {
        name: /^(geschlecht: weiblich|gender: female)$/i,
      });
      expect(girlButton).toHaveClass('border-purple-500!');
      expect(girlButton).toHaveClass('bg-purple-200!');
    });

    it('updates student when gender button is clicked', async () => {
      const user = userEvent.setup();
      const student = createMockStudent({ gender: undefined });
      const updateStudent = vi.fn();

      render(
        <GenderSelector
          student={student}
          updateStudent={updateStudent}
          variant="detailed"
          hintId="hint-1"
        />,
      );

      const diversButton = screen.getByRole('button', {
        name: /divers|diverse/i,
      });
      expect(diversButton).toHaveAttribute('aria-describedby', 'hint-1');
      await user.click(diversButton);

      expect(updateStudent).toHaveBeenCalledWith('1', { gender: 'diverse' });
    });

    it('resets gender when clicking the active detailed button', async () => {
      const user = userEvent.setup();
      const student = createMockStudent({ gender: 'girl' });
      const updateStudent = vi.fn();

      render(
        <GenderSelector
          student={student}
          updateStudent={updateStudent}
          variant="detailed"
        />,
      );

      const girlButton = screen.getByRole('button', {
        name: /^(geschlecht: weiblich|gender: female)$/i,
      });
      await user.click(girlButton);

      expect(updateStudent).toHaveBeenCalledWith('1', { gender: undefined });
    });
  });
});
