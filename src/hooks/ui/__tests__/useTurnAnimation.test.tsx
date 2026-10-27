// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTurnAnimation } from '@/hooks/ui/useTurnAnimation';
import type { PlanTurn } from '@/utils/canvas/turn';

function Frame({ turn }: { turn: PlanTurn | null }) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  useTurnAnimation(ref, turn);
  return <div ref={ref} data-testid="frame" />;
}

describe('useTurnAnimation', () => {
  const animate = vi.fn();
  let reduceMotion = false;

  beforeEach(() => {
    animate.mockClear();
    reduceMotion = false;
    HTMLElement.prototype.animate = animate as never;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 400,
      height: 600,
    } as DOMRect);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: (query: string) =>
        ({
          matches: query.includes('reduced-motion') && reduceMotion,
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (HTMLElement.prototype as { animate?: unknown }).animate;
    delete (window as { matchMedia?: unknown }).matchMedia;
  });

  it('stands still on the first drawing', () => {
    render(<Frame turn={90} />);

    expect(animate).not.toHaveBeenCalled();
  });

  it('turns the frame into place from a quarter back, shrunk to its footprint', () => {
    const { rerender } = render(<Frame turn={null} />);

    rerender(<Frame turn={90} />);

    expect(animate).toHaveBeenCalledExactlyOnceWith(
      [
        { transform: `rotate(-90deg) scale(${400 / 600})` },
        { transform: 'none' },
      ],
      expect.objectContaining({ duration: 260 }),
    );
  });

  it('turns the other way back to landscape', () => {
    const { rerender } = render(<Frame turn={90} />);

    rerender(<Frame turn={null} />);

    expect(animate.mock.calls[0]?.[0]?.[0]).toEqual({
      transform: `rotate(90deg) scale(${400 / 600})`,
    });
  });

  it('lets the new lie simply stand under reduced motion', () => {
    reduceMotion = true;
    const { rerender } = render(<Frame turn={null} />);

    rerender(<Frame turn={90} />);

    expect(animate).not.toHaveBeenCalled();
  });
});
