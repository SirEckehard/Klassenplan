// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMockStudent } from '@/__tests__/utils';
import BadgeLegend from '../BadgeLegend';
import { CanvasSettingsGroups } from '../CanvasSettingsButton';
import { buildBadgeDisplayGroup } from '../badgeDisplayGroup';
import i18n from '@/i18n';

afterEach(() => {
  cleanup();
});

const students = [
  createMockStudent({ id: 'a', name: 'Anna', restless: true, height: 'tall' }),
  createMockStudent({ id: 'b', name: 'Ben', restless: true, shy: true }),
];

describe('BadgeLegend', () => {
  it('explains each badge of the class once, under its family', () => {
    render(<BadgeLegend students={students} />);

    expect(
      screen.getByText(/^(Verhalten|Behaviour|Behavior)$/),
    ).toBeInTheDocument();
    expect(screen.getByText(/^(Soziales|Social)$/)).toBeInTheDocument();
    expect(screen.getAllByText(/^(unruhig|restless)$/i)).toHaveLength(1);
    expect(
      screen.getByText(/Körpergröße: Groß|Height: Tall/),
    ).toBeInTheDocument();
  });

  it('lights the seats of a row it is pointing at, and lets go on closing', () => {
    const onFocusChange = vi.fn();
    const { unmount } = render(
      <BadgeLegend students={students} onFocusChange={onFocusChange} />,
    );

    fireEvent.pointerEnter(screen.getByText(/^(unruhig|restless)$/i));
    expect(onFocusChange).toHaveBeenLastCalledWith({
      badgeKey: 'restless',
      studentId: null,
    });

    unmount();
    expect(onFocusChange).toHaveBeenLastCalledWith(null);
  });

  it('says so when nothing is set yet', () => {
    render(<BadgeLegend students={[createMockStudent({ id: 'c' })]} />);
    expect(
      screen.getByText(/kein Merkmal gesetzt|No markers are set/),
    ).toBeInTheDocument();
  });
});

describe('buildBadgeDisplayGroup', () => {
  it('offers all, active criteria only and off, with the legend below', () => {
    const onChange = vi.fn();
    const onHoverChange = vi.fn();
    render(
      <CanvasSettingsGroups
        groups={[
          buildBadgeDisplayGroup({
            id: 'badges',
            value: 'all',
            onChange,
            hover: { tooltip: true, highlight: true },
            onHoverChange,
            students,
            t: i18n.getFixedT(null, 'generator'),
          }),
        ]}
      />,
    );

    // What pointing at a badge does: two switches, both on.
    fireEvent.click(
      screen.getByRole('button', {
        name: /Gleiche Merkmale markieren|Mark shared markers/,
      }),
    );
    expect(onHoverChange).toHaveBeenCalledWith({
      tooltip: true,
      highlight: false,
    });
    expect(
      screen.getByRole('button', {
        name: /Erklärung beim Überfahren|Explain on hover/,
      }),
    ).toHaveAttribute('aria-pressed', 'true');

    expect(
      screen.getByRole('button', { name: /^(Alle|All)$/ }),
    ).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(
      screen.getByRole('button', {
        name: /Nur aktive Kriterien|Active criteria only/,
      }),
    );
    expect(onChange).toHaveBeenCalledWith('active');
    expect(screen.getByText(/^(Legende|Legend)$/)).toBeInTheDocument();
  });
});
