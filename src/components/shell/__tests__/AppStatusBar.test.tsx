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
  exits: {
    exportPlan: vi.fn(),
    presentPlan: vi.fn(),
    canExit: false,
  },
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

// The exits save and navigate; what they do is `usePlanExits`' business, where
// they sit and when they hold back is this bar's.
vi.mock('@/hooks/plan/usePlanExits', () => ({
  usePlanExits: () => mocks.exits,
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
  mocks.exits.canExit = false;
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

describe('AppStatusBar', () => {
  it('counts the class and offers the way on to the room', () => {
    setState({ students: named(3) });
    render(<AppStatusBar />);

    expect(status()).toHaveTextContent(/3 Schüler|3 students/i);
    expect(status()).toHaveTextContent(/alle Namen gesetzt|all names set/i);
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

    expect(status()).toHaveTextContent(/2 Namen fehlen|2 names missing/i);

    const button = proceed();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent(/fehlenden Namen|missing names/i);
    expect(button).toHaveAttribute('aria-describedby', tooltip.id);
  });

  it('stays quiet about an action while the class is empty', () => {
    render(<AppStatusBar />);

    expect(status()).toHaveTextContent(/Noch keine Schüler|No students yet/i);
    // Undo/redo are always there; what an empty class has no use for is the
    // way on to the room.
    expect(
      screen.queryByRole('button', { name: /Weiter|Next|Proceed/i }),
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
      screen.queryByRole('button', { name: /Weiter|Next|Proceed/i }),
    ).not.toBeInTheDocument();
  });

  it('offers exporting and presenting on every layer, as two quiet buttons', async () => {
    mocks.exits.canExit = true;
    setState({ step: 1, students: named(2) });
    render(<AppStatusBar />);

    const exportButton = getButton(/^(Exportieren|Export)$/i);
    const presentButton = getButton(/^(Präsentieren|Present)$/i);
    // Blue is the layer's own action; the exits are never it.
    expect(exportButton).toHaveClass('secondary-button');
    expect(presentButton.className).toBe(exportButton.className);

    await userEvent.click(exportButton);
    await userEvent.click(presentButton);
    expect(mocks.exits.exportPlan).toHaveBeenCalledTimes(1);
    expect(mocks.exits.presentPlan).toHaveBeenCalledTimes(1);
  });

  it('keeps the exits clickable without a plan but does not leave', async () => {
    setState({ step: 1, students: named(2) });
    render(<AppStatusBar />);

    const presentButton = getButton(/^(Präsentieren|Present)$/i);
    expect(presentButton).toHaveAttribute('aria-disabled', 'true');

    await userEvent.click(presentButton);
    expect(mocks.exits.presentPlan).not.toHaveBeenCalled();
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

    const toggle = getButton('Sidebar erweitern');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(toggle);

    expect(getButton('Sidebar minimieren')).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('leaves the switch out where there is no shell to switch', () => {
    setState({ step: 1, students: named(4) });
    render(<AppStatusBar />);

    expect(
      screen.queryByRole('button', { name: /Sidebar/i }),
    ).not.toBeInTheDocument();
  });
});
