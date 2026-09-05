// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
    // Logo link sits top-left, the back button moved into the bottom bar
    expect(screen.getByRole('link')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^(Zurück|Back)$/i }),
    ).toBeInTheDocument();
    // Zoom slider + reset control are always available with content
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
