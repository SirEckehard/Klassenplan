// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it, vi } from 'vitest';
import { releasePointerCaptureIfHeld } from '@/utils';

const element = (holds: boolean) =>
  ({
    hasPointerCapture: vi.fn(() => holds),
    releasePointerCapture: vi.fn(() => {
      throw new DOMException('No active pointer', 'NotFoundError');
    }),
  }) as unknown as Element;

describe('releasePointerCaptureIfHeld', () => {
  it('releases a pointer the element holds', () => {
    const holding = {
      hasPointerCapture: vi.fn(() => true),
      releasePointerCapture: vi.fn(),
    } as unknown as Element;

    releasePointerCaptureIfHeld(holding, 2);

    expect(holding.releasePointerCapture).toHaveBeenCalledWith(2);
  });

  it('leaves a pointer alone that is no longer held', () => {
    const lifted = element(false);

    expect(() => releasePointerCaptureIfHeld(lifted, 5)).not.toThrow();
    expect(lifted.releasePointerCapture).not.toHaveBeenCalled();
  });

  it('does nothing without an element or the capture API', () => {
    expect(() => releasePointerCaptureIfHeld(null, 1)).not.toThrow();
    expect(() =>
      releasePointerCaptureIfHeld({} as unknown as Element, 1),
    ).not.toThrow();
  });
});
