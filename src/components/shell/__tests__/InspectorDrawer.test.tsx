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
