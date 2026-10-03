// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import Inspector from '@/components/shell/Inspector';
import InspectorPortal from '@/components/shell/InspectorPortal';
import StatusBarFrame from '@/components/shell/StatusBarFrame';
import { InspectorProvider, useInspector } from '@/contexts/InspectorContext';
import { ToolRailProvider } from '@/contexts/ToolRailContext';
import { createMockStudent } from '@/__tests__/utils';
import type { Student } from '@/types';

const mocks = vi.hoisted(() => ({
  state: { step: 3, students: [] as Student[] },
}));

vi.mock('@/contexts/SeatingPlanContext', () => ({
  useSeatingPlanState: () => mocks.state,
  useSeatingPlanActions: () => ({
    updateStudent: vi.fn(),
    removeStudent: vi.fn(),
  }),
}));

const setWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
  });
  act(() => {
    window.dispatchEvent(new Event('resize'));
  });
};

/** A layer that fills the inspector the way the plan layer does. */
const renderLayer = () =>
  render(
    <ToolRailProvider>
      <InspectorProvider>
        <InspectorPortal label="Mischkriterien">
          <button type="button">Kriterium</button>
        </InspectorPortal>
        <Inspector />
        <StatusBarFrame
          start={<span>Status</span>}
          end={<button>Weiter</button>}
        />
      </InspectorProvider>
    </ToolRailProvider>,
  );

/** The inspector's switch, whichever way it points just now. */
const inspectorSwitch = () =>
  screen.getByRole('button', {
    name: /Inspektor ausblenden|Hide inspector|einblenden|Show /i,
  });

const Picker = () => {
  const { selectStudent } = useInspector();
  return (
    <button type="button" onClick={() => selectStudent('g')}>
      pick
    </button>
  );
};

beforeEach(() => {
  mocks.state.step = 3;
  mocks.state.students = [];
});

afterEach(() => {
  cleanup();
  setWidth(1024);
});

