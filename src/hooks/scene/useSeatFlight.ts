// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import {
  inertCopy,
  MOTION_DURATION,
  MOTION_EASE,
  motionEnabled,
} from '@/utils/ui/motion';

/** A seat or a place: `data-seat-flight` names it, `data-seat-student` who sits there. */
export const SEAT_FLIGHT_ATTR = 'data-seat-flight';
export const SEAT_STUDENT_ATTR = 'data-seat-student';
/** What else belongs to the seat's student and travels with it (badges, photo). */
export const SEAT_FLIGHT_PART_ATTR = 'data-seat-flight-part';
/** The seat's middle as "x y" in its own coordinates. */
export const SEAT_CENTRE_ATTR = 'data-seat-centre';
/** The table's outline along a seat's outer sides: hidden, shown in flight. */
export const SEAT_FLIGHT_EDGE_ATTR = 'data-seat-flight-edge';

/** How a seat of a table is named for a flight. */
export const seatFlightKey = (tableIndex: number, seatIndex: number) =>
  `${tableIndex}:${seatIndex}`;

const SVG_NS = 'http://www.w3.org/2000/svg';
/** How much a student is lifted half-way, so the paths read as moves. */
const LIFT = 1.06;

type Graphics = SVGGraphicsElement;

interface SeatFlightOptions {
  svgRef: React.RefObject<SVGSVGElement | null>;
  /** An empty group drawn above every table, where the students fly. */
  layerRef: React.RefObject<SVGGElement | null>;
  /** Changes whenever who sits where may have changed. */
  arrangement: unknown;
  /**
   * Changes whenever the seats themselves are drawn elsewhere (other tables,
   * a turned drawing): nobody flies across such a change.
   */
  geometry: string;
}

function readSeats(svg: SVGSVGElement): Map<string, string> {
  const seats = new Map<string, string>();
  svg.querySelectorAll(`[${SEAT_STUDENT_ATTR}]`).forEach((element) => {
    const student = element.getAttribute(SEAT_STUDENT_ATTR);
    const seat = element.getAttribute(SEAT_FLIGHT_ATTR);
    if (student && seat) seats.set(student, seat);
  });
  return seats;
}

/** The seat's middle in its own coordinates, read from its attribute. */
function centreOf(seat: Graphics): DOMPoint {
  const [x, y] = (seat.getAttribute(SEAT_CENTRE_ATTR) ?? '')
    .split(' ')
    .map(Number);
  if (Number.isFinite(x) && Number.isFinite(y)) return new DOMPoint(x, y);
  const box = seat.getBBox();
  return new DOMPoint(box.x + box.width / 2, box.y + box.height / 2);
}

const matrixCss = (m: DOMMatrix) =>
  `matrix(${m.a}, ${m.b}, ${m.c}, ${m.d}, ${m.e}, ${m.f})`;

/** The student as it looks at the new seat, to fly in its place. */
function flightCopy(part: Graphics, transform: DOMMatrix): Graphics {
  const copy = inertCopy(part, [
    SEAT_FLIGHT_ATTR,
    SEAT_STUDENT_ATTR,
    SEAT_FLIGHT_PART_ATTR,
    SEAT_CENTRE_ATTR,
  ]);
  copy.style.opacity = '';
  // Away from its table the seat wears the table's outline itself.
  copy.querySelectorAll(`[${SEAT_FLIGHT_EDGE_ATTR}]`).forEach((edge) => {
    edge.removeAttribute('visibility');
  });
  copy.setAttribute('transform', matrixCss(transform));
  return copy;
}

/**
 * After a mix, an undo or a swap, every student who changed seats glides from
 * the old seat to the new one instead of appearing there.
 *
 * A seat is drawn inside its table, clipped by it and covered by the tables
 * drawn after it, so a student cannot leave it on its own. The flight copies
 * what the student looks like at the new seat — the seat, its badges, its
 * photo — into a layer above every table, starts the copy where the student
 * sat and lets it land; the seat itself shows again the moment it does. A
 * seat is drawn in the shape its table cuts, and the copy shows the table's
 * outline along the seat's outer sides, so nothing changes on landing. The
 * copies are only looked at: the real seats keep their focus, their pointer
 * events and their names for the screen reader throughout.
 *
 * `holdStill` names a seat whose student must not fly the next time — the one
 * a finger dragged there, which is already where it was put down.
 */
