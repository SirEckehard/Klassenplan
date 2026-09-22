// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import '@/i18n';
import Support from '../Support';
import { APP_RETURN_STATE } from '@/hooks/useReturnToApp';

const renderSupport = (state?: unknown) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/support', state }]}>
      <Support />
    </MemoryRouter>,
  );

describe('Support', () => {
  it('opens the donation in a tab of its own', () => {
    renderSupport();

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /Klassenplan unterstützen|Support Klassenplan/,
      }),
    ).toBeInTheDocument();
    const donate = screen.getByRole('link', {
      name: /Spenden über PayPal|Donate via PayPal/,
    });
    expect(donate).toHaveAttribute(
      'href',
      expect.stringContaining('paypal.com/donate'),
    );
    expect(donate).toHaveAttribute('target', '_blank');
  });

  it('names the ways to help without money', () => {
    renderSupport();

    expect(
      screen.getByRole('link', { name: /Nachricht schreiben|Send a message/ }),
    ).toHaveAttribute('href', '/feedback');
    expect(
      screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent),
    ).toHaveLength(3);
  });

  it('leads back to the app when the toolbar opened it', () => {
    renderSupport(APP_RETURN_STATE);

    expect(
      screen.getByRole('button', { name: /^(Zurück|Back)$/ }),
    ).toBeInTheDocument();
  });
});
