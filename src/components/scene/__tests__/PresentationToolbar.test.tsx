// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PresentationToolbar from '../PresentationToolbar';

const renderBar = () =>
  render(
    <PresentationToolbar
      perspective="teacher"
      onPerspectiveChange={vi.fn()}
      mode="table"
      onModeChange={vi.fn()}
      isTeacher
      showBadges={false}
      onToggleBadges={vi.fn()}
      showPhotos
      onTogglePhotos={vi.fn()}
      showColors
      onToggleColors={vi.fn()}
      showFeatures
      onToggleFeatures={vi.fn()}
      contrast={false}
      onToggleContrast={vi.fn()}
      nameDisplay="firstName"
      onCycleNameDisplay={vi.fn()}
      onPick={vi.fn()}
      onOpenGroups={vi.fn()}
      zoom={1}
      minZoom={0.5}
      maxZoom={2}
      onZoomChange={vi.fn()}
      onResetView={vi.fn()}
      fullscreenSupported
      isFullscreen={false}
      onToggleFullscreen={vi.fn()}
      onExit={vi.fn()}
    />,
  );

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
});
