// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useRef, useState } from 'react';
import '@/i18n'; // Initialize i18n for tests
import PartnerSelector from '../PartnerSelector';
import AvoidPartnerSelector from '../AvoidPartnerSelector';
import type { Student } from '../../../types';
import { getButton } from '../../../__tests__/utils';

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

describe('PartnerSelector', () => {
  it('renders button with HeartHandshake icon', () => {
    const student = createMockStudent();
    const dropdownRef = createRef<HTMLDivElement>();

    render(
      <PartnerSelector
        student={student}
        allStudents={[student]}
        updateStudent={vi.fn()}
        showDropdown={false}
        setShowDropdown={vi.fn()}
        dropdownRef={dropdownRef}
      />,
    );

    const button = getButton(/Kein Partner ausgewählt|No partner selected/i);
    expect(button).toBeInTheDocument();
  });

  it('names the partner it is set to', () => {
    const partner = createMockStudent({ id: '2', name: 'Anna Schmidt' });
    // Use new array field for consistent behavior with getWishPartnerIds helper
    const student = createMockStudent({
      wishPartnerId: '2',
      wishPartnerIds: ['2'],
    });
    const dropdownRef = createRef<HTMLDivElement>();

    render(
      <PartnerSelector
        student={student}
        allStudents={[student, partner]}
        updateStudent={vi.fn()}
        showDropdown={false}
        setShowDropdown={vi.fn()}
        dropdownRef={dropdownRef}
      />,
    );

    // Multi-select: tooltip shows "Wunschpartner: 1. Anna Schmidt"
    expect(getButton(/Wunschpartner|Preferred Partners/i)).toBeInTheDocument();
  });

  it('toggles dropdown when button is clicked', async () => {
    const user = userEvent.setup();
    const student = createMockStudent();
    const setShowDropdown = vi.fn();
    const dropdownRef = createRef<HTMLDivElement>();

    render(
      <PartnerSelector
        student={student}
        allStudents={[student]}
        updateStudent={vi.fn()}
        showDropdown={false}
        setShowDropdown={setShowDropdown}
        dropdownRef={dropdownRef}
      />,
    );

    const button = getButton(/Kein Partner ausgewählt|No partner selected/i);
    await user.click(button);

    expect(setShowDropdown).toHaveBeenCalledWith(true);
  });

  it('renders dropdown menu when showDropdown is true', () => {
    const partner1 = createMockStudent({ id: '2', name: 'Anna Schmidt' });
    const partner2 = createMockStudent({ id: '3', name: 'Tom Weber' });
    const student = createMockStudent();
    const dropdownRef = createRef<HTMLDivElement>();

    render(
      <PartnerSelector
        student={student}
        allStudents={[student, partner1, partner2]}
        updateStudent={vi.fn()}
        showDropdown={true}
        setShowDropdown={vi.fn()}
        dropdownRef={dropdownRef}
      />,
    );

    // Multi-select: shows "Kein Wunschpartner" as reset button
    expect(
      screen.getByText(/Kein Wunschpartner|No preferred partner/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Anna Schmidt')).toBeInTheDocument();
    expect(screen.getByText('Tom Weber')).toBeInTheDocument();
  });

  it('updates student when partner is selected', async () => {
    const user = userEvent.setup();
    const partner = createMockStudent({ id: '2', name: 'Anna Schmidt' });
    const student = createMockStudent();
    const updateStudent = vi.fn();
    const dropdownRef = createRef<HTMLDivElement>();

    render(
      <PartnerSelector
        student={student}
        allStudents={[student, partner]}
        updateStudent={updateStudent}
        showDropdown={true}
        setShowDropdown={vi.fn()}
        dropdownRef={dropdownRef}
      />,
    );

    const partnerButton = screen.getByText('Anna Schmidt');
    await user.click(partnerButton);

    expect(updateStudent).toHaveBeenCalledWith('1', {
      wishPartnerIds: ['2'],
      wishPartnerId: '2',
    });
  });

  it('clears partner when "Kein Partner" is selected', async () => {
    const user = userEvent.setup();
    const partner = createMockStudent({ id: '2', name: 'Anna Schmidt' });
    const student = createMockStudent({ wishPartnerId: '2' });
    const updateStudent = vi.fn();
    const dropdownRef = createRef<HTMLDivElement>();

    render(
      <PartnerSelector
        student={student}
        allStudents={[student, partner]}
        updateStudent={updateStudent}
        showDropdown={true}
        setShowDropdown={vi.fn()}
        dropdownRef={dropdownRef}
      />,
    );

    const clearButton = screen.getByText(
      /Kein Wunschpartner|No preferred partner/i,
    );
    await user.click(clearButton);

    expect(updateStudent).toHaveBeenCalledWith('1', {
      wishPartnerIds: [],
      wishPartnerId: null,
    });
  });

  it('excludes current student from partner list', () => {
    const partner = createMockStudent({ id: '2', name: 'Anna Schmidt' });
    const student = createMockStudent({ id: '1', name: 'Max Mustermann' });
    const dropdownRef = createRef<HTMLDivElement>();

    render(
      <PartnerSelector
        student={student}
        allStudents={[student, partner]}
        updateStudent={vi.fn()}
        showDropdown={true}
        setShowDropdown={vi.fn()}
        dropdownRef={dropdownRef}
      />,
    );

    expect(screen.queryByText('Max Mustermann')).not.toBeInTheDocument();
    expect(screen.getByText('Anna Schmidt')).toBeInTheDocument();
  });

  it('offers clearing the wish in the list', () => {
    const student = createMockStudent();
    const dropdownRef = createRef<HTMLDivElement>();

    render(
      <PartnerSelector
        student={student}
        allStudents={[student]}
        updateStudent={vi.fn()}
        showDropdown={true}
        setShowDropdown={vi.fn()}
        dropdownRef={dropdownRef}
      />,
    );

    // Multi-select uses "Kein Wunschpartner" for all variants
    expect(
      screen.getByText(/Kein Wunschpartner|No preferred partner/i),
    ).toBeInTheDocument();
  });

  // The list is portalled to the end of the page; without the focus moving in,
  // a keyboard could never reach a classmate.
  it('takes the focus into the list and gives it back on Escape', async () => {
    const partner = createMockStudent({ id: '2', name: 'Anna Schmidt' });
    const student = createMockStudent();
    const Harness = () => {
      const [open, setOpen] = useState(false);
      const dropdownRef = useRef<HTMLDivElement | null>(null);
      return (
        <PartnerSelector
          student={student}
          allStudents={[student, partner]}
          updateStudent={vi.fn()}
          showDropdown={open}
          setShowDropdown={setOpen}
          dropdownRef={dropdownRef}
        />
      );
    };
    render(<Harness />);
    const trigger = getButton(/Kein Partner ausgewählt|No partner selected/i);

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const list = screen.getByRole('dialog', {
      name: /Wunschpartner|Preferred partner/i,
    });
    await waitFor(() => expect(list).toContainElement(focusedElement()));

    fireEvent.keyDown(focusedElement() as HTMLElement, { key: 'Escape' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });
});

describe('PartnerSelector search', () => {
  const student = createMockStudent();
  const jose = createMockStudent({ id: '2', name: 'José Ortega' });
  const anna = createMockStudent({ id: '3', name: 'Anna Schmidt' });
  const ben = createMockStudent({ id: '4', name: 'Ben Annaberg' });

  const renderOpen = (
    updateStudent = vi.fn(),
    Selector = PartnerSelector,
    current = student,
  ) =>
    render(
      <Selector
        student={current}
        allStudents={[current, jose, anna, ben]}
        updateStudent={updateStudent}
        showDropdown={true}
        setShowDropdown={vi.fn()}
        dropdownRef={createRef<HTMLDivElement>()}
      />,
    );

  const searchBox = () =>
    screen.getByRole('searchbox', { name: /Schüler suchen|Search students/i });

  it('narrows the list as the teacher types, ignoring case and accents', async () => {
    const user = userEvent.setup();
    renderOpen();

    await user.type(searchBox(), 'jose');

    expect(getButton(/José Ortega/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Anna Schmidt/ }),
    ).not.toBeInTheDocument();
    // Clearing the relation stays in reach while searching.
    expect(
      getButton(/Kein Wunschpartner|No preferred partner/i),
    ).toBeInTheDocument();
  });

  it('says so when nobody matches', async () => {
    const user = userEvent.setup();
    renderOpen();

    await user.type(searchBox(), 'zzz');

    expect(
      screen.getByText(
        /Niemand passt zu dieser Suche|Nobody matches this search/i,
      ),
    ).toBeInTheDocument();
  });

  it('picks the first match on Enter', async () => {
    const user = userEvent.setup();
    const updateStudent = vi.fn();
    renderOpen(updateStudent);

    await user.type(searchBox(), 'anna{Enter}');

    expect(updateStudent).toHaveBeenCalledTimes(1);
    expect(updateStudent).toHaveBeenCalledWith('1', {
      wishPartnerIds: ['3'],
      wishPartnerId: '3',
    });
  });

  it('picks nobody on Enter while nothing is typed', async () => {
    const user = userEvent.setup();
    const updateStudent = vi.fn();
    renderOpen(updateStudent);

    await user.type(searchBox(), '{Enter}');

    expect(updateStudent).not.toHaveBeenCalled();
  });

  it('steps from the field into the matches with the down arrow', async () => {
    const user = userEvent.setup();
    renderOpen();

    await user.type(searchBox(), 'anna{ArrowDown}');

    expect(getButton(/Anna Schmidt/)).toHaveFocus();
  });

  it('skips a match that cannot be chosen any more', async () => {
    const user = userEvent.setup();
    const full = createMockStudent({
      wishPartnerIds: ['2', '5', '6'],
      wishPartnerId: '2',
    });
    renderOpen(vi.fn(), PartnerSelector, full);

    await user.type(searchBox(), 'ann{ArrowDown}');

    // Both match; neither is chosen and three wishes are set, so there is
    // nothing to step to.
    expect(getButton(/Anna Schmidt/)).toBeDisabled();
    expect(searchBox()).toHaveFocus();
  });

  it('searches the distance partners the same way', async () => {
    const user = userEvent.setup();
    const updateStudent = vi.fn();
    renderOpen(updateStudent, AvoidPartnerSelector);

    await user.type(searchBox(), 'josé{Enter}');

    expect(
      screen.queryByRole('button', { name: /Anna Schmidt/ }),
    ).not.toBeInTheDocument();
    expect(
      getButton(/Kein Distanzpartner|No distance partner/i),
    ).toBeInTheDocument();
    expect(updateStudent).toHaveBeenCalledWith('1', {
      avoidPartnerIds: ['2'],
      avoidPartnerId: '2',
    });
  });
});

const focusedElement = () => document.activeElement as HTMLElement | null;
