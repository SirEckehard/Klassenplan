// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import '@/i18n'; // Initialize i18n for tests
import StartPage from '../StartPage';

// Test main heading and navigation link on the start page
describe('StartPage', () => {
  it('renders heading and link to generator', () => {
    render(
      <MemoryRouter>
        <StartPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('link', { name: /^Zur Startseite$|^Back to Home$/i }),
    ).toBeInTheDocument();
    // CTA button - match either German or English text
    const link = screen.getByRole('link', {
      name: /Plane jetzt deine Klasse|Plan your class now/i,
    });
    expect(link).toHaveAttribute('href', '/generator');
  });
});
