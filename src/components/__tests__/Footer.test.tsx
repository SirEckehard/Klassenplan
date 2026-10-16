// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import '@/i18n'; // Initialize i18n for tests
import Footer from '../Footer';
import ReturnToAppLink from '@/components/ReturnToAppLink';

const renderFooter = () =>
  render(
    <BrowserRouter>
      <Footer />
    </BrowserRouter>,
  );

describe('Footer', () => {
  // One line of words: the gear moved to the page's head.
  it('is one row of plain links, the legal pages among them', () => {
    renderFooter();
    const nav = screen.getByRole('navigation', {
      name: /weitere seiten|more pages/i,
    });

    const names = within(nav)
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(names).toHaveLength(6);
    for (const name of [
      /faq/i,
      /feedback/i,
      /unterstützen|support/i,
      /changelog v\d+\.\d+\.\d+/i,
      /datenschutz|privacy/i,
      /impressum|legal notice/i,
    ]) {
      expect(within(nav).getByRole('link', { name })).toBeInTheDocument();
    }
    expect(
      screen.queryByRole('button', { name: /einstellungen|settings/i }),
    ).not.toBeInTheDocument();
  });
});

describe('Footer links', () => {
  // A visitor who went from the start page to the FAQ finds the way back,
  // as one who came from inside the app does.
  it('opens a page with the way back', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Footer />} />
          <Route path="/faq" element={<ReturnToAppLink />} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('link', { name: /^faq$/i }));

    expect(
      await screen.findByRole('button', { name: /^(Zurück|Back)$/ }),
    ).toBeInTheDocument();
  });
});