describe('Inspector below lg', () => {
  // An iPad in portrait used to open students into a column that stayed
  // hidden below `lg`.
  it('opens a picked student as a drawer on a tablet', () => {
    setWidth(820);
    mocks.state.step = 1;
    mocks.state.students = [createMockStudent({ id: 'g', name: 'Grace' })];
    render(
      <InspectorProvider>
        <Picker />
        <Inspector />
      </InspectorProvider>,
    );

    expect(
      screen.queryByRole('complementary', { name: /Merkmale|Attributes/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'pick' }));

    const drawer = screen.getByRole('complementary', {
      name: /Merkmale|Attributes/i,
    });
    expect(drawer).toHaveClass('fixed');
    expect(drawer).not.toHaveClass('hidden');
    expect(screen.getByRole('heading', { name: 'Grace' })).toBeInTheDocument();
  });

  // A tap beside the drawer puts the student away; a tap on another row
  // opens that one, since the row's click comes after the drawer closed.
  it('closes a tablet’s student drawer on a tap beside it', async () => {
    setWidth(820);
    mocks.state.step = 1;
    mocks.state.students = [createMockStudent({ id: 'g', name: 'Grace' })];
    render(
      <InspectorProvider>
        <Picker />
        <p>Liste</p>
        <Inspector />
      </InspectorProvider>,
    );
    const drawer = () =>
      screen.queryByRole('complementary', { name: /Merkmale|Attributes/i });

    await userEvent.click(screen.getByRole('button', { name: 'pick' }));
    await userEvent.click(screen.getByRole('heading', { name: 'Grace' }));
    expect(drawer()).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'pick' }));
    expect(drawer()).toBeInTheDocument();

    await userEvent.click(screen.getByText('Liste'));
    expect(drawer()).not.toBeInTheDocument();
  });

  it('closes a phone’s student sheet on a tap beside it', async () => {
    setWidth(390);
    mocks.state.step = 1;
    mocks.state.students = [createMockStudent({ id: 'g', name: 'Grace' })];
    render(
      <InspectorProvider>
        <Picker />
        <p>Liste</p>
        <Inspector />
      </InspectorProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'pick' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Liste'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes a phone’s student sheet on Escape', () => {
    setWidth(390);
    mocks.state.step = 1;
    mocks.state.students = [createMockStudent({ id: 'g', name: 'Grace' })];
    render(
      <InspectorProvider>
        <Picker />
        <Inspector />
      </InspectorProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'pick' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // The sheet is a dialog, so the class list leaves Escape to it.
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // The switch closes the bar on the right, the mirror of the toolbar's on
  // the left, beyond the way on.
  it('opens a layer’s panel from the status bar and closes it on Escape', () => {
    setWidth(820);
    renderLayer();

    const aside = screen.getByRole('complementary', {
      name: 'Mischkriterien',
      hidden: true,
    });
    const toggle = inspectorSwitch();
    expect(toggle).toHaveAccessibleName(
      /Mischkriterien einblenden|Show Mischkriterien/i,
    );
    expect(
      screen
        .getByRole('button', { name: 'Weiter' })
        .compareDocumentPosition(toggle),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(aside).toHaveClass('hidden');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    expect(aside).toHaveClass('fixed');
    expect(aside).not.toHaveClass('hidden');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAccessibleName(/Inspektor ausblenden|Hide inspector/i);
    expect(aside).toHaveFocus();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(aside).toHaveClass('hidden');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes a layer’s panel on a tap beside it, not on its switch', async () => {
    setWidth(820);
    renderLayer();
    const aside = screen.getByRole('complementary', {
      name: 'Mischkriterien',
      hidden: true,
    });
    const toggle = inspectorSwitch();

    await userEvent.click(toggle);
    expect(aside).toHaveClass('fixed');

    await userEvent.click(screen.getByRole('button', { name: 'Kriterium' }));
    expect(aside).toHaveClass('fixed');

    await userEvent.click(screen.getByText('Status'));
    expect(aside).toHaveClass('hidden');

    // The switch keeps its own tap: it opens the panel, not closes and
    // reopens it.
    await userEvent.click(toggle);
    await userEvent.click(toggle);
    expect(aside).toHaveClass('hidden');
  });

  it('lets the toolbar’s drawer and the inspector’s take turns on a phone', () => {
    setWidth(390);
    renderLayer();
    const criteria = inspectorSwitch();
    const toolbar = screen.getByRole('button', { name: 'Werkzeugleiste' });

    fireEvent.click(criteria);
    fireEvent.click(toolbar);
    expect(criteria).toHaveAttribute('aria-expanded', 'false');
    expect(toolbar).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(criteria);
    expect(criteria).toHaveAttribute('aria-expanded', 'true');
    expect(toolbar).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the panel again from the same switch', () => {
    setWidth(500);
    renderLayer();
    const toggle = inspectorSwitch();

    fireEvent.click(toggle);
    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('offers no switch below lg where a layer has no panel', () => {
    setWidth(820);
    mocks.state.step = 1;
    render(
      <InspectorProvider>
        <Inspector />
        <StatusBarFrame start={<span>Status</span>} />
      </InspectorProvider>,
    );

    expect(
      screen.queryByRole('button', {
        name: /einblenden|ausblenden|Show|Hide/i,
      }),
    ).not.toBeInTheDocument();
  });
});

describe('Inspector from lg up', () => {
  const FOLDED_KEY = 'spg.inspectorFolded';

  const pointerIs = (coarse: boolean) =>
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: (query: string) => ({
        matches: coarse && query === '(pointer: coarse)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });

  beforeEach(() => {
    localStorage.removeItem(FOLDED_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(FOLDED_KEY);
    Reflect.deleteProperty(window, 'matchMedia');
  });

  // On an iPad in landscape the toolbar and the 320px column left the plan
  // barely 500px; the stage gets the width when the column folds away.
  it('folds the column away from the status bar and brings it back', () => {
    setWidth(1280);
    renderLayer();
    const aside = screen.getByRole('complementary', {
      name: 'Mischkriterien',
      hidden: true,
    });
    const toggle = inspectorSwitch();
    expect(aside).toHaveClass('lg:flex');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAccessibleName(/Inspektor ausblenden|Hide inspector/i);

    fireEvent.click(toggle);
    expect(aside).toHaveClass('hidden');
    expect(aside).not.toHaveClass('lg:flex');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAccessibleName(
      /Mischkriterien einblenden|Show Mischkriterien/i,
    );
    // The portal keeps its slot while the column is out of sight.
    expect(
      screen.getByRole('button', { name: 'Kriterium', hidden: true }),
    ).toBeInTheDocument();
    expect(localStorage.getItem(FOLDED_KEY)).toBe('true');

    fireEvent.click(toggle);
    expect(aside).toHaveClass('lg:flex');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(localStorage.getItem(FOLDED_KEY)).toBe('false');
  });

  it('keeps a folded column folded on the next visit', () => {
    localStorage.setItem(FOLDED_KEY, 'true');
    setWidth(1280);
    renderLayer();

    expect(
      screen.getByRole('complementary', {
        name: 'Mischkriterien',
        hidden: true,
      }),
    ).toHaveClass('hidden');
  });

  it('starts folded on a touch screen narrower than xl', () => {
    pointerIs(true);
    setWidth(1180);
    renderLayer();

    expect(inspectorSwitch()).toHaveAttribute('aria-expanded', 'false');
  });

  it('starts with the column shown on a wide touch screen', () => {
    pointerIs(true);
    setWidth(1920);
    renderLayer();

    expect(inspectorSwitch()).toHaveAttribute('aria-expanded', 'true');
  });

  // The class layer's column folds too, from the same switch — but it is
  // where a student is edited: opening one brings it back.
  it('folds the class layer’s column and unfolds it for an opened student', () => {
    setWidth(1280);
    mocks.state.step = 1;
    mocks.state.students = [createMockStudent({ id: 'g', name: 'Grace' })];
    render(
      <InspectorProvider>
        <Picker />
        <Inspector />
        <StatusBarFrame start={<span>Status</span>} />
      </InspectorProvider>,
    );

    fireEvent.click(inspectorSwitch());
    expect(
      screen.queryByRole('complementary', { name: /Merkmale|Attributes/i }),
    ).not.toBeInTheDocument();
    expect(localStorage.getItem(FOLDED_KEY)).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'pick' }));

    expect(
      screen.getByRole('complementary', { name: /Merkmale|Attributes/i }),
    ).toHaveClass('lg:flex');
    expect(screen.getByRole('heading', { name: 'Grace' })).toBeInTheDocument();
    expect(localStorage.getItem(FOLDED_KEY)).toBe('false');
  });

  // Ticked students are edited in the column alone, so they bring it back.
  it('unfolds for a portal that asks to be seen', () => {
    localStorage.setItem(FOLDED_KEY, 'true');
    setWidth(1280);
    render(
      <InspectorProvider>
        <InspectorPortal label="Mehrfachauswahl" reveal>
          <p>Auswahl</p>
        </InspectorPortal>
        <Inspector />
      </InspectorProvider>,
    );

    expect(
      screen.getByRole('complementary', { name: 'Mehrfachauswahl' }),
    ).toHaveClass('lg:flex');
  });
});
