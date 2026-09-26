// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import '@/i18n';
import AppStatusBar from '@/components/shell/AppStatusBar';
import { ToolRailProvider } from '@/contexts/ToolRailContext';
import {
  createMockStudent,
  createMockClassroomScene,
  getButton,
} from '@/__tests__/utils';
import type { ClassroomScene, SeatingArrangement, Student } from '@/types';

const mocks = vi.hoisted(() => ({
  state: {
    step: 1,
    students: [] as Student[],
    classroomScene: { tables: [], features: [] } as unknown as ClassroomScene,
    currentSeating: [] as SeatingArrangement,
  },
  handleStepChange: vi.fn(),
}));

vi.mock('@/contexts/SeatingPlanContext', () => ({
  useSeatingPlanState: () => mocks.state,
  useSeatingPlanActions: () => ({ handleStepChange: mocks.handleStepChange }),
  useSeatingAlgorithmContext: () => ({
    undoSeating: vi.fn(),
    redoSeating: vi.fn(),
    canUndoSeating: false,
    canRedoSeating: false,
  }),
}));

vi.mock('@/contexts/seatingPlan/StudentManagementContext', () => ({
  useStudentManagementContext: () => ({
    undoStudents: vi.fn(),
    redoStudents: vi.fn(),
    canUndoStudents: false,
    canRedoStudents: false,
  }),
}));

const named = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    createMockStudent({ id: `s${i}`, name: `Name ${i}` }),
  );

const setState = (next: Partial<typeof mocks.state>) => {
  Object.assign(mocks.state, next);
};

