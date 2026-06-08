// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
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
  it('shows heading, logo link and email address', () => {
    render(
      <MemoryRouter>
        <SeatingPlanGeneratorProvider>
          <Datenschutz />
        </SeatingPlanGeneratorProvider>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('link', { name: /^Zur Startseite$/i }),
    ).toHaveAttribute('href', '/');
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /^Datenschutzerklärung$/i,
      }),
    ).toBeInTheDocument();
    const mailLink = screen.getByRole('link', {
      name: /webmaster@klassenplan.de/i,
    });
    expect(mailLink).toHaveAttribute('href', 'mailto:webmaster@klassenplan.de');
  });
});
