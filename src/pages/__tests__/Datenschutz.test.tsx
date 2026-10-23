// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import Datenschutz from '../Datenschutz';
import { SeatingPlanGeneratorProvider } from '../../contexts/SeatingPlanContext';
import { clearProjectLocalStorage } from '../../utils/data/storage';

// Ensure privacy policy heading and mail link
describe('Datenschutz page', () => {
  beforeEach(() => {
    clearProjectLocalStorage();
  });
  it('shows heading, logo link and email address', async () => {
    render(
      <MemoryRouter>
        <SeatingPlanGeneratorProvider>
          <Datenschutz />
        </SeatingPlanGeneratorProvider>
      </MemoryRouter>,
    );
    // The provider loads the stored classes once it is mounted.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(
      screen.getByRole('link', {
        name: /^Klassenplan – (Zur Startseite|Back to Home)$/i,
      }),
    ).toHaveAttribute('href', '/');
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /^Datenschutzerklärung$/i,
      }),
    ).toBeInTheDocument();
    const mailLink = screen.getByRole('link', {
      name: /webmaster@klassenplan.de/i,
    });
    expect(mailLink).toHaveAttribute('href', 'mailto:webmaster@klassenplan.de');
    // Art. 13 (2) (d) GDPR: the right to complain has to be named.
    expect(document.body).toHaveTextContent('Art. 77 DSGVO');
  });
});
