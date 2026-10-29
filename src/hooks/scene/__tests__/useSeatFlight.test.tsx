// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SEAT_CENTRE_ATTR,
  SEAT_FLIGHT_ATTR,
  SEAT_FLIGHT_EDGE_ATTR,
  SEAT_FLIGHT_PART_ATTR,
  SEAT_STUDENT_ATTR,
  useSeatFlight,
} from '@/hooks/scene/useSeatFlight';

/** The 2D part of a DOMMatrix, which jsdom does not have. */
class Matrix {
  constructor(
    public a = 1,
    public b = 0,
    public c = 0,
    public d = 1,
    public e = 0,
    public f = 0,
  ) {}
  multiply(m: Matrix) {
    return new Matrix(
      this.a * m.a + this.c * m.b,
      this.b * m.a + this.d * m.b,
      this.a * m.c + this.c * m.d,
      this.b * m.c + this.d * m.d,
      this.a * m.e + this.c * m.f + this.e,
      this.b * m.e + this.d * m.f + this.f,
    );
  }
  translate(x: number, y: number) {
    return this.multiply(new Matrix(1, 0, 0, 1, x, y));
  }
  inverse() {
    const det = this.a * this.d - this.b * this.c;
    return new Matrix(
      this.d / det,
      -this.b / det,
      -this.c / det,
      this.a / det,
      (this.c * this.f - this.d * this.e) / det,
      (this.b * this.e - this.a * this.f) / det,
    );
  }
}

class Point {
  constructor(
    public x = 0,
    public y = 0,
  ) {}
  matrixTransform(m: Matrix) {
    return new Point(
      m.a * this.x + m.c * this.y + m.e,
      m.b * this.x + m.d * this.y + m.f,
    );
  }
}

/** Seats along a row, 100 units apart: seat `i` stands at x = 100·i. */
function Plan({
  seating,
  geometry = 'room',
  hold,
}: {
  seating: (string | null)[];
  geometry?: string;
  hold?: number;
}) {
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const layerRef = React.useRef<SVGGElement | null>(null);
  const { holdStill } = useSeatFlight({
    svgRef,
    layerRef,
    arrangement: seating,
    geometry,
  });
  if (hold !== undefined) holdStill(String(hold));
  return (
    <svg ref={svgRef}>
      {seating.map((student, index) => (
        <g
          key={index}
          data-x={index * 100}
          {...{
            [SEAT_FLIGHT_ATTR]: String(index),
            [SEAT_STUDENT_ATTR]: student ?? undefined,
            [SEAT_CENTRE_ATTR]: '20 10',
          }}
        >
          <text>{student}</text>
          <path visibility="hidden" {...{ [SEAT_FLIGHT_EDGE_ATTR]: '' }} />
        </g>
      ))}
      {seating.map((student, index) =>
        student ? (
          <g
            key={`badge-${index}`}
            data-x={index * 100}
            {...{ [SEAT_FLIGHT_PART_ATTR]: String(index) }}
          />
        ) : null,
      )}
      <g ref={layerRef} data-testid="layer" />
    </svg>
  );
}

