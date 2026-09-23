// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import '@/i18n'; // Initialize i18n for tests
import HeroMockup from '../HeroMockup';
import { getButton, getDialog } from '@/__tests__/utils';
import previewImages from '@/data/previewImages.json';

const carousel = () =>
  screen.getByRole('region', { name: /App-Vorschau|App preview/i });

/** The strip under the picture names the slide and where it stands. */
const caption = () =>
  within(carousel()).getByText(/^(Bild \d von|Slide \d of) 6$/);

describe('HeroMockup', () => {
  it('names the slide on screen below the picture', () => {
    render(<HeroMockup />);

    expect(caption()).toHaveTextContent(/^(Bild 1 von|Slide 1 of) 6$/);
    expect(caption().parentElement).toHaveTextContent(
      /^(Klassenliste|Class list)/,
    );
  });

  it('steps through the slides from the strip', async () => {
    const user = userEvent.setup();
    render(<HeroMockup />);

    await user.click(getButton(/Nächstes Bild|Next slide/i));
    expect(caption().parentElement).toHaveTextContent(
      /^(Klassenraum|Classroom)/,
    );

    // Back past the first slide wraps round to the last.
    await user.click(getButton(/Vorheriges Bild|Previous slide/i));
    await user.click(getButton(/Vorheriges Bild|Previous slide/i));
    expect(caption().parentElement).toHaveTextContent(/^Export/);
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
    expect(getDialog(/^(Klassenliste|Class list)$/)).toBeInTheDocument();
  });

  it('versions every screenshot URL, so no cache serves an old picture', () => {
    const { container } = render(<HeroMockup />);
    const stamp = `?v=${previewImages.version}`;
    const urls = [
      ...Array.from(container.querySelectorAll('img')).map((img) =>
        img.getAttribute('src')!,
      ),
      ...Array.from(container.querySelectorAll('source')).flatMap((source) =>
        source
          .getAttribute('srcset')!
          .split(', ')
          .map((candidate) => candidate.split(' ')[0]),
      ),
    ];

    expect(previewImages.version).toMatch(/^[0-9a-f]{10}$/);
    expect(urls.length).toBeGreaterThan(0);
    urls.forEach((url) => expect(url.endsWith(stamp)).toBe(true));
  });
});
