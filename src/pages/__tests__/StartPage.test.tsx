// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import '@/i18n'; // Initialize i18n for tests
import StartPage from '../StartPage';

const renderStartPage = () =>
  render(
    <MemoryRouter>
      <StartPage />
    </MemoryRouter>,
  );

describe('StartPage', () => {
  it('renders heading and link to generator', () => {
    renderStartPage();

    expect(
      screen.getByRole('link', {
        name: /^Klassenplan – (Zur Startseite|Back to Home)$/i,
      }),
    ).toBeInTheDocument();
    // CTA button - match either German or English text
    const link = screen.getByRole('link', {
      name: /Plane jetzt deine Klasse|Plan your class now/i,
    });
    expect(link).toHaveAttribute('href', '/generator');
  });

  it('names the three layers the way the layer switcher does', () => {
    renderStartPage();

    const layers = screen.getByRole('region', {
      name: /Alles im Blick|Everything at a glance/i,
    });
    expect(
      within(layers)
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^(Klasse|Class)$/),
        expect.stringMatching(/^(Raum|Room)$/),
        expect.stringMatching(/^(Sitzplan|Plan)$/),
      ]),
    );
  });

  it('lists every criterion the plan weighs, each with a real label', () => {
    renderStartPage();

    const criteria = screen.getByRole('region', {
      name: /Vielzahl an Kriterien|wide range of criteria/i,
    });
    const chips = within(criteria).getAllByRole('listitem');

    // The fifteen criteria the inspector shows, under seven family headings.
    expect(chips).toHaveLength(15);
    expect(within(criteria).getAllByRole('heading', { level: 3 })).toHaveLength(
      7,
    );
    for (const chip of chips) {
      expect(chip.textContent).not.toMatch(/mix\.criteria/);
    }
    // The recipes are quoted from the app, not retyped.
    expect(criteria).toHaveTextContent(/„Ruhige Arbeitsphase“|“Quiet work”/);
  });
});
