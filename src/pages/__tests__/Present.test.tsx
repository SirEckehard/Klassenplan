// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@/i18n'; // Initialize i18n for tests
import Present from '../Present';
import { setupLocalStorageMock } from '@/__tests__/utils';

const seatingState = vi.hoisted(() => ({
  current: {
    currentSeating: [] as unknown[],
    classroomScene: { tables: [] as unknown[], totalStudents: 0 },
    students: [] as unknown[],
    circleLayout: null as unknown,
    activeClass: { id: 'class-1', name: '5a' },
  },
}));

vi.mock('@/contexts/SeatingPlanContext', () => ({
  useSeatingPlanState: () => seatingState.current,
}));
vi.mock('@/hooks/circle/useEnsureCircleLayout', () => ({
  useEnsureCircleLayout: vi.fn(),
}));
vi.mock('@/components/scene/PresentationScene', () => ({
  default: () => <div data-testid="presentation-scene" />,
}));
vi.mock('@/components/circle/SimpleCircleView', () => ({
  default: () => <div data-testid="circle-view" />,
}));

const student = { id: 's1', name: 'Mara' };

function renderPresent(state?: { mode?: 'table' | 'circle' }) {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: '/present', state: state ?? null }]}
    >
      <Present />
    </MemoryRouter>,
  );
}

