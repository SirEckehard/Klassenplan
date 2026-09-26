// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The tooltip of the badges on the seats. The badge layer takes no pointer
 * events, so the icon under the pointer is found by its box; jsdom lays
 * nothing out, so the boxes are given here.
 */
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { createMockStudent } from '@/__tests__/utils';
import BadgeTooltipLayer from '@/components/scene/BadgeTooltip';
import SeatBadgePill from '@/components/scene/SeatBadgePill';
import { fitSeatBadges, getSeatBadges } from '@/utils/ui/seatBadges';
import type { BadgeFocus } from '@/utils/ui/seatBadges';

const ada = createMockStudent({
  id: 'ada',
  name: 'Ada Lovelace',
  restless: true,
  prefersWindow: true,
});

/** Boxes by slot: the pill spans 0–40, each slot is 10 wide. */
const BOXES: Record<string, [number, number, number, number]> = {
  pill: [0, 0, 40, 10],
  restless: [0, 0, 10, 10],
  prefersWindow: [20, 0, 10, 10],
};

function Harness({
  onFocusChange,
  showTooltip,
}: {
  onFocusChange?: (focus: BadgeFocus | null) => void;
  showTooltip?: boolean;
}) {
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const fit = fitSeatBadges(getSeatBadges(ada, [ada]), {
    availableWidth: 60,
    baseIconSize: 10,
  })!;
  return (
    <>
      <svg ref={svgRef} data-testid="plan">
        <SeatBadgePill fit={fit} studentId="ada" isDark={false} x={0} y={0} />
      </svg>
      <BadgeTooltipLayer
        svgRef={svgRef}
        allStudents={[ada]}
        showTooltip={showTooltip}
        onFocusChange={onFocusChange}
      />
    </>
  );
}

const pointer = (
  target: Element,
  type: string,
  x: number,
  pointerType: 'mouse' | 'touch',
) => {
  const event = new MouseEvent(type, {
    bubbles: true,
    clientX: x,
    clientY: 5,
  });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  act(() => {
    target.dispatchEvent(event);
  });
};

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: Element) {
      const key = this.hasAttribute('data-badge-pill')
        ? 'pill'
        : (this.getAttribute('data-badge-key') ?? '');
      const [left, top, width, height] = BOXES[key] ?? [-100, -100, 0, 0];
      return {
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
        x: left,
        y: top,
        toJSON: () => ({}),
      } as DOMRect;
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

describe('BadgeTooltipLayer', () => {
  it('says what the icon under the mouse means and lights its seats', async () => {
    const onFocusChange = vi.fn();
    render(<Harness onFocusChange={onFocusChange} />);

    pointer(screen.getByTestId('plan'), 'pointermove', 5, 'mouse');

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent(/Verhalten|Behaviour|Behavior/);
    expect(tooltip).toHaveTextContent(/unruhig|restless/i);
    // Reported from an effect, which may run a tick after the tooltip shows.
    await waitFor(() =>
      expect(onFocusChange).toHaveBeenLastCalledWith({
        badgeKey: 'restless',
        studentId: 'ada',
      }),
    );

    pointer(screen.getByTestId('plan'), 'pointermove', 25, 'mouse');
    await waitFor(() =>
      expect(screen.getByRole('tooltip')).toHaveTextContent(
        /Fensterplatz|Window seat/,
      ),
    );

    act(() => {
      screen.getByTestId('plan').dispatchEvent(new MouseEvent('pointerleave'));
    });
    await waitFor(() =>
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(onFocusChange).toHaveBeenLastCalledWith(null));
  });

  it('still marks the others when the tooltip is switched off', async () => {
    const onFocusChange = vi.fn();
    render(<Harness onFocusChange={onFocusChange} showTooltip={false} />);

    pointer(screen.getByTestId('plan'), 'pointermove', 5, 'mouse');

    await waitFor(() =>
      expect(onFocusChange).toHaveBeenLastCalledWith({
        badgeKey: 'restless',
        studentId: 'ada',
      }),
    );
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('pins the tooltip on a tap until the next tap or Escape', async () => {
    render(<Harness />);
    const plan = screen.getByTestId('plan');

    pointer(plan, 'pointerdown', 5, 'touch');
    pointer(plan, 'pointerup', 5, 'touch');
    expect(screen.getByRole('tooltip')).toHaveTextContent(/unruhig|restless/i);

    // Leaving does not take a tapped tooltip away.
    act(() => {
      plan.dispatchEvent(new MouseEvent('pointerleave'));
    });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    // A tap beside every icon explains nothing.
    pointer(plan, 'pointerdown', 35, 'touch');
    pointer(plan, 'pointerup', 35, 'touch');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
