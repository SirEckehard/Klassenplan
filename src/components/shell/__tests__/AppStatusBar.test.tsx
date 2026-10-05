// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import '@/i18n';
import AppStatusBar from '@/components/shell/AppStatusBar';
import StatusBarPortal from '@/components/shell/StatusBarPortal';
import { StatusBarSlotProvider } from '@/contexts/StatusBarSlotContext';
import { ToolRailProvider } from '@/contexts/ToolRailContext';
import {
  createMockStudent,
  createMockClassroomScene,
  getButton,
} from '@/__tests__/utils';
import type { ClassroomScene, SeatingArrangement, Student } from '@/types';
import type { CircleLayout } from '@/types/Circle';

const mocks = vi.hoisted(() => ({
  state: {
    step: 1,
    students: [] as Student[],
    classroomScene: { tables: [], features: [] } as unknown as ClassroomScene,
    currentSeating: [] as SeatingArrangement,
    seatingMode: 'table' as 'table' | 'circle',
    circleLayout: null as CircleLayout | null,
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

// The exits save and navigate; `PlanExits` and `usePlanExits` have tests of
// their own, here only where they sit matters.
vi.mock('@/hooks/plan/usePlanExits', () => ({
  usePlanExits: () => ({
    exportPlan: vi.fn(),
    presentPlan: vi.fn(),
    canExit: true,
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
    seatingMode: 'table',
    circleLayout: null,
  });
});

/** A circle holding `students`, in that order. */
const circleOf = (students: Student[]): CircleLayout =>
  ({
    students: students.map((student, index) => ({
      student,
      angle: index,
      x: 0,
      y: 0,
    })),
  }) as unknown as CircleLayout;

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
    // It reads "Weiter" on every layer; the name says where it leads.
    expect(proceed()).toHaveTextContent(/^(Weiter|Next)$/);
    expect(proceed()).toHaveAccessibleName(/Weiter zum Raum|to the room/i);
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

    expect(back()).toHaveAccessibleName(/Zurück zur Klasse|Back to Class/i);
    await userEvent.click(back());
    expect(mocks.handleStepChange).toHaveBeenLastCalledWith(1);
    unmount();

    setState({ step: 3 });
    render(<AppStatusBar />);

    expect(back()).toHaveAccessibleName(/Zurück zum Raum|Back to Room/i);
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

  // The plan says whether it is there and its criteria have their figures in
  // the inspector, so the line has nothing left to state on the plan layer.
  it('states nothing about the table plan and offers no way on', () => {
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

    expect(status()).not.toHaveTextContent(/Plätzen|seats|Platz|seat/i);
    expect(screen.queryByTitle(/ohne Platz|without a seat/i)).toBeNull();
    expect(
      screen.queryByRole('button', { name: /Weiter|Next|Proceed/i }),
    ).not.toBeInTheDocument();
  });

  it('states nothing about the circle either', () => {
    const students = named(4);
    setState({
      step: 3,
      students,
      seatingMode: 'circle',
      circleLayout: circleOf(students.slice(0, 3)),
    });
    render(<AppStatusBar />);

    expect(status()).not.toHaveTextContent(/Kreis|circle/i);
    expect(screen.queryByTitle(/Kreis|circle/i)).toBeNull();
  });

  // The plan layer is the last one: its way on leads out of the workspace.
  it('offers the exits where the other layers go on', () => {
    setState({ step: 3, students: named(2) });
    render(<AppStatusBar />);

    const exportButton = getButton(/^(Exportieren|Export)$/i);
    const presentButton = getButton(/^(Präsentieren|Present)$/i);
    // Beside the way back, at the end of the bar.
    expect(back().compareDocumentPosition(presentButton)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(presentButton.compareDocumentPosition(exportButton)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('keeps the exits to the plan layer', () => {
    setState({
      step: 2,
      students: named(4),
      classroomScene: createMockClassroomScene(2),
    });
    render(<AppStatusBar />);

    expect(
      screen.queryByRole('button', { name: /^(Exportieren|Export)$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^(Präsentieren|Present)$/i }),
    ).not.toBeInTheDocument();
  });

  // What the layer does to the stage sits with what takes it back.
  it('puts the layer’s own action beside undo/redo, not at the end', () => {
    setState({ step: 3, students: named(2) });
    render(
      <StatusBarSlotProvider>
        <AppStatusBar />
        <StatusBarPortal slot="action">
          <button type="button">Mischen</button>
        </StatusBarPortal>
      </StatusBarSlotProvider>,
    );

    const mix = getButton('Mischen');
    expect(status()).toContainElement(mix);
    expect(mix.compareDocumentPosition(getButton(/rückgängig|undo/i))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(mix.compareDocumentPosition(back())).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  // The plan layer's fulfilment stands where the other layers state their
  // numbers: at the left end, before undo/redo and the way back.
  it('states what a view puts at its left end before the middle', () => {
    setState({ step: 3, students: named(2) });
    render(
      <StatusBarSlotProvider>
        <AppStatusBar />
        <StatusBarPortal slot="status">
          <button type="button">Erfüllung 55 %</button>
        </StatusBarPortal>
      </StatusBarSlotProvider>,
    );

    const fulfilment = getButton('Erfüllung 55 %');
    expect(status()).toContainElement(fulfilment);
    expect(
      fulfilment.compareDocumentPosition(getButton(/rückgängig|undo/i)),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  // The class list's jump to its ends stands over the stage but belongs to
  // the bar: measured from the window's edge, it slid into the bar on an
  // iPhone.
  it('hangs a floating control above the bar, inside it', () => {
    setState({ step: 1, students: named(2) });
    render(
      <StatusBarSlotProvider>
        <AppStatusBar />
        <StatusBarPortal slot="float">
          <button type="button">Zum Listenanfang</button>
        </StatusBarPortal>
      </StatusBarSlotProvider>,
    );

    const jump = getButton('Zum Listenanfang');
    expect(status()).toContainElement(jump);
    expect(jump.parentElement).toHaveClass('absolute', 'bottom-full');
  });

  it('notes being offline beside the switches', () => {
    setState({ step: 1, students: named(2) });
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    try {
      render(<AppStatusBar />);
      expect(within(status()).getByRole('status')).toHaveTextContent(
        /Offline/i,
      );
      expect(status().querySelector('[title="Offline"]')).not.toBeNull();
    } finally {
      Object.defineProperty(window.navigator, 'onLine', {
        configurable: true,
        value: true,
      });
    }
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

  it('opens the toolbar as a drawer on a phone', async () => {
    const width = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 390,
    });
    setState({ step: 1, students: named(4) });
    try {
      render(
        <ToolRailProvider>
          <AppStatusBar />
        </ToolRailProvider>,
      );

      const toggle = getButton(/^(Werkzeugleiste|Toolbar)$/i);
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(toggle).toHaveAttribute('aria-controls', 'shell-tool-rail');
      expect(
        screen.queryByRole('button', { name: /erweitern|Expand/i }),
      ).not.toBeInTheDocument();

      await userEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');

      // The same switch closes it again.
      await userEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        writable: true,
        value: width,
      });
    }
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