describe('Present', () => {
  beforeEach(() => {
    setupLocalStorageMock();
    seatingState.current = {
      currentSeating: [],
      classroomScene: { tables: [], totalStudents: 0 },
      students: [],
      circleLayout: null,
      activeClass: { id: 'class-1', name: '5a' },
    };
  });

  it('shows the empty state with a way back when there is no plan', () => {
    renderPresent();

    expect(
      screen.getByText(
        /Noch kein Sitzplan zum Präsentieren|No seating chart to present/i,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('presentation-scene')).not.toBeInTheDocument();
    // No zoom/photo controls without content
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    // The centered back button remains as the way back to the generator
    expect(
      screen.getByRole('button', { name: /^(Zurück|Back)$/i }),
    ).toBeInTheDocument();
  });

  it('renders the presentation scene and controls when a plan exists', () => {
    seatingState.current = {
      currentSeating: [[student]],
      classroomScene: {
        tables: [{ x: 0, y: 0, width: 10, height: 10, seatCount: 2 }],
        totalStudents: 1,
      },
      students: [student],
      circleLayout: null,
      activeClass: { id: 'class-1', name: '5a' },
    };

    renderPresent();

    expect(screen.getByTestId('presentation-scene')).toBeInTheDocument();
    // Logo link sits top-left; everything pressable is in the bar below.
    expect(screen.getByRole('link')).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /Präsentation beenden|End the presentation/i,
      }),
    ).toBeInTheDocument();
    // Size slider + reset control are always available with content
    expect(screen.getByRole('slider')).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /Ansicht zentrieren|Recentre and reset view/i,
      }),
    ).toBeInTheDocument();
    // Default perspective is "student": teacher-only toggles stay hidden
    expect(
      screen.queryByRole('button', { name: /Merkmale|Markers/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^(Fotos|Photos)$/i }),
    ).not.toBeInTheDocument();
  });

  it('switches to the teacher view and back from the bar', () => {
    seatingState.current = {
      currentSeating: [[student]],
      classroomScene: {
        tables: [{ x: 0, y: 0, width: 10, height: 10, seatCount: 2 }],
        totalStudents: 1,
      },
      students: [student],
      circleLayout: null,
      activeClass: { id: 'class-1', name: '5a' },
    };

    renderPresent();

    fireEvent.click(
      screen.getByRole('button', { name: /Lehreransicht|Teacher view/i }),
    );

    // The two teacher-only toggles appear with the view they belong to.
    expect(
      screen.getByRole('button', { name: /Merkmale|Markers/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^(Fotos|Photos)$/i }),
    ).toBeInTheDocument();
  });

  it('keeps the contrast mode between visits', () => {
    seatingState.current = {
      currentSeating: [[student]],
      classroomScene: {
        tables: [{ x: 0, y: 0, width: 10, height: 10, seatCount: 2 }],
        totalStudents: 1,
      },
      students: [student],
      circleLayout: null,
      activeClass: { id: 'class-1', name: '5a' },
    };

    const { unmount } = renderPresent();
    const contrastButton = () =>
      screen.getByRole('button', { name: /^(Kontrast|Contrast)$/i });

    expect(contrastButton()).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(contrastButton());
    expect(contrastButton()).toHaveAttribute('aria-pressed', 'true');

    unmount();
    renderPresent();
    expect(contrastButton()).toHaveAttribute('aria-pressed', 'true');
  });

  it('offers theme and language controls (the footer is hidden here)', () => {
    renderPresent();

    expect(
      screen.getByRole('button', { name: /Design wechseln|Toggle theme/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /^(Zu (English|Deutsch) wechseln|Switch to (English|Deutsch))$/i,
      }),
    ).toBeInTheDocument();
  });

  // The way back from the groups goes through the history; the teacher lands
  // in the view they left, not in the one the projection was opened with.
  it('comes back from "Gruppen bilden" in the view it was left in', () => {
    seatingState.current = {
      currentSeating: [[student]],
      classroomScene: {
        tables: [{ x: 0, y: 0, width: 10, height: 10, seatCount: 2 }],
        totalStudents: 1,
      },
      students: [student],
      circleLayout: null,
      activeClass: { id: 'class-1', name: '5a' },
    };
    function GroupsStandIn() {
      const navigate = useNavigate();
      return (
        <button type="button" onClick={() => navigate(-1)}>
          Zurück aus den Gruppen
        </button>
      );
    }
    render(
      <MemoryRouter
        initialEntries={[{ pathname: '/present', state: { mode: 'table' } }]}
      >
        <Routes>
          <Route path="/present" element={<Present />} />
          <Route path="/gruppen" element={<GroupsStandIn />} />
        </Routes>
      </MemoryRouter>,
    );
    const teacherView = () =>
      screen.getByRole('button', { name: /Lehreransicht|Teacher view/i });

    fireEvent.click(teacherView());
    fireEvent.click(
      screen.getByRole('button', { name: /Gruppen bilden|Build groups/i }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Zurück aus den Gruppen' }),
    );

    expect(teacherView()).toHaveAttribute('aria-pressed', 'true');
  });

  describe('in fullscreen', () => {
    const setFullscreen = (element: Element | null) =>
      act(() => {
        Object.defineProperty(document, 'fullscreenElement', {
          configurable: true,
          get: () => element,
        });
        document.dispatchEvent(new Event('fullscreenchange'));
      });

    afterEach(() => {
      setFullscreen(null);
    });

    // The room sees the plan alone; the teacher reaches for the bar when it
    // is needed.
    it('drops the strip and keeps the bar below the edge until reached for', () => {
      seatingState.current = {
        currentSeating: [[student]],
        classroomScene: {
          tables: [{ x: 0, y: 0, width: 10, height: 10, seatCount: 2 }],
          totalStudents: 1,
        },
        students: [student],
        circleLayout: null,
        activeClass: { id: 'class-1', name: '5a' },
      };
      renderPresent();
      const bar = () => screen.getByTestId('present-bar');
      expect(screen.getByText('5a')).toBeInTheDocument();
      expect(bar()).toHaveAttribute('data-visible', 'true');

      setFullscreen(document.body);

      expect(screen.queryByText('5a')).not.toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(bar()).toHaveAttribute('data-visible', 'false');

      act(() => {
        window.dispatchEvent(
          new MouseEvent('pointermove', { clientY: window.innerHeight - 10 }),
        );
      });
      expect(bar()).toHaveAttribute('data-visible', 'true');

      setFullscreen(null);
      expect(screen.getByText('5a')).toBeInTheDocument();
    });
  });

  it('starts in circle mode when navigated with state.mode = circle', () => {
    seatingState.current = {
      currentSeating: [[student]],
      classroomScene: {
        tables: [{ x: 0, y: 0, width: 10, height: 10, seatCount: 2 }],
        totalStudents: 1,
      },
      students: [student],
      circleLayout: {
        students: [{ student, angle: 0, x: 0, y: 0 }],
        neighborhoodPairs: [],
        mode: 'preserve-neighbors',
        timestamp: 1,
      },
      activeClass: { id: 'class-1', name: '5a' },
    };

    renderPresent({ mode: 'circle' });

    expect(screen.getByTestId('circle-view')).toBeInTheDocument();
    expect(screen.queryByTestId('presentation-scene')).not.toBeInTheDocument();
  });
});