beforeEach(() => {
  setState({
    step: 1,
    students: [],
    classroomScene: createMockClassroomScene(0),
    currentSeating: [],
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const status = () =>
  screen.getByRole('region', { name: /Statusleiste|Status bar/i });
const proceed = () => getButton(/Weiter|Next|Proceed/i);
const back = () => getButton(/^(Zurück|Back) /i);

describe('AppStatusBar', () => {
  it('counts the class, checks it off and offers the way on to the room', () => {
    setState({ students: named(3) });
    render(<AppStatusBar />);

    expect(status()).toHaveTextContent(/3 Schüler|3 students/i);
    // The check says it; the words are for the tooltip and the screen reader.
    expect(screen.getByText(/Alle Namen gesetzt|All names set/i)).toHaveClass(
      'sr-only',
    );
    expect(
      screen.getByTitle(/Alle Namen gesetzt|All names set/i),
    ).toBeInTheDocument();
    expect(proceed()).not.toHaveAttribute('aria-disabled');
  });

  it('explains at the button why an unnamed class blocks the way on', () => {
    setState({
      students: [
        createMockStudent({ id: '1', name: '' }),
        createMockStudent({ id: '2', name: '' }),
        createMockStudent({ id: '3', name: 'Alex' }),
      ],
    });
    render(<AppStatusBar />);

    expect(screen.getByText(/2 Namen fehlen|2 names missing/i)).toHaveClass(
      'sr-only',
    );
    expect(
      screen.getByTitle(/2 Namen fehlen|2 names missing/i),
    ).toBeInTheDocument();

    const button = proceed();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent(/fehlenden Namen|missing names/i);
    expect(button).toHaveAttribute('aria-describedby', tooltip.id);
  });

  it('stays quiet about an action while the class is empty', () => {
    render(<AppStatusBar />);

    expect(status()).toHaveTextContent(/Noch keine Schüler|No students yet/i);
    // Nothing to judge yet, so no check and no cross.
    expect(screen.queryByTitle(/Namen|names/i)).not.toBeInTheDocument();
    // Undo/redo are always there; what an empty class has no use for is the
    // way on to the room — and the first layer has no way back.
    expect(getButton(/rückgängig|undo/i)).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: /Weiter|Next|Proceed/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^(Zurück|Back) /i }),
    ).not.toBeInTheDocument();
  });

  it('weighs seats against students on the room layer', () => {
    // 2 double tables = 4 seats, 4 students -> an exact fit.
    setState({
      step: 2,
      students: named(4),
      classroomScene: createMockClassroomScene(2),
    });
    render(<AppStatusBar />);

    expect(status()).toHaveTextContent(
      /4 Plätze für 4 Schüler|4 seats for 4 students/i,
    );
    // What anyone reads off the numbers is an icon, not a third segment: the
    // table count and the words stay out of sight.
    expect(status()).not.toHaveTextContent(/2 Tische|2 tables/i);
    expect(screen.getByText(/passt genau|an exact fit/i)).toHaveClass(
      'sr-only',
    );
    expect(screen.getByTitle(/passt genau|an exact fit/i)).toBeInTheDocument();
    expect(proceed()).not.toHaveAttribute('aria-disabled');
  });

  it('leads back one layer at a time', async () => {
    setState({
      step: 2,
      students: named(4),
      classroomScene: createMockClassroomScene(2),
    });
    const { unmount } = render(<AppStatusBar />);

    expect(back()).toHaveAccessibleName(/Klassenliste|Class List/i);
    await userEvent.click(back());
    expect(mocks.handleStepChange).toHaveBeenLastCalledWith(1);
    unmount();

    setState({ step: 3 });
    render(<AppStatusBar />);

    expect(back()).toHaveAccessibleName(/Klassenraum|Classroom/i);
    await userEvent.click(back());
    expect(mocks.handleStepChange).toHaveBeenLastCalledWith(2);
  });

  it('blocks the way to the plan while seats are missing', () => {
    setState({
      step: 2,
      students: named(12),
      classroomScene: createMockClassroomScene(2), // 4 seats
    });
    render(<AppStatusBar />);

    expect(status()).toHaveTextContent(
      /4 Plätze für 12 Schüler|4 seats for 12 students/i,
    );
    expect(screen.getByTitle(/8 Plätze fehlen|8 seats short/i)).toBeVisible();

    const button = proceed();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent(
      /8 Sitzplätze für 12 Schüler|8 seats.*for 12 students/i,
    );
    expect(button).toHaveAttribute('aria-describedby', tooltip.id);
  });

  it('reports how full the plan is and offers no action of its own yet', () => {
    const students = named(3);
    setState({
      step: 3,
      students,
      classroomScene: createMockClassroomScene(2), // 4 seats
      currentSeating: [
        [students[0], students[1]],
        [students[2], null],
      ],
    });
    render(<AppStatusBar />);

    expect(status()).toHaveTextContent(
      /3 von 4 Plätzen besetzt|3 of 4 seats taken/i,
    );
    expect(
      screen.getByTitle(
        /Alle Schüler haben einen Platz|Every student has a seat/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Weiter|Next|Proceed/i }),
    ).not.toBeInTheDocument();
  });

  it('crosses the plan off while students are left without a seat', () => {
    const students = named(5);
    setState({
      step: 3,
      students,
      classroomScene: createMockClassroomScene(2), // 4 seats
      currentSeating: [
        [students[0], students[1]],
        [students[2], null],
      ],
    });
    render(<AppStatusBar />);

    expect(
      screen.getByTitle(/2 Schüler ohne Platz|2 students without a seat/i),
    ).toBeInTheDocument();
  });

  // Exporting and presenting leave the workspace; they sit in the header.
  it('leaves the exits to the header', () => {
    setState({ step: 3, students: named(2) });
    render(<AppStatusBar />);

    expect(
      screen.queryByRole('button', { name: /^(Exportieren|Export)$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^(Präsentieren|Present)$/i }),
    ).not.toBeInTheDocument();
  });

  // The settings hang in the header beside Help; the bar keeps to where the
  // layer stands and what it does.
  it('leaves the settings to the header', () => {
    setState({ step: 1, students: named(2) });
    render(<AppStatusBar />);

    expect(
      screen.queryByRole('button', { name: /^(Einstellungen|Settings)$/i }),
    ).not.toBeInTheDocument();
  });

  it('carries the toolbar switch, which the toolbar itself no longer has', async () => {
    setState({ step: 1, students: named(4) });
    render(
      <ToolRailProvider>
        <AppStatusBar />
      </ToolRailProvider>,
    );

    const toggle = getButton('Werkzeugleiste erweitern');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(toggle);

    expect(getButton('Werkzeugleiste minimieren')).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('leaves the switch out where there is no shell to switch', () => {
    setState({ step: 1, students: named(4) });
    render(<AppStatusBar />);

    expect(
      screen.queryByRole('button', {
        name: /Werkzeugleiste|toolbar/i,
      }),
    ).not.toBeInTheDocument();
  });
});
