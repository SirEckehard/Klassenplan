// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@/i18n';
import CookieConsent from '@/components/CookieConsent';
import { LOCAL_STORAGE_KEYS } from '@/utils';

describe('CookieConsent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // axe's `region`: everything on a page belongs to a landmark, the notice
  // about storage included.
  it('is a landmark of its own until it is acknowledged', () => {
    render(
      <MemoryRouter>
        <CookieConsent />
      </MemoryRouter>,
    );

    const notice = screen.getByRole('region', {
      name: /Hinweis zur Speicherung|About storage/,
    });
    fireEvent.click(
      screen.getByRole('button', { name: /^(Verstanden|Got it)$/ }),
    );

    expect(notice).not.toBeInTheDocument();
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.cookieConsent)).toBe('true');
  });
});
