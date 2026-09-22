// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import '@/i18n'; // Initialize i18n for tests
import HeroMockup from '../HeroMockup';
import { getButton, getDialog } from '@/__tests__/utils';

const carousel = () =>
  screen.getByRole('region', { name: /App-Vorschau|App preview/i });

/** The strip under the picture names the slide and where it stands. */
const caption = () =>
  within(carousel()).getByText(/^(Bild \d von|Slide \d of) 6$/);

describe('HeroMockup', () => {
  it('names the slide on screen below the picture', () => {
    render(<HeroMockup />);

    expect(caption()).toHaveTextContent(/^(Bild 3 von|Slide 3 of) 6$/);
    expect(caption().parentElement).toHaveTextContent(
      /^(Sitzplan|Seating plan)/,
    );
  });

  it('steps through the slides from the strip', async () => {
    const user = userEvent.setup();
    render(<HeroMockup />);

    await user.click(getButton(/Nächstes Bild|Next slide/i));
    expect(caption().parentElement).toHaveTextContent(
      /^(Sitzkreis|Seating circle)/,
    );

    await user.click(getButton(/Vorheriges Bild|Previous slide/i));
    await user.click(getButton(/Vorheriges Bild|Previous slide/i));
    expect(caption().parentElement).toHaveTextContent(
      /^(Klassenraum|Classroom)/,
    );
  });

  it('announces a slide change only once the rotation is paused', async () => {
    const user = userEvent.setup();
    render(<HeroMockup />);
    const live = caption().parentElement!;

    expect(live).toHaveAttribute('aria-live', 'off');
    await user.click(getButton(/pausieren|Pause/i));
    expect(getButton(/fortsetzen|Resume/i)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(live).toHaveAttribute('aria-live', 'polite');
  });

  it('opens the slide on screen enlarged', async () => {
    const user = userEvent.setup();
    render(<HeroMockup />);

    await user.click(getButton(/Vorschau vergrößern|Enlarge preview/i));
    expect(getDialog(/^(Sitzplan|Seating plan)$/)).toBeInTheDocument();
  });
});
