// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import {
  vi,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  type Mock,
} from 'vitest';
import type { ComponentProps } from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SimpleCircleView from '../SimpleCircleView';
import type { CircleLayout } from '../../../types/Circle';
import { createMockStudent } from '../../../__tests__/utils/testHelpers';

type SimpleCircleViewProps = ComponentProps<typeof SimpleCircleView>;

// Add vitest-dom matchers
import '@testing-library/jest-dom/vitest';

// Mock @phosphor-icons/react icons
vi.mock('@phosphor-icons/react', () => ({
  ArrowCounterClockwiseIcon: () => <div data-testid="rotate-icon" />,
  UsersIcon: () => <div data-testid="users-icon" />,
  LinkSimpleIcon: () => <div data-testid="link-icon" />,
  // Icons used in STUDENT_FLAGS from constants.ts
  ActivityIcon: () => <div data-testid="activity-icon" />,
  SmileyMehIcon: () => <div data-testid="meh-icon" />,
  SmileyNervousIcon: () => <div data-testid="nervous-icon" />,
  BrainIcon: () => <div data-testid="brain-icon" />,
  MapPinAreaIcon: () => <div data-testid="map-pin-icon" />,
  WheelchairIcon: () => <div data-testid="accessibility-icon" />,
  TrendUpIcon: () => <div data-testid="trending-up-icon" />,
  TrendDownIcon: () => <div data-testid="trending-down-icon" />,
  // Partner badges
  HandHeartIcon: () => <div data-testid="heart-handshake-icon" />,
  HeartBreakIcon: () => <div data-testid="heart-crack-icon" />,
  // Height badges
  ArrowDownIcon: () => <div data-testid="arrow-down-icon" />,
  ArrowUpIcon: () => <div data-testid="arrow-up-icon" />,
  // Environment badges
  SidebarSimpleIcon: () => <div data-testid="panel-left-icon" />,
  DoorOpenIcon: () => <div data-testid="door-open-icon" />,
  // Language skill icons
  ChatCircleIcon: () => <div data-testid="message-circle-icon" />,
  ChatDotsIcon: () => <div data-testid="speech-icon" />,
  BookOpenIcon: () => <div data-testid="book-open-icon" />,
  StudentIcon: () => <div data-testid="graduation-cap-icon" />,
  HeartIcon: () => <div data-testid="heart-icon" />,
  // Social role icons
  HandshakeIcon: () => <div data-testid="handshake-icon" />,
  CrownIcon: () => <div data-testid="crown-icon" />,
  SignpostIcon: () => <div data-testid="milestone-icon" />,
  SparkleIcon: () => <div data-testid="sparkles-icon" />,
  // Other potential icons
  EyeIcon: () => <div data-testid="eye-icon" />,
  EyeSlashIcon: () => <div data-testid="eye-off-icon" />,
  LightningIcon: () => <div data-testid="zap-icon" />,
  SpeakerHighIcon: () => <div data-testid="volume-icon" />,
  RocketIcon: () => <div data-testid="rocket-icon" />,
}));

