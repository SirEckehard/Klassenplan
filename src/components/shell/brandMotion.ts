// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import {
  WORDMARK_GLYPH_PATHS,
  WORDMARK_GLYPHS,
  WORDMARK_WIDTH,
} from '@/components/kpWordmarkPaths';
import {
  inertCopy,
  MOTION_DURATION,
  MOTION_EASE,
  motionEnabled,
} from '@/utils/ui/motion';

/**
 * The two moments the logo moves (decision 0040), both on the Web Animations
 * API so they ask `motionEnabled` and run to their end whatever the pointer does.
 *
 * Pointed at, the mark builds its K anew while pairs of equal letters of the
 * wordmark swap seats, ending together. Between the start page and the
 * workspace, the 11 letters of "Klassenplan" fly onto the 11 filled seats of
 * the mark and rise from them on the way back.
 */

// ── Hover ───────────────────────────────────────────────────────────────────

const POP_DURATION = 380;
const POP_STEP = 110;
const POP_EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
const ACCENT_DELAY = 760;
const ACCENT_EASE = 'cubic-bezier(0.22, 0.85, 0.36, 1)';

/**
 * Pairs of equal letters, by their place in the word; K, e and p keep theirs.
 * The word reads the same once they have swapped, so nothing needs to go back,
 * and the last pair holds the last letter, beside the mark's last seat.
 */
const SWAP_PAIRS = [
  [3, 4],
  [1, 8],
  [2, 9],
  [6, 10],
] as const;
/** The last pair flies with the accent, so word and mark land together. */
const SWAP_DURATION = MOTION_DURATION.brandHover - ACCENT_DELAY;
const SWAP_STEP = ACCENT_DELAY / (SWAP_PAIRS.length - 1);
/** How far a letter leaves the line half-way, in font units. */
const SWAP_LIFT = { near: 120, far: 180 };
const SWAP_FRAMES = 14;

function swapFrames(distance: number, lift: number): Keyframe[] {
  return Array.from({ length: SWAP_FRAMES + 1 }, (_, frame) => {
    const progress = frame / SWAP_FRAMES;
    const rise = lift * 4 * progress * (1 - progress);
    return {
      transform: `translate(${distance * progress}px, ${-rise}px)`,
    };
  });
}

function animateMark(link: Element): Animation[] {
  const animations = Array.from(
    link.querySelectorAll<SVGRectElement>('.kp-k rect'),
    (seat) =>
      seat.animate(
        [
          { opacity: 0, transform: 'scale(0.85)' },
          { opacity: 1, transform: 'scale(1)' },
        ],
        {
          duration: POP_DURATION,
          delay: Number(seat.dataset.i ?? 0) * POP_STEP,
          easing: POP_EASE,
          fill: 'backwards',
        },
      ),
  );
  const accent = link.querySelector('.kp-accent');
  if (accent) {
    animations.push(
      accent.animate(
        [
          { opacity: 0, transform: 'scale(1.18)', easing: ACCENT_EASE },
          {
            opacity: 1,
            transform: 'scale(1.04)',
            offset: 0.55,
            easing: ACCENT_EASE,
          },
          { opacity: 1, transform: 'scale(1)' },
        ],
        {
          duration: MOTION_DURATION.brandHover - ACCENT_DELAY,
          delay: ACCENT_DELAY,
          fill: 'backwards',
        },
      ),
    );
  }
  return animations;
}

function animateWord(link: Element): Animation[] {
  const glyphs = link.querySelectorAll<SVGGElement>('.kp-wordmark-svg g');
  if (glyphs.length !== WORDMARK_GLYPHS.length) return [];
  return SWAP_PAIRS.flatMap(([first, second], pair) => {
    const distance = WORDMARK_GLYPHS[second].x - WORDMARK_GLYPHS[first].x;
    const lift = second - first === 1 ? SWAP_LIFT.near : SWAP_LIFT.far;
    const timing = {
      duration: SWAP_DURATION,
      delay: pair * SWAP_STEP,
      easing: MOTION_EASE.settle,
    };
    // One passes above the line, the other below, so they do not collide.
    return [
      glyphs[first].animate(swapFrames(distance, lift), timing),
      glyphs[second].animate(swapFrames(-distance, -lift), timing),
    ];
  });
}

const playing = new WeakSet<Element>();

