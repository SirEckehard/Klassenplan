// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import '@/i18n'; // Initialize i18n for tests
import Feedback from '../Feedback';

const renderFeedback = () =>
  render(
    <MemoryRouter initialEntries={['/feedback']}>
      <Feedback />
    </MemoryRouter>,
  );

describe('Feedback', () => {
  it('makes the mail address the one action', () => {
    renderFeedback();

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /Schreib mir eine Nachricht|Send me a message/,
      }),
    ).toBeInTheDocument();
    const mailLink = screen.getByRole('link', {
      name: 'webmaster@klassenplan.de',
    });
    expect(mailLink).toHaveAttribute('href', 'mailto:webmaster@klassenplan.de');
  });

  it('points to the FAQ and the code before anyone writes', () => {
    renderFeedback();

    expect(
      screen.getByRole('link', { name: /Zum FAQ|Go to the FAQ/ }),
    ).toHaveAttribute('href', '/faq');
    expect(
      screen.getByRole('link', {
        name: /Zum Projekt auf GitHub|The project on GitHub/,
      }),
    ).toHaveAttribute('target', '_blank');
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
    // The notes are looked up with computed keys, which the i18n check
    // cannot see.
    expect(document.body.textContent).not.toMatch(/feedback\.notes\./);
  });
});
