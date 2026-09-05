// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import FloatingDropdown from '@/components/students/FloatingDropdown';

function Harness() {
  // The anchor precedes the dropdown in the tree, so its ref is attached by the
  // time `FloatingDropdown` measures it in its layout effect.
  const anchorRef = React.useRef<HTMLButtonElement | null>(null);

  return (
    <>
      <button type="button" ref={anchorRef}>
        Anchor
      </button>
      <FloatingDropdown anchorRef={anchorRef}>
        <div role="dialog" aria-label="Menu">
          <input aria-label="Name" />
        </div>
      </FloatingDropdown>
    </>
  );
}

/** The positioned portal wrapper `FloatingDropdown` renders around its child. */
const portal = () => screen.getByRole('dialog').parentElement as HTMLElement;

const settle = () => waitFor(() => expect(portal()).toHaveClass('opacity-100'));

afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, 'offsetHeight');
});

describe('FloatingDropdown', () => {
  it('shows the dropdown once it has been measured', async () => {
    render(<Harness />);

    await settle();
    expect(portal()).not.toHaveClass('pointer-events-none');
  });

  it('stays visible while repositioning, so a focused field keeps the keyboard open', async () => {
    render(<Harness />);
    await settle();

    const field = screen.getByRole('textbox', { name: 'Name' });
    act(() => field.focus());

    // What a phone does the moment its on-screen keyboard appears: the
    // viewport resizes (Android) or scrolls the field into view (iOS). Both
    // land in `updatePosition`, and hiding the dropdown there — even for a
    // single frame — blurs the field and dismisses the keyboard with it.
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(portal()).toHaveClass('opacity-100');
    expect(field).toHaveFocus();

    act(() => {
      document.body.dispatchEvent(new Event('scroll', { bubbles: false }));
    });
    expect(portal()).toHaveClass('opacity-100');
    expect(field).toHaveFocus();
  });

  it('flips above the anchor when the dropdown would not fit below', async () => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      value: 400,
    });
    const anchorRect = {
      top: 700,
      bottom: 740,
      left: 20,
      right: 260,
      width: 240,
    };
    const originalRect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function () {
      return {
        ...anchorRect,
        height: 40,
        x: 20,
        y: 700,
        toJSON: () => ({}),
      } as DOMRect;
    };

    try {
      render(<Harness />);
      await settle();

      // 768px viewport: 24px below the anchor, 696px above it.
      expect(portal()).toHaveStyle({ top: '296px' });
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalRect;
    }
  });
});