describe('useSeatFlight', () => {
  let finish: () => void;
  const animate = vi.fn();
  const pause = vi.fn();
  const play = vi.fn();
  let frames: Map<number, FrameRequestCallback>;
  let lastFrame: number;
  /** Draws one frame: runs what was asked for before it. */
  const drawFrame = () => {
    const due = [...frames.values()];
    frames.clear();
    due.forEach((callback) => callback(0));
  };
  let reduceMotion = false;

  beforeEach(() => {
    reduceMotion = false;
    animate.mockReset();
    pause.mockReset();
    play.mockReset();
    frames = new Map();
    lastFrame = 0;
    let resolve = () => {};
    const finished = new Promise<void>((done) => {
      resolve = done;
    });
    finish = resolve;
    animate.mockImplementation(() => ({
      finished,
      cancel: vi.fn(),
      pause,
      play,
    }));
    Element.prototype.animate = animate as never;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++lastFrame, callback);
      return lastFrame;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    vi.stubGlobal('DOMPoint', Point);
    (SVGElement.prototype as unknown as Record<string, unknown>).getScreenCTM =
      function (this: Element) {
        return new Matrix().translate(Number(this.getAttribute('data-x')), 0);
      };
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
    delete (SVGElement.prototype as { getScreenCTM?: unknown }).getScreenCTM;
  });

  const layerOf = (container: HTMLElement) =>
    container.querySelector('[data-testid="layer"]')!;
  const seat = (container: HTMLElement, index: number) =>
    container.querySelector<SVGGElement>(`[${SEAT_FLIGHT_ATTR}="${index}"]`)!;

  it('stands still on the first drawing', () => {
    render(<Plan seating={['ada', 'ben', null]} />);

    expect(animate).not.toHaveBeenCalled();
  });

  it('lets a student who changed seats glide from the old seat to the new one', async () => {
    const { container, rerender } = render(
      <Plan seating={['ada', null, null]} />,
    );

    rerender(<Plan seating={[null, null, 'ada']} />);

    // The copy stands at the new seat (x 200) and starts 200 units back.
    const flight = layerOf(container).firstElementChild as SVGGElement;
    expect(flight.textContent).toBe('ada');
    expect(animate).toHaveBeenCalledWith(
      [{ transform: 'matrix(1, 0, 0, 1, -200, 0)' }, { transform: 'none' }],
      expect.objectContaining({ duration: 420 }),
    );
    // The seat and its badges wait for the landing; the copy is only looked at.
    expect(seat(container, 2).style.opacity).toBe('0');
    expect(
      container.querySelector(`[${SEAT_FLIGHT_PART_ATTR}="2"]`),
    ).toHaveStyle({ opacity: '0' });
    expect(flight.querySelector(`[${SEAT_STUDENT_ATTR}]`)).toBeNull();
    // Away from its table the copy wears the table's outline; the seat
    // leaves it to its table.
    expect(
      flight.querySelector(`[${SEAT_FLIGHT_EDGE_ATTR}]`),
    ).not.toHaveAttribute('visibility');
    expect(
      seat(container, 2).querySelector(`[${SEAT_FLIGHT_EDGE_ATTR}]`),
    ).toHaveAttribute('visibility', 'hidden');

    await act(async () => finish());

    expect(layerOf(container).childElementCount).toBe(0);
    expect(seat(container, 2).style.opacity).toBe('');
  });

  it('takes off only after the first frame that shows the flight', () => {
    const { rerender } = render(<Plan seating={['ada', 'ben', null]} />);

    rerender(<Plan seating={['ben', 'ada', null]} />);

    // Two students, each a flight and a lift: held at the old seat …
    expect(pause).toHaveBeenCalledTimes(4);
    drawFrame();
    expect(play).not.toHaveBeenCalled();

    // … through the frame that first draws them, then off.
    drawFrame();
    expect(play).toHaveBeenCalledTimes(4);
  });

  it('never takes off once it has landed', () => {
    const { rerender, unmount } = render(
      <Plan seating={['ada', 'ben', null]} />,
    );
    rerender(<Plan seating={['ben', 'ada', null]} />);

    drawFrame();
    unmount();
    drawFrame();

    expect(play).not.toHaveBeenCalled();
  });

  it('lets two who swapped seats pass each other', () => {
    const { container, rerender } = render(
      <Plan seating={['ada', 'ben', null]} />,
    );

    rerender(<Plan seating={['ben', 'ada', null]} />);

    expect(layerOf(container).childElementCount).toBe(2);
  });

  it('keeps the student a finger put down where it was put', () => {
    const { container, rerender } = render(
      <Plan seating={['ada', 'ben', null]} />,
    );

    rerender(<Plan seating={['ben', 'ada', null]} hold={1} />);

    expect(layerOf(container).childElementCount).toBe(1);
    expect(layerOf(container).textContent).toBe('ben');
  });

  it('flies nobody across a change of the seats themselves', () => {
    const { container, rerender } = render(
      <Plan seating={['ada', 'ben', null]} />,
    );

    rerender(<Plan seating={['ben', 'ada', null]} geometry="turned" />);

    expect(layerOf(container).childElementCount).toBe(0);
  });

  it('lets the new arrangement simply stand under reduced motion', () => {
    reduceMotion = true;
    const { container, rerender } = render(
      <Plan seating={['ada', 'ben', null]} />,
    );

    rerender(<Plan seating={['ben', 'ada', null]} />);

    expect(animate).not.toHaveBeenCalled();
    expect(seat(container, 0).style.opacity).toBe('');
  });
});
