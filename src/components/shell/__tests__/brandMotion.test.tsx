// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { KpLockup } from '@/components/KpLockup';
import {
  BRAND_GEAR_ATTR,
  brandHoverHandlers,
  useBrandFlight,
  type BrandPlace,
} from '@/components/shell/brandMotion';
import { MOTION_DURATION } from '@/utils/ui/motion';

function Head({
  place,
  markOnly = false,
  top = 10,
}: {
  place: BrandPlace | null;
  markOnly?: boolean;
  top?: number;
}) {
  const ref = React.useRef<HTMLElement | null>(null);
  useBrandFlight(ref, place);
  return (
    <header ref={ref} data-top={top}>
      <KpLockup markOnly={markOnly} />
      <div {...{ [BRAND_GEAR_ATTR]: '' }}>
        <button type="button">Einstellungen</button>
      </div>
    </header>
  );
}

const LOGO_LABEL = 'Klassenplan';

function Logo() {
  return (
    <a href="/" aria-label={LOGO_LABEL} {...brandHoverHandlers}>
      <KpLockup />
    </a>
  );
}

describe('brandMotion', () => {
  const animate = vi.fn();
  const cancel = vi.fn();
  let finish: () => void;
  let reduceMotion = false;
  /** jsdom lays nothing out; a head stands where a test says. */
  let headTop = 10;

  beforeEach(() => {
    reduceMotion = false;
    headTop = 10;
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
      () => new DOMRect(16, headTop, 36, 36),
    );
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', () => {});
    animate.mockReset();
    cancel.mockReset();
    let resolve = () => {};
    const finished = new Promise<void>((done) => {
      resolve = done;
    });
    finish = resolve;
    animate.mockImplementation(() => ({
      finished,
      cancel,
      pause: vi.fn(),
      play: vi.fn(),
    }));
    Element.prototype.animate = animate as never;
    (SVGElement.prototype as unknown as Record<string, unknown>).getBBox =
      () => ({
        x: 0,
        y: 0,
        width: 500,
        height: 500,
      });
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduced-motion') && reduceMotion,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete (Element.prototype as { animate?: unknown }).animate;
    delete (SVGElement.prototype as { getBBox?: unknown }).getBBox;
    document.querySelectorAll('.kp-flight').forEach((layer) => layer.remove());
  });

  const logo = (container: HTMLElement) =>
    container.querySelector('a') as HTMLAnchorElement;
  const endOf = ([, timing]: unknown[]) => {
    const { delay = 0, duration } = timing as {
      delay?: number;
      duration: number;
    };
    return delay + duration;
  };

  describe('pointed at', () => {
    it('ends mark and word together', () => {
      const { container } = render(<Logo />);
      fireEvent.pointerEnter(logo(container), { pointerType: 'mouse' });

      const ends = animate.mock.calls.map(endOf);
      expect(Math.max(...ends)).toBe(MOTION_DURATION.brandHover);
      const accent = container.querySelector('.kp-accent');
      const lastLetters = container.querySelectorAll('.kp-wordmark-svg g');
      const endOfElement = (element: Element | null | undefined) =>
        endOf(animate.mock.calls[animate.mock.contexts.indexOf(element)]);
      expect(endOfElement(accent)).toBe(MOTION_DURATION.brandHover);
      expect(endOfElement(lastLetters[10])).toBe(MOTION_DURATION.brandHover);
    });

    it('keeps K, e and p in their seats', () => {
      const { container } = render(<Logo />);
      fireEvent.pointerEnter(logo(container), { pointerType: 'mouse' });

      const glyphs = [...container.querySelectorAll('.kp-wordmark-svg g')];
      const moved = glyphs.map((glyph) =>
        animate.mock.contexts.includes(glyph),
      );
      expect(moved).toEqual([
        false,
        true,
        true,
        true,
        true,
        false,
        true,
        false,
        true,
        true,
        true,
      ]);
    });

    it('runs to its end when the pointer leaves, and not twice at once', async () => {
      const { container } = render(<Logo />);
      fireEvent.pointerEnter(logo(container), { pointerType: 'mouse' });
      const calls = animate.mock.calls.length;

      fireEvent.pointerLeave(logo(container), { pointerType: 'mouse' });
      expect(cancel).not.toHaveBeenCalled();
      fireEvent.pointerEnter(logo(container), { pointerType: 'mouse' });
      expect(animate.mock.calls.length).toBe(calls);

      await act(async () => {
        finish();
      });
      fireEvent.pointerEnter(logo(container), { pointerType: 'mouse' });
      expect(animate.mock.calls.length).toBe(calls * 2);
    });

    it('plays nothing for a finger or under reduced motion', () => {
      const { container } = render(<Logo />);
      fireEvent.pointerEnter(logo(container), { pointerType: 'touch' });
      expect(animate).not.toHaveBeenCalled();

      reduceMotion = true;
      fireEvent.pointerEnter(logo(container), { pointerType: 'mouse' });
      expect(animate).not.toHaveBeenCalled();
    });
  });

  describe('between the two heads', () => {
    const layer = () => document.querySelector('.kp-flight');
    const flyFromStart = () => {
      const view = render(<Head key="start" place="start" />);
      view.rerender(<Head key="workspace" place="workspace" markOnly />);
      return view;
    };

    it('sends every letter to a seat of its own and hides what it draws', () => {
      const { container } = flyFromStart();

      expect(layer()?.querySelectorAll('.kp-flight-letter')).toHaveLength(11);
      expect(layer()?.getAttribute('aria-hidden')).toBe('true');
      expect(
        container.querySelector('header')?.hasAttribute('data-brand-landing'),
      ).toBe(true);
    });

    it('removes the copies once they have landed', async () => {
      const { container } = flyFromStart();
      await act(async () => {
        finish();
      });

      expect(layer()).toBeNull();
      expect(
        container.querySelector('header')?.hasAttribute('data-brand-landing'),
      ).toBe(false);
    });

    it('ends the flight when the window changes its size', () => {
      flyFromStart();
      fireEvent(window, new Event('resize'));
      expect(layer()).toBeNull();
    });

    it('does not fly on the first drawing or to the same place', () => {
      const view = render(<Head key="a" place="start" />);
      expect(layer()).toBeNull();
      view.rerender(<Head key="b" place="start" />);
      expect(layer()).toBeNull();
    });

    it('does not fly to or from a head that takes no part', () => {
      const view = render(<Head key="a" place="start" />);
      view.rerender(<Head key="b" place={null} />);
      expect(layer()).toBeNull();
      view.rerender(<Head key="c" place="workspace" markOnly />);
      expect(layer()).toBeNull();
    });

    it('survives StrictMode running the effect twice', () => {
      render(
        <React.StrictMode>
          <Head place="start" />
        </React.StrictMode>,
      );
      expect(layer()).toBeNull();
    });

    it('stays on the ground while the logo it would leave is out of view', () => {
      const view = render(<Head key="start" place="start" />);
      headTop = -200;
      view.rerender(<Head key="workspace" place="workspace" markOnly />);
      expect(layer()).toBeNull();
    });

    it('jumps under reduced motion', () => {
      reduceMotion = true;
      flyFromStart();
      expect(layer()).toBeNull();
    });
  });
});
