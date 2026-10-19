// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { screen, act, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@/i18n/i18n';
import SeatingPlanView, {
  type Props as SeatingPlanViewProps,
} from '../SeatingPlanView';
import type { ClassroomScene, SeatingArrangement } from '@/types';
import { DEFAULT_MIX_WEIGHTS, canvasFitClass } from '@/utils';
import {
  getButton,
  renderWithProvidersAndRouter,
  createMockSeatingPlanViewProps,
  createMockClassroomScene,
  createMockStudent,
  setupCleanStorage,
  neutralSettings,
} from '../../../__tests__/utils';
import {
  StatusBarSlotProvider,
  useStatusBarSlot,
} from '@/contexts/StatusBarSlotContext';
import { InspectorProvider, useInspector } from '@/contexts/InspectorContext';

/**
 * "Mischen" is the plan layer's primary action and so lives in the shell's
 * status bar, beside undo/redo; the view fills that slot through a portal.
 * This stands in for the shell so the button can be asserted on.
 */
function WithStatusBar({ children }: { children: React.ReactNode }) {
  return (
    <StatusBarSlotProvider>
      <StatusBarSlot />
      {children}
    </StatusBarSlotProvider>
  );
}

function StatusBarSlot() {
  const { setActionNode, setStatusNode } = useStatusBarSlot();
  return (
    <>
      <div ref={setStatusNode} data-testid="status-slot" />
      <div ref={setActionNode} />
    </>
  );
}

/** Stands in for the shell's inspector column, which the plan portals into. */
function WithInspector({ children }: { children: React.ReactNode }) {
  return (
    <InspectorProvider>
      <InspectorSlot />
      {children}
    </InspectorProvider>
  );
}

function InspectorSlot() {
  const { setSlotNode } = useInspector();
  return <div ref={setSlotNode} />;
}

