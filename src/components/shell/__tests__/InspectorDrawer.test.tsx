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
    <InspectorProvider>
      <InspectorPortal label="Mischkriterien">
        <button type="button">Kriterium</button>
      </InspectorPortal>
      <Inspector />
      <StatusBarFrame start={<span>Status</span>} />
    </InspectorProvider>,
  );

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

  it('opens a layer’s panel from the status bar and closes it on Escape', () => {
    setWidth(820);
    renderLayer();

    const aside = screen.getByRole('complementary', {
      name: 'Mischkriterien',
      hidden: true,
    });
    const toggle = screen.getByRole('button', { name: 'Mischkriterien' });
    expect(aside).toHaveClass('hidden');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    expect(aside).toHaveClass('fixed');
    expect(aside).not.toHaveClass('hidden');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(aside).toHaveFocus();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(aside).toHaveClass('hidden');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('lets the toolbar’s drawer and the inspector’s take turns on a phone', () => {
    setWidth(390);
    render(
      <ToolRailProvider>
        <InspectorProvider>
          <InspectorPortal label="Mischkriterien">
            <button type="button">Kriterium</button>
          </InspectorPortal>
          <Inspector />
          <StatusBarFrame start={<span>Status</span>} />
        </InspectorProvider>
      </ToolRailProvider>,
    );
    const criteria = screen.getByRole('button', { name: 'Mischkriterien' });
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
    const toggle = screen.getByRole('button', { name: 'Mischkriterien' });

    fireEvent.click(toggle);
    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('needs no switch where the column stands', () => {
    setWidth(1280);
    renderLayer();

    expect(
      screen.queryByRole('button', { name: 'Mischkriterien' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('complementary', { name: 'Mischkriterien' }),
    ).toHaveClass('lg:flex');
  });
});

describe('Inspector from lg up', () => {
  const FOLDED_KEY = 'spg.inspectorFolded';

  /** A layer whose column may fold away, as the room and the plan do. */
  const renderFoldableLayer = () =>
    render(
      <InspectorProvider>
        <InspectorPortal label="Mischkriterien" foldable>
          <button type="button">Kriterium</button>
        </InspectorPortal>
        <Inspector />
        <StatusBarFrame start={<span>Status</span>} />
      </InspectorProvider>,
    );

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
    renderFoldableLayer();
    const aside = screen.getByRole('complementary', {
      name: 'Mischkriterien',
      hidden: true,
    });
    const toggle = screen.getByRole('button', { name: 'Mischkriterien' });
    expect(aside).toHaveClass('lg:flex');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(toggle);
    expect(aside).toHaveClass('hidden');
    expect(aside).not.toHaveClass('lg:flex');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
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
    renderFoldableLayer();

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
    renderFoldableLayer();

    expect(
      screen.getByRole('button', { name: 'Mischkriterien' }),
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('starts with the column shown on a wide touch screen', () => {
    pointerIs(true);
    setWidth(1920);
    renderFoldableLayer();

    expect(
      screen.getByRole('button', { name: 'Mischkriterien' }),
    ).toHaveAttribute('aria-expanded', 'true');
  });

  // The class layer's column is where a student is edited; its ticked
  // students' panel does not fold, whatever another layer left behind.
  it('never folds a panel that does not allow it', () => {
    localStorage.setItem(FOLDED_KEY, 'true');
    setWidth(1280);
    renderLayer();

    expect(
      screen.getByRole('complementary', { name: 'Mischkriterien' }),
    ).toHaveClass('lg:flex');
    expect(
      screen.queryByRole('button', { name: 'Mischkriterien' }),
    ).not.toBeInTheDocument();
  });
});
