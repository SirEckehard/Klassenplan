// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useTouchScrollLock } from '@/hooks/ui/useTouchScrollLock';

const Stage = ({ active }: { active?: boolean }) => {
  const ref = React.useRef<SVGSVGElement | null>(null);
  useTouchScrollLock(ref, active);
  return <svg ref={ref} data-testid="stage" />;
};

const moveFinger = (element: Element): boolean => {
  const event = new Event('touchmove', { bubbles: true, cancelable: true });
  element.dispatchEvent(event);
  return event.defaultPrevented;
};

afterEach(cleanup);

describe('useTouchScrollLock', () => {
  it('keeps a finger on the stage from scrolling the page', () => {
    render(<Stage />);
    expect(moveFinger(screen.getByTestId('stage'))).toBe(true);
  });

  it('leaves the finger to the page where the stage does not take it', () => {
    render(<Stage active={false} />);
    expect(moveFinger(screen.getByTestId('stage'))).toBe(false);
  });
});
