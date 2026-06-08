import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import '@/i18n'; // Initialize i18n for tests
import Feedback from '../Feedback';

// Test rendering of contact information
describe('Feedback', () => {
  it('renders contact information and mail link', () => {
    render(
      <MemoryRouter>
        <Feedback />
      </MemoryRouter>,
    );

    // Heading - match either German 'Kontakt' or English 'Contact'
    expect(
      screen.getByRole('heading', { level: 2, name: /Kontakt|Contact/i }),
    ).toBeInTheDocument();
    const mailLink = screen.getByRole('link', {
      name: 'webmaster@klassenplan.de',
    });
    expect(mailLink).toBeInTheDocument();
    expect(mailLink).toHaveAttribute('href', 'mailto:webmaster@klassenplan.de');
  });
});
