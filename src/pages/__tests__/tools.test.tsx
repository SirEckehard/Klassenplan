// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The classroom tools are used standing up, in front of a class, so the thing
 * they promise has to be on screen in one step: a name, a seat, a set of
 * groups, who does which duty. These tests hold each of them to that first
 * screen.
 */
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import Groups from '../Groups';
import Duties from '../Duties';
import WhoIsNext from '../WhoIsNext';
import SeatFinder from '../SeatFinder';
import { setupLocalStorageMock } from '@/__tests__/utils';

const seatingState = vi.hoisted(() => ({
  current: {
    currentSeating: [] as unknown[],
    classroomScene: { tables: [] as unknown[], totalStudents: 0, features: [] },
    students: [] as unknown[],
    circleLayout: null as unknown,
    seatingMode: 'table' as 'table' | 'circle',
    activeClass: { id: 'class-1', name: '7b' },
  },
}));

vi.mock('@/contexts/SeatingPlanContext', () => ({
  useSeatingPlanState: () => seatingState.current,
}));
// The duties are stored per class; here in a map that each test starts empty.
const dutyMemory = vi.hoisted(() => new Map<string, unknown>());
vi.mock('@/repositories/dutyStore', () => ({
  emptyClassDuties: () => ({ duties: [], current: null, rounds: [] }),
  loadClassDuties: async (classId: string) =>
    dutyMemory.get(classId) ?? { duties: [], current: null, rounds: [] },
  saveClassDuties: async (classId: string, duties: unknown) => {
    dutyMemory.set(classId, duties);
    return true;
  },
}));
const exportDutyRosterToPdf = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('@/services/export/pdfExportFunctions', () => ({
  exportDutyRosterToPdf,
}));
vi.mock('@/components/scene/PresentationScene', () => ({
  default: () => <div data-testid="presentation-scene" />,
}));
vi.mock('@/components/circle/SimpleCircleView', () => ({
  default: ({ spotlightStudentId }: { spotlightStudentId?: string | null }) => (
    <div data-testid="circle-view" data-spotlight={spotlightStudentId ?? ''} />
  ),
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
    seatingMode: 'table',
    activeClass: { id: 'class-1', name: '7b' },
  };
};

// The room set up anew under the plan: one table now, the seating still for
// the two before it (`hasPlanForScene` is false until the plan layer mixes).
const withStalePlan = () => {
  withPlan();
  seatingState.current = {
    ...seatingState.current,
    classroomScene: {
      ...seatingState.current.classroomScene,
      tables: seatingState.current.classroomScene.tables.slice(0, 1),
    },
  };
};

const renderPage = (page: React.ReactNode) =>
  render(<MemoryRouter>{page}</MemoryRouter>);

beforeEach(() => {
  setupLocalStorageMock();
  dutyMemory.clear();
  seatingState.current = {
    currentSeating: [],
    classroomScene: { tables: [], totalStudents: 0, features: [] },
    students: [],
    circleLayout: null,
    seatingMode: 'table',
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

  // The plan with the drawn seat lit, as "Wo sitzt wer?" shows a found one —
  // and only once somebody is drawn, since there is nothing to light before.
  it('shows the plan with the drawn seat', () => {
    withPlan();

    renderPage(<WhoIsNext />);
    expect(screen.queryByTestId('presentation-scene')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Ziehen|Draw/ }));

    expect(screen.getByTestId('presentation-scene')).toBeInTheDocument();
  });

  it('draws from the class list while the plan is for tables that are gone', () => {
    withStalePlan();

    renderPage(<WhoIsNext />);
    fireEvent.click(screen.getByRole('button', { name: /Ziehen|Draw/ }));

    expect(screen.getByRole('status')).toHaveTextContent(
      /Ada Lovelace|Ben Berg|Cem Cakir/,
    );
    expect(screen.getByRole('status')).not.toHaveTextContent(/Tisch|Table/);
    expect(screen.queryByTestId('presentation-scene')).not.toBeInTheDocument();
  });

  // In the circle there is no table to name: the answer is who sits on
  // either side, and everybody in the circle is drawn, a table seat or not.
  it('names the neighbours in the circle while the class sits in one', () => {
    withPlan();
    seatingState.current = {
      ...seatingState.current,
      seatingMode: 'circle',
      circleLayout: {
        students: [ada, ben, cem].map((student, index) => ({
          student,
          position: index,
        })),
      },
    };

    renderPage(<WhoIsNext />);
    fireEvent.click(screen.getByRole('button', { name: /Ziehen|Draw/ }));

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(/im Sitzkreis|in the circle/);
    expect(status).toHaveTextContent(/zwischen .+ und |between .+ and /);
    expect(status).not.toHaveTextContent(/Tisch \d|Table \d/);
    // The circle is drawn with the drawn student's place lit, not the tables.
    // The line names the neighbours too, so the drawn name is the one it
    // starts with.
    const drawn = [ada, ben, cem].find((student) =>
      status.textContent?.startsWith(student.name),
    );
    expect(screen.getByTestId('circle-view')).toHaveAttribute(
      'data-spotlight',
      drawn?.id,
    );
    expect(screen.queryByTestId('presentation-scene')).not.toBeInTheDocument();
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

  it('asks for a plan while the plan is for tables that are gone', () => {
    withStalePlan();

    renderPage(<SeatFinder />);

    expect(
      screen.getByText(/Noch kein Sitzplan|No seating plan yet/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
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

  it('finds a name whatever its accents, as the class list does', () => {
    withPlan();

    renderPage(<SeatFinder />);
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'Çakir' },
    });

    expect(screen.getByText('Cem Cakir')).toBeInTheDocument();
    expect(screen.getByText(/Tisch|Table/)).toBeInTheDocument();
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

describe('Dienste verteilen', () => {
  it('says what it needs when there is no class', async () => {
    renderPage(<Duties />);

    expect(
      screen.getByText(/Keine Klasse für Dienste|No class for duties/),
    ).toBeInTheDocument();
    // The duties load after mounting; they settle inside act.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  });

  it('hands out a suggested duty and keeps it for the class', async () => {
    seatingState.current = {
      ...seatingState.current,
      students: [ada, ben, cem],
    };

    renderPage(<Duties />);
    fireEvent.click(
      await screen.findByRole('button', { name: /Tafeldienst|Board duty/ }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: /^(Dienste verteilen|Hand out duties)$/,
      }),
    );

    const card = screen
      .getAllByRole('listitem')
      .find((item) => /Tafeldienst|Board duty/.test(item.textContent ?? ''));
    expect(card).toBeDefined();
    expect(
      [ada, ben, cem].filter((student) =>
        within(card!).queryByText(student.name),
      ),
    ).toHaveLength(1);
    await vi.waitFor(() =>
      expect(dutyMemory.get('class-1')).toMatchObject({
        duties: [{ name: expect.stringMatching(/Tafeldienst|Board duty/) }],
        current: { assignments: expect.any(Object) },
      }),
    );
  });

  it('stands someone else in for a student who cannot do it', async () => {
    seatingState.current = {
      ...seatingState.current,
      students: [ada, ben],
    };
    dutyMemory.set('class-1', {
      duties: [{ id: 'board', name: 'Tafeldienst', count: 1 }],
      current: {
        at: '2026-10-11T08:00:00.000Z',
        assignments: { board: ['ada'] },
      },
      rounds: [],
    });

    renderPage(<Duties />);
    fireEvent.click(
      await screen.findByRole('button', {
        name: /Ada Lovelace durch jemand anderen ersetzen|Replace Ada Lovelace/,
      }),
    );

    expect(screen.getByText(ben.name)).toBeInTheDocument();
    expect(screen.queryByText(ada.name)).not.toBeInTheDocument();
  });
});

describe('Dienste verteilen: the rota as a PDF', () => {
  it('hands the round to the PDF export', async () => {
    seatingState.current = {
      ...seatingState.current,
      students: [ada, ben],
    };
    dutyMemory.set('class-1', {
      duties: [{ id: 'bins', name: 'Mülldienst', count: 2 }],
      current: {
        at: '2026-10-11T08:00:00.000Z',
        assignments: { bins: ['ben'] },
      },
      rounds: [],
    });

    renderPage(<Duties />);
    fireEvent.click(await screen.findByRole('button', { name: /^PDF$/ }));

    await vi.waitFor(() =>
      expect(exportDutyRosterToPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          at: '2026-10-11T08:00:00.000Z',
          rows: [{ name: 'Mülldienst', holders: [ben.name], open: 1 }],
        }),
        expect.stringMatching(/_7b$/),
      ),
    );
  });
});

describe('the way back from a tool', () => {
  const renderAt = (entries: string[]) =>
    render(
      <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
        <Routes>
          <Route path="/gruppen" element={<Groups />} />
          <Route path="/present" element={<p>Projektion</p>} />
          <Route path="/generator" element={<p>Arbeitsbereich</p>} />
        </Routes>
      </MemoryRouter>,
    );
  const back = () => screen.getByRole('button', { name: /^(Zurück|Back)$/ });

  // "Gruppen bilden" is also a button of the projection's bar.
  it('returns to the projection it was opened from', () => {
    renderAt(['/generator', '/present', '/gruppen']);

    fireEvent.click(back());

    expect(screen.getByText('Projektion')).toBeInTheDocument();
  });

  it('goes to the workspace when it was opened straight from a link', () => {
    renderAt(['/gruppen']);

    fireEvent.click(back());

    expect(screen.getByText('Arbeitsbereich')).toBeInTheDocument();
  });
});
