// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The three classroom tools are used standing up, in front of a class, so the
 * thing they promise has to be on screen in one step: a name, a seat, a set of
 * groups. These tests hold each of them to that first screen.
 */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import Groups from '../Groups';
import WhoIsNext from '../WhoIsNext';
import SeatFinder from '../SeatFinder';
import { setupLocalStorageMock } from '@/__tests__/utils';

const seatingState = vi.hoisted(() => ({
  current: {
    currentSeating: [] as unknown[],
    classroomScene: { tables: [] as unknown[], totalStudents: 0, features: [] },
    students: [] as unknown[],
    circleLayout: null as unknown,
    activeClass: { id: 'class-1', name: '7b' },
  },
}));

vi.mock('@/contexts/SeatingPlanContext', () => ({
  useSeatingPlanState: () => seatingState.current,
}));
vi.mock('@/components/scene/PresentationScene', () => ({
  default: () => <div data-testid="presentation-scene" />,
}));

const ada = { id: 'ada', name: 'Ada Lovelace' };
const ben = { id: 'ben', name: 'Ben Berg' };
const cem = { id: 'cem', name: 'Cem Cakir' };

const withPlan = () => {
  seatingState.current = {
    currentSeating: [
      [ada, ben],
      [cem, null],
    ],
    classroomScene: {
      tables: [
        { x: 100, y: 100, width: 55, height: 130, seatCount: 2, rotation: 0 },
        { x: 300, y: 300, width: 55, height: 130, seatCount: 2, rotation: 0 },
      ],
      totalStudents: 3,
      features: [],
    },
    students: [ada, ben, cem],
    circleLayout: null,
    activeClass: { id: 'class-1', name: '7b' },
  };
};

const renderPage = (page: React.ReactNode) =>
  render(<MemoryRouter>{page}</MemoryRouter>);

beforeEach(() => {
  setupLocalStorageMock();
  seatingState.current = {
    currentSeating: [],
    classroomScene: { tables: [], totalStudents: 0, features: [] },
    students: [],
    circleLayout: null,
    activeClass: { id: 'class-1', name: '7b' },
  };
});

describe('Gruppen bilden', () => {
  it('says what it needs when there is no class', () => {
    renderPage(<Groups />);

    expect(
      screen.getByText(/Keine Klasse zum Aufteilen|No class to split/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Gruppen ziehen|Draw groups/ }),
    ).not.toBeInTheDocument();
  });

  it('draws every student into a group', () => {
    seatingState.current = {
      ...seatingState.current,
      students: [ada, ben, cem],
    };

    renderPage(<Groups />);
    fireEvent.click(
      screen.getByRole('button', { name: /Gruppen ziehen|Draw groups/ }),
    );

    const groups = screen.getAllByRole('list');
    for (const student of [ada, ben, cem]) {
      expect(
        groups.some((list) => within(list).queryByText(student.name)),
      ).toBe(true);
    }
  });
});

describe('Wer kommt dran?', () => {
  it('draws from the class list even without a plan', () => {
    seatingState.current = { ...seatingState.current, students: [ada] };

    renderPage(<WhoIsNext />);
    fireEvent.click(screen.getByRole('button', { name: /Ziehen|Draw/ }));

    expect(screen.getByRole('status')).toHaveTextContent('Ada Lovelace');
  });

  it('names the seat when there is a plan', () => {
    withPlan();

    renderPage(<WhoIsNext />);
    fireEvent.click(screen.getByRole('button', { name: /Ziehen|Draw/ }));

    // Whoever was drawn, their table is part of the answer.
    expect(screen.getByRole('status')).toHaveTextContent(/Tisch \d|Table \d/);
  });
});

describe('Wo sitzt wer?', () => {
  it('asks for a plan before it can answer', () => {
    seatingState.current = { ...seatingState.current, students: [ada] };

    renderPage(<SeatFinder />);

    expect(
      screen.getByText(/Noch kein Sitzplan|No seating plan yet/),
    ).toBeInTheDocument();
  });

  it('answers as soon as one name is left', () => {
    withPlan();

    renderPage(<SeatFinder />);
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'ada' },
    });

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText(/Tisch 1|Table 1/)).toBeInTheDocument();
    // The plan comes along, so the sentence can be checked against the room.
    expect(screen.getByTestId('presentation-scene')).toBeInTheDocument();
  });

  it('says so when nobody matches', () => {
    withPlan();

    renderPage(<SeatFinder />);
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'Zzz' },
    });

    expect(
      screen.getByText(/Niemand in diesem Plan|Nobody in this plan/),
    ).toBeInTheDocument();
  });
});
