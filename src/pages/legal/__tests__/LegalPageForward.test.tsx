// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import ImprintForward from '../ImprintForward';
import PrivacyForward from '../PrivacyForward';

vi.mock('@/config/legalPages', () => ({
  getExternalLegalPageUrl: (route: string) => `https://schule.example${route}`,
}));

describe('legal page forwarding', () => {
  it("points the imprint route at the operator's page", () => {
    render(
      <MemoryRouter>
        <ImprintForward />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /Impressum|Legal notice/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: /Seite des Betreibers|operator's page/i,
      }),
    ).toHaveAttribute('href', 'https://schule.example/impressum');
  });

  it("points the privacy route at the operator's page", () => {
    render(
      <MemoryRouter>
        <PrivacyForward />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /Datenschutzerklärung|Privacy policy/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: /Seite des Betreibers|operator's page/i,
      }),
    ).toHaveAttribute('href', 'https://schule.example/datenschutz');
  });
});