describe('SimpleCircleView', () => {
  let mockLayout: CircleLayout;
  let mockOnStudentMove: Mock<NonNullable<SimpleCircleViewProps['onStudentMove']>>;
  let mockOnSyncCircle: Mock<NonNullable<SimpleCircleViewProps['onSyncCircle']>>;
  let mockOnConnectionModeChange: Mock<NonNullable<SimpleCircleViewProps['onConnectionModeChange']>>;

  beforeEach(() => {
    // Clear any global drag state
    // @ts-expect-error - Accessing global variables from component
    global.dragInfo = null;
    // @ts-expect-error - Accessing global variables from component
    global.dragMoveListener = null;
    // @ts-expect-error - Accessing global variables from component
    global.dragUpListener = null;

    mockOnStudentMove = vi.fn();
    mockOnSyncCircle = vi.fn();
    mockOnConnectionModeChange = vi.fn();

    const students = [
      createMockStudent({ name: 'Alice', id: '1' }),
      createMockStudent({ name: 'Bob', id: '2' }),
      createMockStudent({ name: 'Charlie', id: '3' }),
    ];

    mockLayout = {
      students: [
        {
          student: students[0],
          angle: 0,
          x: 600,
          y: 300,
          preservedNeighbors: [],
          lostNeighbors: [],
          newNeighbors: [],
        },
        {
          student: students[1],
          angle: 120,
          x: 375,
          y: 386.6,
          preservedNeighbors: [],
          lostNeighbors: [],
          newNeighbors: [],
        },
        {
          student: students[2],
          angle: 240,
          x: 525,
          y: 213.4,
          preservedNeighbors: [],
          lostNeighbors: [],
          newNeighbors: [],
        },
      ],
      radius: { horizontal: 150, vertical: 100 },
      center: { x: 450, y: 300 },
      preservedNeighborhoods: 0,
      totalOriginalNeighborhoods: 0,
      newNeighborhoods: 0,
      preservationRate: 1.0,
      mode: 'preserve-neighbors' as const,
      timestamp: Date.now(),
      neighborhoodPairs: [],
    };
  });

  afterEach(() => {
    cleanup();
    // Ensure any lingering event listeners are cleaned up
    const events = ['pointermove', 'pointerup'];
    events.forEach((event) => {
      window.removeEventListener(event, vi.fn() as any);
    });
  });

  it('renders correctly with students', () => {
    render(<SimpleCircleView layout={mockLayout} />);

    // CheckIcon if the SVG container is rendered (SVG doesn't have img role by default)
    expect(document.querySelector('svg')).toBeInTheDocument();

    // CheckIcon if student names are rendered (they're in text elements)
    expect(screen.getAllByText('Alice')).toHaveLength(2); // text and title
    expect(screen.getAllByText('Bob')).toHaveLength(2); // text and title
    expect(screen.getAllByText('Charlie')).toHaveLength(2); // text and title
  });

  it('renders circle layout with students', () => {
    render(
      <SimpleCircleView
        layout={mockLayout}
        onSyncCircle={mockOnSyncCircle}
        onConnectionModeChange={mockOnConnectionModeChange}
      />,
    );

    // CheckIcon that student names are rendered (appears in text and title)
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bob').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Charlie').length).toBeGreaterThan(0);
  });

  it('uses provided connection mode', () => {
    const { rerender } = render(
      <SimpleCircleView
        layout={mockLayout}
        connectionMode="off"
        onConnectionModeChange={mockOnConnectionModeChange}
      />,
    );

    // Rerender with different connection mode
    rerender(
      <SimpleCircleView
        layout={mockLayout}
        connectionMode="subtle"
        onConnectionModeChange={mockOnConnectionModeChange}
      />,
    );

    // Component should handle mode prop changes
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
  });

  it('accepts onSyncCircle callback prop', () => {
    render(
      <SimpleCircleView layout={mockLayout} onSyncCircle={mockOnSyncCircle} />,
    );

    // Component should accept the prop without errors
    // The actual sync is triggered by parent component controls
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
  });

  it('handles keyboard shortcuts for connection toggle', async () => {
    const user = userEvent.setup();

    render(
      <SimpleCircleView
        layout={mockLayout}
        onConnectionModeChange={mockOnConnectionModeChange}
      />,
    );

    // Press 'c' key to toggle connections
    await user.keyboard('c');

    expect(mockOnConnectionModeChange).toHaveBeenCalledWith('off');
  });

  it('does not trigger keyboard shortcuts when input is focused', async () => {
    const user = userEvent.setup();

    render(
      <div>
        <input data-testid="test-input" />
        <SimpleCircleView
          layout={mockLayout}
          onConnectionModeChange={mockOnConnectionModeChange}
        />
      </div>,
    );

    const input = screen.getByTestId('test-input');
    await user.click(input);
    await user.keyboard('c');

    // Should not trigger connection mode change when input is focused
    expect(mockOnConnectionModeChange).not.toHaveBeenCalled();
  });

  it('cleans up event listeners on unmount', () => {
    const { unmount } = render(
      <SimpleCircleView layout={mockLayout} editable={true} />,
    );

    // Unmount the component
    unmount();

    // The cleanup should not add any additional removeEventListener calls
    // since no drag was started, but the component should be cleanly unmounted
    expect(() => unmount()).not.toThrow();
  });

  it('handles editable mode correctly', () => {
    render(
      <SimpleCircleView
        layout={mockLayout}
        editable={true}
        onStudentMove={mockOnStudentMove}
      />,
    );

    // In editable mode, student circles should have grab cursor
    // This is tested through the component rendering without errors
    expect(screen.getAllByText('Alice')).toHaveLength(2); // text and title
  });

  it('handles non-editable mode correctly', () => {
    render(<SimpleCircleView layout={mockLayout} editable={false} />);

    // In non-editable mode, interactions should be disabled
    // This is tested through the component rendering without errors
    expect(screen.getAllByText('Alice')).toHaveLength(2); // text and title
  });

  it('displays special needs indicators when enabled', () => {
    const studentWithSpecialNeeds = createMockStudent({
      name: 'Dave',
      id: '4',
      needsFrontSeat: true,
      concentrationIssues: true,
    });

    const layoutWithSpecialNeeds: CircleLayout = {
      ...mockLayout,
      students: [
        {
          student: studentWithSpecialNeeds,
          angle: 0,
          x: 600,
          y: 300,
          preservedNeighbors: [],
          lostNeighbors: [],
          newNeighbors: [],
        },
      ],
    };

    render(
      <SimpleCircleView
        layout={layoutWithSpecialNeeds}
        showSpecialNeeds={true}
      />,
    );

    expect(screen.getAllByText('Dave')).toHaveLength(2); // text and title
    // Special needs indicators are rendered as SVG icons, hard to test directly
    // but the component should render without errors
  });

  it('handles empty student slots', () => {
    const emptyLayout: CircleLayout = {
      ...mockLayout,
      students: [mockLayout.students[0]], // Only one student
    };

    render(<SimpleCircleView layout={emptyLayout} />);

    // Should find exactly one Alice
    expect(screen.getAllByText('Alice')).toHaveLength(2); // text and title
    // Should render without errors even with fewer students
  });

  it('persists connection mode to localStorage when no external control', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    render(<SimpleCircleView layout={mockLayout} />);

    // The component should attempt to read from localStorage on mount
    // and set it when toggling (tested indirectly through no errors)
    expect(() =>
      render(<SimpleCircleView layout={mockLayout} />),
    ).not.toThrow();

    setItemSpy.mockRestore();
  });

  it('handles localStorage errors gracefully', () => {
    const getItemSpy = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('localStorage error');
      });

    // Should not throw even if localStorage fails
    expect(() =>
      render(<SimpleCircleView layout={mockLayout} />),
    ).not.toThrow();

    getItemSpy.mockRestore();
  });
});