describe('SeatingPlanView', () => {
  beforeEach(() => {
    setupCleanStorage();
  });

  it('leaves the room canvas width to the stage fit rule', async () => {
    await act(async () => {
      renderWithProvidersAndRouter(
        <SeatingPlanView {...createMockSeatingPlanViewProps()} />,
      );
    });
    const canvas = screen.getByTestId('classroom-canvas');
    // `canvas-fit` gives the frame the stage's width below `lg` and caps it by
    // the stage's height from `lg` up; an inline width would override the cap
    // and cut the room's bottom edge off.
    expect(canvas).toHaveClass(canvasFitClass);
    expect(canvas.style.width).toBe('');
  });

  it('renders mix controls sidebar with neutral settings', async () => {
    await act(async () => {
      renderWithProvidersAndRouter(
        <SeatingPlanView
          {...createMockSeatingPlanViewProps({
            step: 3,
            settings: neutralSettings,
          })}
        />,
      );
    });
    // SmartMixControls is in a collapsed sidebar, so check for the sidebar presence
    const sidebar = screen.getByLabelText(/^(Werkzeugleiste|Toolbar)$/i);
    expect(sidebar).toBeInTheDocument();
    expect(sidebar).toHaveAttribute('data-expanded', 'false');
  });

  it('clears the weights of criteria without data while the sidebar is collapsed', async () => {
    const setMixSettings = vi.fn<SeatingPlanViewProps['setMixSettings']>();
    await act(async () => {
      renderWithProvidersAndRouter(
        <SeatingPlanView
          {...createMockSeatingPlanViewProps({
            step: 3,
            settings: DEFAULT_MIX_WEIGHTS,
            setMixSettings,
          })}
        />,
      );
    });

    expect(screen.getByRole('complementary')).toHaveAttribute(
      'data-expanded',
      'false',
    );
    const updates = setMixSettings.mock.calls.map(([update]) =>
      typeof update === 'function' ? update(DEFAULT_MIX_WEIGHTS) : update,
    );
    // The class has no students, so nothing but the history criterion stays.
    expect(updates).toContainEqual({
      ...neutralSettings,
      avoidPreviousPairs: DEFAULT_MIX_WEIGHTS.avoidPreviousPairs,
    });
  });

  it('settles when the settings setter returns a new object on every call', async () => {
    let setterCalls = 0;
    function StoreLikeView() {
      const [settings, setSettings] = React.useState(DEFAULT_MIX_WEIGHTS);
      const setMixSettings = React.useCallback<
        SeatingPlanViewProps['setMixSettings']
      >((update) => {
        setterCalls += 1;
        // Stops a loop instead of hanging the test run.
        if (setterCalls > 20) return;
        setSettings((prev) => ({
          ...(typeof update === 'function' ? update(prev) : update),
        }));
      }, []);

      return (
        <SeatingPlanView
          {...createMockSeatingPlanViewProps({
            step: 3,
            settings,
            setMixSettings,
          })}
        />
      );
    }

    await act(async () => {
      renderWithProvidersAndRouter(<StoreLikeView />);
    });

    // One update clears the weights the empty class has no data for; after
    // that there is nothing left to send.
    expect(setterCalls).toBe(1);
  });

  it('shows auto-mix progress indicators and disables mix button', async () => {
    await act(async () => {
      renderWithProvidersAndRouter(
        <WithStatusBar>
          <SeatingPlanView
            {...createMockSeatingPlanViewProps({
              step: 3,
              autoMixing: true,
            })}
          />
        </WithStatusBar>,
      );
    });
    expect(
      screen.getAllByText(
        /Automatisches Mischen läuft|Automatic mix in progress/i,
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole('button', { name: /^(Mischen|Mix)$/i }),
    ).toBeDisabled();
  });

  // Speech input says what it sees: "Erfüllung 85 %". The name is the
  // visible words; whether the values are on is the pressed state alone.
  // The status bar states the fulfilment; the inspector does not repeat it.
  it('leaves the fulfilment out of the inspector', async () => {
    await act(async () => {
      renderWithProvidersAndRouter(
        <WithInspector>
          <SeatingPlanView
            {...createMockSeatingPlanViewProps({
              step: 3,
              lastStatistics: [
                {
                  key: 'preferGenderMix',
                  label: 'Geschlechtermischung',
                  percentage: 85,
                  weight: 5,
                  active: true,
                },
              ],
              showStatisticsBadge: false,
              onOpenStatistics: vi.fn(),
              onCloseStatistics: vi.fn(),
            })}
          />
        </WithInspector>,
      );
    });

    expect(
      screen.queryByRole('switch', { name: /^(Erfüllung|Fulfilment)/ }),
    ).not.toBeInTheDocument();
  });

  it('switches the values per criterion from the status bar, both ways', async () => {
    const onOpenStatistics = vi.fn();
    const onCloseStatistics = vi.fn();
    const renderPlan = (showStatisticsBadge: boolean) =>
      renderWithProvidersAndRouter(
        <WithStatusBar>
          <SeatingPlanView
            {...createMockSeatingPlanViewProps({
              step: 3,
              lastStatistics: [
                {
                  key: 'preferGenderMix',
                  label: 'Geschlechtermischung',
                  percentage: 85,
                  weight: 5,
                  active: true,
                },
              ],
              showStatisticsBadge,
              onOpenStatistics,
              onCloseStatistics,
            })}
          />
        </WithStatusBar>,
      );
    const statusButton = () =>
      within(screen.getByTestId('status-slot')).getByRole('button', {
        name: /^(Erfüllung|Fulfilment)\s*85\s?%$/,
      });

    let view!: ReturnType<typeof renderPlan>;
    await act(async () => {
      view = renderPlan(false);
    });
    expect(statusButton()).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(statusButton());
    expect(onOpenStatistics).toHaveBeenCalledTimes(1);
    expect(onCloseStatistics).not.toHaveBeenCalled();

    view.unmount();
    await act(async () => {
      renderPlan(true);
    });
    expect(statusButton()).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(statusButton());
    expect(onCloseStatistics).toHaveBeenCalledTimes(1);
    expect(onOpenStatistics).toHaveBeenCalledTimes(1);
  });

  describe('mixes on its own only for a stale arrangement', () => {
    const students = [
      createMockStudent({ id: 's1', gender: 'boy' }),
      createMockStudent({ id: 's2', gender: 'girl' }),
    ];
    const oneTable = createMockClassroomScene(1);
    const twoTables = createMockClassroomScene(2);

    /** The view under a parent that swaps scene and seating as a load does. */
    const renderSwappable = () => {
      const generateSeatingPlan = vi.fn().mockResolvedValue(undefined);
      const swapRef: {
        current: (scene: ClassroomScene, seating: SeatingArrangement) => void;
      } = { current: () => undefined };
      function Harness() {
        const [state, setState] = React.useState({
          scene: oneTable,
          seating: [[students[0], students[1]]] as SeatingArrangement,
        });
        React.useEffect(() => {
          swapRef.current = (scene, seating) => setState({ scene, seating });
        }, []);
        return (
          <SeatingPlanView
            {...createMockSeatingPlanViewProps({
              step: 3,
              students,
              studentsCount: students.length,
              classroomScene: state.scene,
              currentSeating: state.seating,
              generateSeatingPlan,
            })}
          />
        );
      }
      return {
        generateSeatingPlan,
        renderIt: () => renderWithProvidersAndRouter(<Harness />),
        swap: (scene: ClassroomScene, seating: SeatingArrangement) =>
          swapRef.current(scene, seating),
      };
    };

    // Opening a saved plan brings its tables and its seating in one go; the
    // canvas takes the tables an effect later, which once read as a stale
    // arrangement and mixed the plan just opened.
    it('leaves a plan opened with other tables as it was saved', async () => {
      const { generateSeatingPlan, renderIt, swap } = renderSwappable();
      await act(async () => {
        renderIt();
      });

      await act(async () => {
        swap(twoTables, [
          [students[0], null],
          [students[1], null],
        ]);
      });

      expect(generateSeatingPlan).not.toHaveBeenCalled();
    });

    it('mixes when the tables change under an arrangement that no longer fits', async () => {
      const { generateSeatingPlan, renderIt, swap } = renderSwappable();
      await act(async () => {
        renderIt();
      });

      await act(async () => {
        swap(twoTables, [[students[0], students[1]]]);
      });

      expect(generateSeatingPlan).toHaveBeenCalledTimes(1);
    });

    // An unmount aborts a run in flight. Under React's StrictMode the mount
    // is tried twice: the simulated unmount aborted the first run, and the
    // second found the room already noted — the old arrangement stayed on
    // the new tables.
    it('mixes again when the automatic mix was aborted', async () => {
      const generateSeatingPlan = vi
        .fn()
        .mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'))
        .mockResolvedValue(undefined);

      await act(async () => {
        renderWithProvidersAndRouter(
          <SeatingPlanView
            {...createMockSeatingPlanViewProps({
              step: 3,
              students,
              studentsCount: students.length,
              classroomScene: twoTables,
              currentSeating: [[students[0], students[1]]],
              generateSeatingPlan,
            })}
          />,
        );
      });

      expect(generateSeatingPlan).toHaveBeenCalledTimes(2);
    });

    it('leaves a failed automatic mix to the toast and the button', async () => {
      const generateSeatingPlan = vi
        .fn()
        .mockRejectedValue(new Error('Worker exploded'));

      await act(async () => {
        renderWithProvidersAndRouter(
          <SeatingPlanView
            {...createMockSeatingPlanViewProps({
              step: 3,
              students,
              studentsCount: students.length,
              classroomScene: twoTables,
              currentSeating: [[students[0], students[1]]],
              generateSeatingPlan,
            })}
          />,
        );
      });

      expect(generateSeatingPlan).toHaveBeenCalledTimes(1);
    });

    // Where the plan layer cannot mix on its own — here a student without a
    // gender — the old arrangement is neither drawn nor scored.
    it('leaves the tables empty and says why when it cannot mix over a stale arrangement', async () => {
      const generateSeatingPlan = vi.fn().mockResolvedValue(undefined);
      const withoutGender = [
        students[0],
        createMockStudent({ id: 's3', gender: undefined }),
      ];

      await act(async () => {
        renderWithProvidersAndRouter(
          <WithStatusBar>
            <SeatingPlanView
              {...createMockSeatingPlanViewProps({
                step: 3,
                students: withoutGender,
                studentsCount: withoutGender.length,
                classroomScene: twoTables,
                currentSeating: [[withoutGender[0], withoutGender[1]]],
                generateSeatingPlan,
                lastStatistics: [
                  {
                    key: 'preferGenderMix',
                    label: 'Geschlechtermischung',
                    percentage: 85,
                    weight: 5,
                    active: true,
                  },
                ],
                onOpenStatistics: vi.fn(),
                onCloseStatistics: vi.fn(),
              })}
            />
          </WithStatusBar>,
        );
      });

      expect(generateSeatingPlan).not.toHaveBeenCalled();
      expect(
        screen.getByText(
          /Die Tische haben sich geändert|The tables have changed/,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('group', { name: /^(Sitzplan|Seating plan):/ }),
      ).toHaveAccessibleName(/0 (von|of) 4/);
      expect(
        within(screen.getByTestId('status-slot')).queryByRole('button', {
          name: /^(Erfüllung|Fulfilment)/,
        }),
      ).not.toBeInTheDocument();

      fireEvent.click(getButton(/Jetzt neu mischen|Mix again now/));
      await act(async () => {});
      expect(generateSeatingPlan).toHaveBeenCalledTimes(1);
    });
  });

  it('renders auto-mix error banner with retry button', async () => {
    await act(async () => {
      renderWithProvidersAndRouter(
        <SeatingPlanView
          {...createMockSeatingPlanViewProps({
            step: 3,
            autoMixError: 'Worker exploded',
          })}
        />,
      );
    });
    expect(
      screen.getByText(
        /Automatisches Mischen fehlgeschlagen|Automatic mix failed/i,
      ),
    ).toBeInTheDocument();
    const retryButton = screen.getByRole('button', {
      name: /Erneut mischen|Try again/i,
    });
    expect(retryButton).toBeInTheDocument();
    expect(retryButton).not.toBeDisabled();
  });
});