function playBrandHover(link: Element): void {
  if (playing.has(link) || !motionEnabled(link)) return;
  playing.add(link);
  const animations = [...animateMark(link), ...animateWord(link)];
  void Promise.allSettled(animations.map(({ finished }) => finished)).then(
    () => {
      playing.delete(link);
    },
  );
}

/** For the logo's link. A finger's tap leaves the page, so it plays nothing. */
export const brandHoverHandlers = {
  onPointerEnter(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType !== 'touch') playBrandHover(event.currentTarget);
  },
  onFocus(event: React.FocusEvent<HTMLElement>) {
    if (
      motionEnabled(event.currentTarget) &&
      event.currentTarget.matches(':focus-visible')
    ) {
      playBrandHover(event.currentTarget);
    }
  },
};

// ── The flight between the start page and the workspace ─────────────────────

export type BrandPlace = 'start' | 'workspace';

/** Marks the head the flight lands in; `index.css` hides what the copies draw. */
const LANDING_ATTR = 'data-brand-landing';
export const BRAND_GEAR_ATTR = 'data-brand-gear';
export const BRAND_HAIR_ATTR = 'data-brand-hair';

/** The mark's filled seats (`KpLockup`), in the order the letters take them. */
const SEATS = [
  [8, 8],
  [8, 54],
  [8, 100],
  [8, 146],
  [8, 192],
  [54, 100],
  [100, 54],
  [100, 146],
  [146, 8],
  [146, 192],
  [192, 100],
] as const;
const MARK_UNITS = 240;
const SEAT_SIZE = 40;

const GLIDE = MOTION_DURATION.seatGlide;
const LETTER_STAGGER = 22;
const FLIGHT_TOTAL = GLIDE + (SEATS.length - 1) * LETTER_STAGGER;
/** Where in its flight a letter starts to become its seat. */
const LANDING_AT = 0.68;
const SEATS_EMPTY_AFTER = 110;
const LETTER_LIFT = 14;
const PATH_FRAMES = 16;

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface HeadBoxes {
  mark: Box;
  word: Box | null;
  gear: Box | null;
  hair: Box | null;
}

const boxOf = (element: Element | null | undefined): Box | null => {
  if (!element) return null;
  const { x, y, width, height } = element.getBoundingClientRect();
  return { x, y, width, height };
};

function readHead(head: HTMLElement): HeadBoxes | null {
  const mark = boxOf(head.querySelector('.kp-mark'));
  if (!mark) return null;
  const hairElement = head.matches(`[${BRAND_HAIR_ATTR}]`)
    ? head
    : head.querySelector(`[${BRAND_HAIR_ATTR}]`);
  const hair = boxOf(hairElement);
  return {
    mark,
    word: boxOf(head.querySelector('.kp-wordmark-svg')),
    gear: boxOf(head.querySelector(`[${BRAND_GEAR_ATTR}] button`)),
    // The hairline is the bottom edge of what carries it.
    hair: hair && { ...hair, y: hair.y + hair.height - 1, height: 1 },
  };
}

function glideFrames(from: Box, to: Box, baseWidth: number): Keyframe[] {
  const place = ({ x, y, width }: Box) => ({
    transform: `translate(${x}px, ${y}px) scale(${width / baseWidth})`,
  });
  return [place(from), place(to)];
}

interface LetterPoint {
  x: number;
  y: number;
  scale: number;
}

function letterFrames(
  from: LetterPoint,
  to: LetterPoint,
  centreX: number,
  centreY: number,
): Keyframe[] {
  return Array.from({ length: PATH_FRAMES + 1 }, (_, frame) => {
    const progress = frame / PATH_FRAMES;
    const scale = from.scale + (to.scale - from.scale) * progress;
    const x = from.x + (to.x - from.x) * progress;
    const y =
      from.y +
      (to.y - from.y) * progress -
      LETTER_LIFT * 4 * progress * (1 - progress);
    return {
      transform: `translate(${x - centreX * scale}px, ${y - centreY * scale}px) scale(${scale})`,
    };
  });
}

let landFlight: (() => void) | null = null;

/** Ends a flight at once: the real head shows, the copies are gone. */
function landBrandFlight(): void {
  landFlight?.();
  landFlight = null;
}

function isOnScreen({ y, height }: Box): boolean {
  return y + height > 0 && y < window.innerHeight;
}

