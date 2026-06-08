// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { screen, render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import LanguageSelector from '../../components/LanguageSelector';

// Mock translation
const changeLanguageMock = vi.fn();
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'de',
      changeLanguage: changeLanguageMock,
    },
  }),
}));

// Stub the i18n module so importing the component does not trigger real
// i18next init; ensureEnglishLoaded resolves immediately in tests.
vi.mock('../../i18n/i18n', () => ({
  ensureEnglishLoaded: vi.fn(() => Promise.resolve()),
}));

const renderWithRouter = (component: React.ReactNode) => {
  return render(<MemoryRouter>{component}</MemoryRouter>);
};

describe('LanguageSelector', () => {
  it('renders correctly', () => {
    renderWithRouter(<LanguageSelector />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    // Default mock is 'de', shows EN as the language to switch to
    expect(screen.getByText('EN')).toBeInTheDocument();
  });

  it('toggles language on click', async () => {
    renderWithRouter(<LanguageSelector />);
    const button = screen.getByRole('button');

    // Initial state 'de' -> clicks to switch to English.
    // EN bundle loads asynchronously, so changeLanguage runs after a microtask.
    fireEvent.click(button);
    await vi.waitFor(() =>
      expect(changeLanguageMock).toHaveBeenCalledWith('en'),
    );
  });
});
