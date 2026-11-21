// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import '@/i18n'; // Initialize i18n for tests
import previewImages from '@/data/previewImages.json';
import StartPage from '../StartPage';

const renderStartPage = () =>
  render(
    <MemoryRouter>
      <StartPage />
    </MemoryRouter>,
  );

/** The close-up a section shows: the picture of its frame not faded out. */
const shownCloseUp = (section: HTMLElement) =>
  Array.from(section.querySelectorAll('img')).find((img) =>
    img.classList.contains('opacity-100'),
  );

/** Every file a picture of the page names: its `src` and its `srcset`. */
const closeUpUrls = (container: HTMLElement) =>
  [
    ...Array.from(container.querySelectorAll('img')).map((img) =>
      img.getAttribute('src')!,
    ),
    ...Array.from(container.querySelectorAll('source')).flatMap((source) =>
      source
        .getAttribute('srcset')!
        .split(', ')
        .map((candidate) => candidate.split(' ')[0]),
    ),
  ].filter((url) => url.startsWith('/preview/detail_'));

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
    // The room's text quotes the inspector's own button.
    expect(layers).toHaveTextContent(/„Neu einrichten“|“Set up from scratch”/);
  });

  it('names the tools beyond the plan the way the app does', () => {
    renderStartPage();

    const tools = screen.getByRole('region', {
      name: /Mehr als ein Sitzplan|More than a seating plan/i,
    });
    expect(
      within(tools)
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual([
      expect.stringMatching(/^(Namensschilder|Name cards)$/),
      expect.stringMatching(/^(Namensspiel|Name Game)$/),
      expect.stringMatching(/^(Wer kommt dran\?|Who's next\?)$/i),
      expect.stringMatching(/^(Gruppen bilden|Build groups)$/i),
      expect.stringMatching(/^(Dienste verteilen|Hand out duties)$/i),
      expect.stringMatching(/^(Wo sitzt wer\?|Where does who sit\?)$/i),
    ]);
  });

  it('lists every criterion the plan weighs, each with a real label', () => {
    renderStartPage();

    const criteria = screen.getByRole('region', {
      name: /Vielzahl an Kriterien|wide range of criteria/i,
    });
    const chips = within(criteria).getAllByRole('listitem');

    // The seventeen criteria the inspector shows, under seven family headings.
    expect(chips).toHaveLength(17);
    expect(within(criteria).getAllByRole('heading', { level: 3 })).toHaveLength(
      7,
    );
    for (const chip of chips) {
      expect(chip.textContent).not.toMatch(/mix\.criteria/);
    }
  });

  it('shows the close-up of the step or tool clicked beside its list', async () => {
    const user = userEvent.setup();
    renderStartPage();
    const layers = screen.getByRole('region', {
      name: /Alles im Blick|Everything at a glance/i,
    });

    // The class first, until another step is pointed at.
    expect(shownCloseUp(layers)?.getAttribute('src')).toMatch(
      /^\/preview\/detail_klasse_/,
    );
    await user.click(
      within(layers).getByRole('heading', { name: /^(Raum|Room)$/ }),
    );
    expect(shownCloseUp(layers)?.getAttribute('src')).toMatch(
      /^\/preview\/detail_raum_/,
    );

    const criteria = screen.getByRole('region', {
      name: /Vielzahl an Kriterien|wide range of criteria/i,
    });
    expect(shownCloseUp(criteria)?.getAttribute('src')).toMatch(
      /^\/preview\/detail_kriterien_/,
    );

    // The tools the same way, the name cards first.
    const tools = screen.getByRole('region', {
      name: /Mehr als ein Sitzplan|More than a seating plan/i,
    });
    expect(shownCloseUp(tools)?.getAttribute('src')).toMatch(
      /^\/preview\/detail_namensschilder_/,
    );
    await user.click(
      within(tools).getByRole('heading', {
        name: /^(Gruppen bilden|Build groups)$/i,
      }),
    );
    expect(shownCloseUp(tools)?.getAttribute('src')).toMatch(
      /^\/preview\/detail_gruppen_/,
    );
  });

  it('serves every close-up from a versioned file that exists', () => {
    const { container } = renderStartPage();
    const urls = closeUpUrls(container);
    const stamp = `?v=${previewImages.version}`;

    // Ten close-ups, each one AVIF and one WebP.
    expect(new Set(urls.map((url) => url.split('?')[0])).size).toBe(20);
    for (const url of urls) {
      expect(url.endsWith(stamp)).toBe(true);
      const file = path.join(process.cwd(), 'public', url.split('?')[0]);
      expect(existsSync(file), file).toBe(true);
    }
  });
});