function startFlight(
  from: HeadBoxes,
  place: BrandPlace,
  head: HTMLElement,
): void {
  const markElement = head.querySelector<SVGSVGElement>('svg.kp-mark');
  if (!markElement || !isOnScreen(from.mark)) return;
  // `ScrollToTop` does this right after the paint; a head that scrolls with its
  // page has to be measured where it will then stand.
  if (window.scrollY !== 0) {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }
  const to = readHead(head);
  if (!to) return;
  const toWorkspace = place === 'workspace';
  const large = toWorkspace ? from : to;
  const small = toWorkspace ? to : from;
  const largeWord = large.word;
  if (!largeWord) return;

  const layer = document.createElement('div');
  layer.className = 'kp-flight';
  layer.setAttribute('aria-hidden', 'true');
  const animations: Animation[] = [];

  const page = head.parentElement;
  if (page) {
    animations.push(
      page.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: MOTION_DURATION.layer,
        easing: 'linear',
        fill: 'backwards',
      }),
    );
  }

  // The head's row: the gear and the hairline glide with the mark.
  const glide = {
    duration: GLIDE,
    easing: MOTION_EASE.settle,
    fill: 'both',
  } as const;
  const gearButton = head.querySelector(`[${BRAND_GEAR_ATTR}] button`);
  if (gearButton && from.gear && to.gear) {
    const gear = inertCopy(gearButton, ['title', 'aria-haspopup']);
    layer.append(gear);
    animations.push(
      gear.animate(glideFrames(from.gear, to.gear, to.gear.width), glide),
    );
  }
  if (from.hair && to.hair) {
    const baseWidth = Math.max(from.hair.width, to.hair.width);
    const hair = document.createElement('div');
    hair.className = 'kp-flight-hair';
    hair.style.width = `${baseWidth}px`;
    layer.append(hair);
    const line = ({ x, y, width }: Box) => ({
      transform: `translate(${x}px, ${y}px) scaleX(${width / baseWidth})`,
    });
    animations.push(hair.animate([line(from.hair), line(to.hair)], glide));
  }

  const baseSize = large.mark.width;
  const mark = inertCopy(markElement);
  mark.style.width = `${baseSize}px`;
  mark.style.height = `${baseSize}px`;
  layer.append(mark);
  animations.push(
    mark.animate(glideFrames(from.mark, to.mark, baseSize), glide),
  );

  const letters = WORDMARK_GLYPHS.map(({ char }) => {
    const letter = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg',
    );
    letter.setAttribute('class', 'kp-flight-letter');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', WORDMARK_GLYPH_PATHS[char]);
    path.setAttribute('transform', 'scale(1 -1)');
    letter.append(path);
    layer.append(letter);
    return { letter, path };
  });
  document.body.append(layer);
  head.setAttribute(LANDING_ATTR, '');

  const wordScale = largeWord.width / WORDMARK_WIDTH;
  const baseline = largeWord.y + largeWord.height;
  const seatSize = (SEAT_SIZE / MARK_UNITS) * small.mark.width;
  const accent = mark.querySelector('.kp-accent');
  const accentColour = accent ? getComputedStyle(accent).fill : '';
  const seatTiming = {
    duration: FLIGHT_TOTAL,
    easing: 'linear',
    fill: 'both',
  } as const;

  letters.forEach(({ letter, path }, index) => {
    const box = path.getBBox();
    const centreX = box.x + box.width / 2;
    // The path is drawn upside down, as font units count upward.
    const centreY = -(box.y + box.height / 2);
    const [seatX, seatY] = SEATS[index];
    const inWord: LetterPoint = {
      x: largeWord.x + (WORDMARK_GLYPHS[index].x + centreX) * wordScale,
      y: baseline + centreY * wordScale,
      scale: wordScale,
    };
    const inSeat: LetterPoint = {
      x:
        small.mark.x +
        ((seatX + SEAT_SIZE / 2) / MARK_UNITS) * small.mark.width,
      y:
        small.mark.y +
        ((seatY + SEAT_SIZE / 2) / MARK_UNITS) * small.mark.width,
      scale: (seatSize * 0.92) / Math.max(box.width, box.height),
    };
    const seat = mark.querySelector(
      `.kp-k rect[x="${seatX}"][y="${seatY}"], rect.kp-accent[x="${seatX}"][y="${seatY}"]`,
    );
    const isLast = index === SEATS.length - 1;
    const wordColour = getComputedStyle(letter).color;

    if (toWorkspace) {
      const delay = index * LETTER_STAGGER;
      const timing = { delay, duration: GLIDE, fill: 'both' } as const;
      animations.push(
        letter.animate(letterFrames(inWord, inSeat, centreX, centreY), {
          ...timing,
          easing: MOTION_EASE.settle,
        }),
        letter.animate(
          [
            { opacity: 1, offset: 0 },
            { opacity: 1, offset: LANDING_AT },
            { opacity: 0, offset: 1 },
          ],
          { ...timing, easing: 'linear' },
        ),
      );
      if (isLast) {
        animations.push(
          letter.animate([{ fill: wordColour }, { fill: accentColour }], {
            delay: delay + 100,
            duration: 220,
            fill: 'both',
          }),
        );
      }
      const seatFrames: Keyframe[] = [
        { opacity: 1, offset: 0 },
        { opacity: 0, offset: SEATS_EMPTY_AFTER / FLIGHT_TOTAL },
        {
          opacity: 0,
          offset: Math.max(
            (delay + GLIDE * LANDING_AT) / FLIGHT_TOTAL,
            SEATS_EMPTY_AFTER / FLIGHT_TOTAL,
          ),
        },
        { opacity: 1, offset: (delay + GLIDE) / FLIGHT_TOTAL },
      ];
      if (seat) animations.push(seat.animate(seatFrames, seatTiming));
    } else {
      // All rise at once from where the mark stands now, and arrive in turn.
      const duration = GLIDE + index * LETTER_STAGGER;
      animations.push(
        letter.animate(letterFrames(inSeat, inWord, centreX, centreY), {
          duration,
          easing: MOTION_EASE.settle,
          fill: 'both',
        }),
        letter.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 90,
          easing: 'linear',
          fill: 'both',
        }),
      );
      if (isLast) {
        animations.push(
          letter.animate([{ fill: accentColour }, { fill: wordColour }], {
            delay: 80,
            duration: 220,
            fill: 'both',
          }),
        );
      }
      const seatFrames: Keyframe[] = [
        { opacity: 1, offset: 0 },
        { opacity: 0, offset: 90 / FLIGHT_TOTAL },
        { opacity: 0, offset: 0.72 },
        { opacity: 1, offset: 1 },
      ];
      if (seat) animations.push(seat.animate(seatFrames, seatTiming));
    }
  });

  // As in `useSeatFlight`: an animation counts from the frame drawn before this
  // commit, and a new page's commit is long. Everything waits where it starts
  // until the frame after the first one that shows it.
  animations.forEach((animation) => animation.pause());
  let takeOff = requestAnimationFrame(() => {
    takeOff = requestAnimationFrame(() => {
      animations.forEach((animation) => animation.play());
    });
  });

  const land = () => {
    cancelAnimationFrame(takeOff);
    window.removeEventListener('resize', landBrandFlight);
    animations.forEach((animation) => animation.cancel());
    layer.remove();
    head.removeAttribute(LANDING_ATTR);
  };
  landFlight = land;
  // Nothing measured holds once the window has another size.
  window.addEventListener('resize', landBrandFlight);
  Promise.all(animations.map(({ finished }) => finished)).then(
    () => {
      if (landFlight === land) landBrandFlight();
    },
    // Cancelled by the landing itself.
    () => {},
  );
}