export function useSeatFlight({
  svgRef,
  layerRef,
  arrangement,
  geometry,
}: SeatFlightOptions): { holdStill: (seat: string) => void } {
  const previous = React.useRef<Map<string, string> | null>(null);
  const previousGeometry = React.useRef(geometry);
  const held = React.useRef(new Set<string>());
  const landRef = React.useRef<(() => void) | null>(null);

  const land = React.useCallback(() => {
    const current = landRef.current;
    landRef.current = null;
    current?.();
  }, []);

  React.useLayoutEffect(() => {
    const svg = svgRef.current;
    const layer = layerRef.current;
    if (!svg || !layer) return;
    const next = readSeats(svg);
    const before = previous.current;
    const sameGeometry = previousGeometry.current === geometry;
    const keep = held.current;
    previous.current = next;
    previousGeometry.current = geometry;
    held.current = new Set();
    if (!before || !sameGeometry) {
      land();
      return;
    }
    const movers = [...next].filter(
      ([student, seat]) =>
        before.has(student) && before.get(student) !== seat && !keep.has(seat),
    );
    if (movers.length === 0 || !motionEnabled(layer)) return;
    land();

    const layerMatrix = layer.getScreenCTM();
    if (!layerMatrix) return;
    const toLayer = layerMatrix.inverse();
    const inLayer = (element: Graphics) => {
      const matrix = element.getScreenCTM();
      return matrix ? toLayer.multiply(matrix) : null;
    };
    const seatAt = (seat: string) =>
      svg.querySelector<Graphics>(`[${SEAT_FLIGHT_ATTR}="${seat}"]`);

    // Every position is read before anything is hidden or appended: a write
    // between two reads makes the next `getScreenCTM` lay the whole plan out
    // again, once per student.
    const plans = movers.flatMap(([student, seat]) => {
      const from = seatAt(before.get(student)!);
      const to = seatAt(seat);
      const fromMatrix = from && inLayer(from);
      const toMatrix = to && inLayer(to);
      if (!from || !to || !fromMatrix || !toMatrix) return [];
      const parts = [
        to,
        ...svg.querySelectorAll<Graphics>(
          `[${SEAT_FLIGHT_PART_ATTR}="${seat}"]`,
        ),
      ].flatMap((part) => {
        const matrix = inLayer(part);
        return matrix ? [{ part, matrix }] : [];
      });
      // The copies stand at the new seat; the flight starts them at the old
      // one — its middle on the old middle, turned as the old seat is.
      const fromCentre = centreOf(from);
      const toCentre = centreOf(to);
      const start = fromMatrix
        .translate(fromCentre.x - toCentre.x, fromCentre.y - toCentre.y)
        .multiply(toMatrix.inverse());
      const centre = toCentre.matrixTransform(toMatrix);
      return [{ parts, start, centre }];
    });

    const hidden: Graphics[] = [];
    const flights: SVGGElement[] = [];
    const animations: Animation[] = [];
    for (const { parts, start, centre } of plans) {
      const flight = document.createElementNS(SVG_NS, 'g');
      const lift = document.createElementNS(SVG_NS, 'g');
      flight.append(lift);
      for (const { part, matrix } of parts) {
        lift.append(flightCopy(part, matrix));
        part.style.opacity = '0';
        hidden.push(part);
      }
      for (const group of [flight, lift]) {
        group.style.transformBox = 'view-box';
      }
      flight.style.transformOrigin = '0 0';
      lift.style.transformOrigin = `${centre.x}px ${centre.y}px`;
      layer.append(flight);
      flights.push(flight);
      const timing = {
        duration: MOTION_DURATION.seatGlide,
        easing: MOTION_EASE.settle,
      };
      animations.push(
        flight.animate(
          [{ transform: matrixCss(start) }, { transform: 'none' }],
          timing,
        ),
        lift.animate(
          [
            { transform: 'none' },
            { transform: `scale(${LIFT})`, offset: 0.5 },
            { transform: 'none' },
          ],
          timing,
        ),
      );
    }

    // An animation counts from the frame drawn before this commit, so the
    // rest of the commit would come off the flight: a student would show up
    // half-way. Each one waits at the old seat until the frame after the first
    // one that shows it — that first frame is stamped with the time it began,
    // while the commit was still running — and leaves from there.
    animations.forEach((animation) => animation.pause());
    let takeOff = requestAnimationFrame(() => {
      takeOff = requestAnimationFrame(() => {
        animations.forEach((animation) => animation.play());
      });
    });

    landRef.current = () => {
      cancelAnimationFrame(takeOff);
      animations.forEach((animation) => animation.cancel());
      flights.forEach((flight) => flight.remove());
      hidden.forEach((part) => {
        part.style.opacity = '';
      });
    };
    const finished = landRef.current;
    Promise.all(animations.map((animation) => animation.finished)).then(
      () => {
        if (landRef.current === finished) land();
      },
      // Cancelled by the next flight, which has landed this one already.
      () => {},
    );
  }, [svgRef, layerRef, arrangement, geometry, land]);

  React.useEffect(() => land, [land]);

  const holdStill = React.useCallback((seat: string) => {
    held.current.add(seat);
  }, []);

  return { holdStill };
}
