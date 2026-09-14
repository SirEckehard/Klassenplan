// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { LegalPageLink } from '../LegalPageLink';

vi.mock('@/config/legalPages', () => ({
  getExternalLegalPageUrl: (route: string) =>
    route === '/impressum' ? 'https://schule.example/impressum' : null,
}));

describe('LegalPageLink', () => {
  it("opens the operator's page in a new tab when the build configures one", () => {
    render(
      <MemoryRouter>
        <LegalPageLink to="/impressum">Impressum</LegalPageLink>
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: 'Impressum' });
    expect(link).toHaveAttribute('href', 'https://schule.example/impressum');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('links to the bundled page otherwise', () => {
    render(
      <MemoryRouter>
        <LegalPageLink to="/datenschutz" title="Datenschutz">
          Datenschutz
        </LegalPageLink>
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: 'Datenschutz' });
    expect(link).toHaveAttribute('href', '/datenschutz');
    expect(link).not.toHaveAttribute('target');
  });
});
