// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { createPortal } from 'react-dom';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOutsideTap } from '@/hooks/ui/useOutsideTap';

function Panel({
  onDismiss,
  active = true,
  isBlocked,
}: {
  onDismiss: () => void;
  active?: boolean;
  isBlocked?: () => boolean;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  useOutsideTap(ref, onDismiss, active, {
    ignoreSelector: '[aria-controls="panel"]',
    isBlocked,
  });
  return (
    <>
      <div id="panel" ref={ref}>
        <button type="button">inside</button>
        {/* A list opened from a select in the panel, at the end of the page. */}
        {createPortal(<button type="button">portalled</button>, document.body)}
      </div>
      <button type="button" aria-controls="panel">
        switch
      </button>
      <p>stage</p>
    </>
  );
}

/** A press and a lift, `travel` pixels apart. */
const tap = (target: Element, travel = 0, pointer = { isPrimary: true }) => {
  fireEvent.pointerDown(target, {
    pointerId: 1,
    clientX: 10,
    clientY: 10,
    ...pointer,
  });
  fireEvent.pointerUp(target, {
    pointerId: 1,
    clientX: 10 + travel,
    clientY: 10,
    ...pointer,
  });
};

let appRoot: HTMLElement;

beforeEach(() => {
  // The app renders into #root; what is portalled lands beside it.
  appRoot = document.createElement('div');
  appRoot.id = 'root';
  document.body.appendChild(appRoot);
});

afterEach(() => {
  cleanup();
  appRoot.remove();
});

const renderPanel = (
  props: Partial<React.ComponentProps<typeof Panel>> = {},
) => {
  const onDismiss = vi.fn();
  render(<Panel onDismiss={onDismiss} {...props} />, { container: appRoot });
  return onDismiss;
};

describe('useOutsideTap', () => {
  it('closes the panel on a tap beside it', () => {
    const onDismiss = renderPanel();

    tap(screen.getByText('stage'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('keeps a tap inside the panel, on its switch and in its portalled lists', () => {
    const onDismiss = renderPanel();

    tap(screen.getByRole('button', { name: 'inside' }));
    tap(screen.getByRole('button', { name: 'switch' }));
    tap(screen.getByRole('button', { name: 'portalled' }));

    expect(onDismiss).not.toHaveBeenCalled();
  });

  // A finger that starts to scroll the page has its pointer cancelled by the
  // browser; a drag across the stage travels.
  it('leaves the panel open for a scroll or a drag', () => {
    const onDismiss = renderPanel();
    const stage = screen.getByText('stage');

    fireEvent.pointerDown(stage, { pointerId: 1, isPrimary: true });
    fireEvent.pointerCancel(stage, { pointerId: 1, isPrimary: true });
    fireEvent.pointerUp(stage, { pointerId: 1, isPrimary: true });
    tap(stage, 40);

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('leaves the panel to an overlay above it', () => {
    const onDismiss = renderPanel({ isBlocked: () => true });

    tap(screen.getByText('stage'));

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('takes a second finger for a pinch, not a tap', () => {
    const onDismiss = renderPanel();

    tap(screen.getByText('stage'), 0, { isPrimary: false });

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('does nothing while the panel is closed', () => {
    const onDismiss = renderPanel({ active: false });

    tap(screen.getByText('stage'));

    expect(onDismiss).not.toHaveBeenCalled();
  });
});
