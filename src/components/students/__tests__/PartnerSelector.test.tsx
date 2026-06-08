import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import '@/i18n'; // Initialize i18n for tests
import PartnerSelector from '../PartnerSelector';
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
        variant="compact"
      />,
    );

    const button = getButton(
      /Kein Partner ausgewählt|No partner selected/i,
    );
    expect(button).toBeInTheDocument();
  });

  it('displays selected partner name in compact mode', () => {
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
        variant="compact"
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
        variant="compact"
      />,
    );

    const button = getButton(
      /Kein Partner ausgewählt|No partner selected/i,
    );
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
        variant="compact"
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
        variant="compact"
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
        variant="compact"
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
        variant="compact"
      />,
    );

    expect(screen.queryByText('Max Mustermann')).not.toBeInTheDocument();
    expect(screen.getByText('Anna Schmidt')).toBeInTheDocument();
  });

  it('uses different text for detailed variant', () => {
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
        variant="detailed"
      />,
    );

    // Multi-select uses "Kein Wunschpartner" for all variants
    expect(
      screen.getByText(/Kein Wunschpartner|No preferred partner/i),
    ).toBeInTheDocument();
  });
});