let departure: { place: BrandPlace; boxes: HeadBoxes } | null = null;

/**
 * Hands the logo from the head leaving to the head arriving. React removes the
 * old head and mounts the new one in the same commit, the old one still laid
 * out when its cleanup runs: `BrowserRouter` changes the route in a transition,
 * so the old page stays until the new one is ready. Only the two heads with a
 * `place` take part, and the same place again (StrictMode's second run of an
 * effect, a change of language) is no flight.
 */
export function useBrandFlight(
  headRef: React.RefObject<HTMLElement | null>,
  place: BrandPlace | null,
): void {
  React.useLayoutEffect(() => {
    const head = headRef.current;
    const arrived = departure;
    departure = null;
    if (!place || arrived?.place !== place) {
      landBrandFlight();
      if (arrived && place && head && motionEnabled(head)) {
        startFlight(arrived.boxes, place, head);
      }
    }
    return () => {
      if (!place || !head || !motionEnabled(head)) return;
      const boxes = readHead(head);
      if (!boxes) return;
      const leaving = { place, boxes };
      departure = leaving;
      // No head arrived in this commit: nothing to land in, and no flight left.
      queueMicrotask(() => {
        if (departure !== leaving) return;
        departure = null;
        landBrandFlight();
      });
    };
  }, [headRef, place]);
}
