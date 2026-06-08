// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import '@/i18n'; // Initialize i18n for tests
import Footer from '../Footer';
import { SeatingPlanGeneratorProvider } from '@/contexts/SeatingPlanContext';

describe('Footer', () => {
  it('renders navigation links', () => {
    render(
      <BrowserRouter>
        <SeatingPlanGeneratorProvider>
          <Footer />
        </SeatingPlanGeneratorProvider>
      </BrowserRouter>,
    );
    // Navigation links should be rendered with translated text
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /impressum|legal notice/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /datenschutz|privacy/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /feedback/i })).toBeInTheDocument();
  });
});
