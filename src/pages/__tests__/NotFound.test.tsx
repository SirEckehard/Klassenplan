// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import '@/i18n';
import NotFound from '../NotFound';

const renderNotFound = () =>
  render(
    <MemoryRouter initialEntries={['/gibt-es-nicht']}>
      <NotFound />
    </MemoryRouter>,
  );

describe('NotFound', () => {
  it('names the error and leads home', () => {
    renderNotFound();

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /Seite nicht gefunden|Page not found/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /^(Zur Startseite|Back to home)$/ }),
    ).toHaveAttribute('href', '/');
  });

  it('offers the generator to whoever came back for a plan', () => {
    renderNotFound();

    expect(
      screen.getByRole('link', {
        name: /Direkt zum Sitzplan-Generator|Go to the seating chart generator/,
      }),
    ).toHaveAttribute('href', '/generator');
    expect(document.body.textContent).not.toMatch(/notFound\.|header\.banner/);
  });

  it('notes the missing page in the class register, unexcused', () => {
    renderNotFound();

    const register = screen.getByRole('table', {
      name: /Klassenbuch|Class register/,
    });
    expect(register).toHaveTextContent('/gibt-es-nicht');
    expect(register).toHaveTextContent(/unentschuldigt|unexcused/);
  });
});
