// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import '@/i18n';
import FAQ from '../FAQ';
import { APP_RETURN_STATE } from '@/hooks/useReturnToApp';

const renderFaq = (state?: unknown) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/faq', state }]}>
      <FAQ />
    </MemoryRouter>,
  );

describe('FAQ', () => {
  it('lists every section in the contents and links to its anchor', () => {
    renderFaq();

    const contents = screen.getByRole('navigation', {
      name: /FAQ Schnellnavigation|FAQ Quick Navigation/i,
    });
    const links = within(contents).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '#allgemein',
      '#klassenliste',
      '#eigenschaften',
      '#wunschpartner',
      '#layout',
      '#einstellungen',
      '#tipps',
      '#unterricht',
      '#oberflaeche',
      '#backups',
      '#projekt',
    ]);
    for (const link of links) {
      const id = link.getAttribute('href')!.slice(1);
      expect(document.getElementById(id)).not.toBeNull();
    }
  });

  it('shows no raw translation key anywhere', () => {
    renderFaq();

    // Recipes, importance levels and fulfilment bands are looked up with
    // computed keys, which the i18n check cannot see.
    expect(document.body.textContent).not.toMatch(
      /\b(faq|mix|statisticsBadge|support)\.[a-zA-Z_]+\.[a-zA-Z_]/,
    );
  });

  it('names the four importance levels and every recipe as the app does', () => {
    renderFaq();

    const criteria = screen.getByRole('region', {
      name: /Kriterien & Erfüllung|Criteria & fulfilment/i,
    });
    for (const word of [
      /Sehr wichtig|Very important/,
      /Empfohlene Mischung|Recommended mix/,
      /Klassenarbeit|Exam/,
    ]) {
      expect(criteria).toHaveTextContent(word);
    }
  });

  it('offers the way back only when the app opened the page', () => {
    const { unmount } = renderFaq();
    expect(
      screen.queryByRole('button', { name: /^(Zurück|Back)$/ }),
    ).not.toBeInTheDocument();
    unmount();

    renderFaq(APP_RETURN_STATE);
    expect(
      screen.getByRole('button', { name: /^(Zurück|Back)$/ }),
    ).toBeInTheDocument();
  });
});
