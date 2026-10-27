// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePanelMotion, type PanelEdge } from '@/hooks/ui/usePanelMotion';

function Drawer({
  open,
  edge = 'right',
  layout = 'tablet',
}: {
  open: boolean;
  edge?: PanelEdge;
  layout?: string;
}) {
  const ref = React.useRef<HTMLElement | null>(null);
  usePanelMotion(ref, open, edge, layout);
  return (
    <div data-testid="shell">
      {open && (
        <aside ref={ref} id="drawer" aria-label="Inspektor" className="drawer">
          <button type="button">Speichern</button>
        </aside>
      )}
    </div>
  );
}

describe('usePanelMotion', () => {
  const animate = vi.fn();
  let finish: () => void;
  let reduceMotion = false;

  beforeEach(() => {
    reduceMotion = false;
    animate.mockReset();
    const finished = new Promise<void>((done) => {
      finish = done;
    });
    animate.mockImplementation(() => ({ finished }));
    Element.prototype.animate = animate as never;
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduced-motion') && reduceMotion,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (Element.prototype as { animate?: unknown }).animate;
  });

  it('stays where it is when the page opens with it', () => {
    render(<Drawer open />);

    expect(animate).not.toHaveBeenCalled();
  });

  it('comes in from its own edge', () => {
    const { rerender } = render(<Drawer open={false} edge="bottom" />);

    rerender(<Drawer open edge="bottom" />);

    expect(animate).toHaveBeenCalledExactlyOnceWith(
      [{ transform: 'translateY(100%)' }, { transform: 'none' }],
      expect.objectContaining({ duration: 260 }),
    );
  });

  it('closes at once and lets an inert copy slide out in its place', async () => {
    const { rerender } = render(<Drawer open={false} />);
    rerender(<Drawer open />);

    rerender(<Drawer open={false} />);

    // The drawer itself is gone: nothing of it can be reached or named.
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    const copy = screen.getByTestId('shell').querySelector('.drawer');
    expect(copy).toHaveAttribute('aria-hidden', 'true');
    expect(copy).toHaveAttribute('inert');
    expect(copy).not.toHaveAttribute('id');
    expect(animate).toHaveBeenLastCalledWith(
      [{ transform: 'none' }, { transform: 'translateX(100%)' }],
      expect.objectContaining({ duration: 160, fill: 'forwards' }),
    );

    await act(async () => finish());

    expect(screen.getByTestId('shell').querySelector('.drawer')).toBeNull();
  });

  it('does not move when the layout itself changes', () => {
    const { rerender } = render(<Drawer open={false} layout="tablet" />);
    rerender(<Drawer open layout="tablet" />);
    animate.mockClear();

    rerender(<Drawer open={false} layout="desktop" />);

    expect(animate).not.toHaveBeenCalled();
    expect(screen.getByTestId('shell').querySelector('.drawer')).toBeNull();
  });

  it('opens and closes at once under reduced motion', () => {
    reduceMotion = true;
    const { rerender } = render(<Drawer open={false} />);

    rerender(<Drawer open />);
    rerender(<Drawer open={false} />);

    expect(animate).not.toHaveBeenCalled();
    expect(screen.getByTestId('shell').querySelector('.drawer')).toBeNull();
  });
});
