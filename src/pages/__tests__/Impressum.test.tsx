// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import Impressum from '../Impressum';

// Ensure imprint heading and mail link
describe('Impressum page', () => {
  it('shows heading, logo link and email link', () => {
    render(
      <MemoryRouter>
        <Impressum />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('link', { name: /^Zur Startseite$|^Back to Home$/i }),
    ).toHaveAttribute('href', '/');
    expect(
      screen.getByRole('heading', { level: 2, name: /Impressum/i }),
    ).toBeInTheDocument();
    const emailLink = screen.getByRole('link', {
      name: /webmaster@klassenplan.de/i,
    });
    expect(emailLink).toHaveAttribute(
      'href',
      'mailto:webmaster@klassenplan.de',
    );
  });
});
