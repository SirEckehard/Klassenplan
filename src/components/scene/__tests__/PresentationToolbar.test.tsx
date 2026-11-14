// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import PresentationToolbar from '../PresentationToolbar';

type BarProps = React.ComponentProps<typeof PresentationToolbar>;

const barProps = (): BarProps => ({
  perspective: 'teacher',
  onPerspectiveChange: vi.fn(),
  mode: 'table',
  onModeChange: vi.fn(),
  isTeacher: true,
  showBadges: false,
  onToggleBadges: vi.fn(),
  showPhotos: true,
  onTogglePhotos: vi.fn(),
  showColors: true,
  onToggleColors: vi.fn(),
  showFeatures: true,
  onToggleFeatures: vi.fn(),
  contrast: false,
  onToggleContrast: vi.fn(),
  nameDisplay: 'firstName',
  onCycleNameDisplay: vi.fn(),
  onPick: vi.fn(),
  onOpenGroups: vi.fn(),
  zoom: 1,
  minZoom: 0.5,
  maxZoom: 2,
  onZoomChange: vi.fn(),
  onResetView: vi.fn(),
  fullscreenSupported: true,
  isFullscreen: false,
  onToggleFullscreen: vi.fn(),
  onExit: vi.fn(),
});

const renderBar = (props: Partial<BarProps> = {}) =>
  render(<PresentationToolbar {...barProps()} {...props} />);

const missing = [
  { id: 'ada', name: 'Ada Lovelace' },
  { id: 'ben', name: 'Ben Okri' },
];

describe('PresentationToolbar', () => {
  // At the board no tooltip explains an icon to a finger.
  it('names every button in a word on screen', () => {
    renderBar();

    for (const button of screen.getAllByRole('button')) {
      const word = button.textContent?.trim() ?? '';
      expect(word, button.outerHTML).not.toBe('');
      // What is seen is part of what speech input can say (WCAG 2.5.3).
      const name = button.getAttribute('aria-label') ?? word;
      expect(name.toLowerCase()).toContain(word.toLowerCase());
    }
  });

  it('keeps the long name for the screen reader where the word is short', () => {
    renderBar();

    expect(
      screen.getByRole('button', {
        name: /Präsentation beenden|End the presentation/,
      }),
    ).toHaveTextContent(/Beenden|End/);
    expect(
      screen.getByRole('button', { name: /^(Sitzplan|Seating Plan)$/ }),
    ).toHaveTextContent(/^Plan$/);
  });

  // Decision 0045: the count opens the names; nothing is taken back unseen.
  it('lists who is missing today behind the count', () => {
    const onMarkBack = vi.fn();
    const onClearAbsent = vi.fn();
    renderBar({ absent: missing, onMarkBack, onClearAbsent });

    const count = screen.getByRole('button', {
      name: /2 fehlen heute|2 missing today/,
    });
    expect(count).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(count);
    expect(count).toHaveAttribute('aria-expanded', 'true');
    const list = screen.getByRole('dialog', {
      name: /2 fehlen heute|2 missing today/,
    });
    expect(onClearAbsent).not.toHaveBeenCalled();

    fireEvent.click(within(list).getByRole('button', { name: /Ada Lovelace/ }));
    expect(onMarkBack).toHaveBeenCalledWith('ada');
    // The list stays for the next name.
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(count);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('brings everybody back with "Löschen" and closes the list', () => {
    const onClearAbsent = vi.fn();
    renderBar({ absent: missing, onMarkBack: vi.fn(), onClearAbsent });

    fireEvent.click(
      screen.getByRole('button', { name: /2 fehlen heute|2 missing today/ }),
    );
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: /^(Löschen|Clear)$/,
      }),
    );

    expect(onClearAbsent).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes the list when the last of them is back, and keeps it closed', () => {
    const view = renderBar({
      absent: missing.slice(0, 1),
      onMarkBack: vi.fn(),
      onClearAbsent: vi.fn(),
    });
    fireEvent.click(
      screen.getByRole('button', { name: /1 fehlt heute|1 missing today/ }),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const rerender = (absent: BarProps['absent']) =>
      view.rerender(
        <PresentationToolbar
          {...barProps()}
          absent={absent}
          onMarkBack={vi.fn()}
          onClearAbsent={vi.fn()}
        />,
      );
    rerender([]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /fehlt heute|missing today/ }),
    ).not.toBeInTheDocument();

    // The next mark shows its count, not the list by itself.
    rerender(missing.slice(1));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows no count while everybody is there', () => {
    renderBar({ onMarkBack: vi.fn(), onClearAbsent: vi.fn() });

    expect(
      screen.queryByRole('button', { name: /fehlt heute|missing today/ }),
    ).not.toBeInTheDocument();
  });
});
