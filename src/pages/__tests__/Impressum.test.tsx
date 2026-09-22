// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, it, expect } from 'vitest';
import i18n, { ensureEnglishLoaded } from '@/i18n/i18n';
import Impressum from '../Impressum';
import { APP_RETURN_STATE } from '@/hooks/useReturnToApp';

const renderImpressum = (state?: unknown) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/impressum', state }]}>
      <Impressum />
    </MemoryRouter>,
  );

afterEach(async () => {
  await i18n.changeLanguage('de');
});

// Ensure imprint heading and mail link
describe('Impressum page', () => {
  it('shows heading, logo link and email link', () => {
    renderImpressum();

    expect(
      screen.getByRole('link', {
        name: /^Klassenplan – (Zur Startseite|Back to Home)$/i,
      }),
    ).toHaveAttribute('href', '/');
    expect(
      screen.getByRole('heading', { level: 1, name: /^Impressum$/ }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent),
    ).toEqual([
      'Anbieterkennzeichnung',
      'Kontakt',
      'Haftungsausschluss',
      'Urheberrecht',
    ]);
    const emailLink = screen.getByRole('link', {
      name: /webmaster@klassenplan.de/i,
    });
    expect(emailLink).toHaveAttribute(
      'href',
      'mailto:webmaster@klassenplan.de',
    );
  });

  // The TMG was replaced by the DDG on 14 May 2024.
  it('cites the law in force, not the repealed TMG', () => {
    renderImpressum();

    expect(document.body).toHaveTextContent('§ 5 DDG');
    expect(document.body.textContent).not.toMatch(/\bTMG\b/);
  });

  it('leads back to the app when its settings menu opened the page', () => {
    renderImpressum(APP_RETURN_STATE);

    expect(
      screen.getByRole('button', { name: /^(Zurück|Back)$/ }),
    ).toBeInTheDocument();
  });

  // Pinned rather than matched bilingually: the language is the subject here.
  it('says on the English page that the text is German only', async () => {
    const { unmount } = renderImpressum();
    expect(screen.queryByText(/only available in German/)).toBeNull();
    unmount();

    await ensureEnglishLoaded();
    await i18n.changeLanguage('en');
    renderImpressum();

    expect(screen.getByText(/only available in German/)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Impressum' }),
    ).toHaveAttribute('lang', 'de');
  });
});
