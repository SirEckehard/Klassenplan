// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import equal from 'fast-deep-equal';
import { XIcon } from '@phosphor-icons/react';
import {
  menuSurfaceClass,
  primaryButtonClass,
  quietIconButtonClass,
  secondaryButtonClass,
} from '@/utils';
import {
  useDialogLayer,
  useOtherDialogLayerOpen,
} from '@/hooks/ui/useDialogLayer';
import { usePrefersReducedMotion } from '@/hooks/ui/usePrefersReducedMotion';
import {
  inertCopy,
  MOTION_DURATION,
  MOTION_EASE,
  motionEnabled,
} from '@/utils/ui/motion';
import {
  useOnboardingTour,
  type TourId,
} from '@/hooks/onboarding/onboardingTourStore';
import {
  LAYER_LOADING_ATTRIBUTE,
  TOURS,
  findTourAnchor,
  type TourMark,
} from './tours';

/** Room between the highlighted element and the ring drawn around it. */
const SPOTLIGHT_PADDING = 6;
const POPOVER_GAP = 12;
const VIEWPORT_GUTTER = 16;
const POPOVER_MAX_WIDTH = 320;
/**
 * A due tour checks for its elements this often and starts once they have been
 * on screen for two checks in a row. The steps load lazily and the class data
 * arrives after the first paint; a tour started on the first frame would point
 * at a layout that is still moving.
 */
const ANCHOR_POLL_MS = 250;
const ANCHOR_SETTLE_CHECKS = 2;
/** Catches layout shifts that fire no scroll or resize event (a sidebar expanding). */
const REMEASURE_MS = 400;

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Where the card stands against its element: beside it, or over its foot. */
type PopoverSide = 'below' | 'above' | 'over';

interface CoachMarkLayout {
  /** The element the mark points at; another one is the next mark. */
  anchor: TourMark['anchor'];
  spotlight: Box;
  popover: Omit<Box, 'height'>;
  side: PopoverSide;
}

interface TourRun {
  id: TourId;
  /** The marks whose elements were on screen when the tour started. */
  marks: readonly TourMark[];
  index: number;
}

/**
 * Below the element when the popover fits there, above when it fits there,
 * otherwise pinned to the bottom edge on top of the element.
 */
function placePopover(
  target: Box,
  popoverHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): Pick<CoachMarkLayout, 'popover' | 'side'> {
  const width = Math.min(
    POPOVER_MAX_WIDTH,
    viewportWidth - 2 * VIEWPORT_GUTTER,
  );
  const lowestTop = Math.max(
    VIEWPORT_GUTTER,
    viewportHeight - VIEWPORT_GUTTER - popoverHeight,
  );
  const below = target.top + target.height + POPOVER_GAP;
  const above = target.top - POPOVER_GAP - popoverHeight;
  const side: PopoverSide =
    below <= lowestTop ? 'below' : above >= VIEWPORT_GUTTER ? 'above' : 'over';
  const top = side === 'below' ? below : side === 'above' ? above : lowestTop;
  const centred = target.left + target.width / 2 - width / 2;
  const left = Math.min(
    Math.max(centred, VIEWPORT_GUTTER),
    Math.max(VIEWPORT_GUTTER, viewportWidth - VIEWPORT_GUTTER - width),
  );
  return { popover: { top, left, width }, side };
}

/**
 * Where spotlight and popover go, kept current while the page scrolls, resizes
 * or shifts. Reports a mark whose element has left the screen.
 */
function useCoachMarkLayout(
  mark: TourMark,
  popoverRef: React.RefObject<HTMLDivElement | null>,
  onAnchorLost: () => void,
): CoachMarkLayout | null {
  const [layout, setLayout] = React.useState<CoachMarkLayout | null>(null);
  const onAnchorLostRef = React.useRef(onAnchorLost);

  React.useEffect(() => {
    onAnchorLostRef.current = onAnchorLost;
  });

  React.useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const element = findTourAnchor(mark.anchor);
      if (!element) {
        onAnchorLostRef.current();
        return;
      }
      const rect = element.getBoundingClientRect();
      const spotlight = {
        top: rect.top - SPOTLIGHT_PADDING,
        left: rect.left - SPOTLIGHT_PADDING,
        width: rect.width + 2 * SPOTLIGHT_PADDING,
        height: rect.height + 2 * SPOTLIGHT_PADDING,
      };
      const next = {
        anchor: mark.anchor,
        spotlight,
        ...placePopover(
          spotlight,
          popoverRef.current?.offsetHeight ?? 0,
          window.innerWidth,
          window.innerHeight,
        ),
      };
      setLayout((previous) =>
        previous && equal(previous, next) ? previous : next,
      );
    };
    const schedule = () => {
      if (frame === 0) {
        frame = window.requestAnimationFrame(measure);
      }
    };

    schedule();
    const interval = window.setInterval(schedule, REMEASURE_MS);
    window.addEventListener('resize', schedule);
    // Capture phase: scrolling any container moves the element as well.
    window.addEventListener('scroll', schedule, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(interval);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
    };
  }, [mark.anchor, popoverRef]);

  return layout;
}

/** The ring's box, or the card's corner, as keyframe values. */
const pixels = (box: Partial<Box>) =>
  Object.fromEntries(
    Object.entries(box).map(([key, value]) => [key, `${value}px`]),
  );

/** Where an element stands on screen right now, a running animation included. */
function boxOnScreen(element: HTMLElement): Box {
  const { top, left, width, height } = element.getBoundingClientRect();
  return { top, left, width, height };
}

/**
 * How a coach mark moves. It comes in as a menu does — the dimmed page and the
 * ring fading in, the card sliding the last few pixels from its element's
 * side; on to another mark, ring and card glide there together, the card's
 * words already the next ones; closed, it is gone at once and a copy fades out
 * where it stood. Following the page as it scrolls or resizes is no move: there
 * both stand where they belong at once — unless they are still gliding, when
 * they glide on to where the element went in the time that is left. A glide
 * always sets out from where ring and card stand, so "Weiter" pressed again
 * mid-way turns them without a jump.
 */
function useCoachMarkMotion(
  layout: CoachMarkLayout | null,
  spotlightRef: React.RefObject<HTMLDivElement | null>,
  popoverRef: React.RefObject<HTMLDivElement | null>,
) {
  const shownRef = React.useRef<CoachMarkLayout | null>(null);
  const glideRef = React.useRef<Animation[]>([]);

  React.useLayoutEffect(() => {
    const spotlight = spotlightRef.current;
    const popover = popoverRef.current;
    const shown = shownRef.current;
    if (!layout || !spotlight || !popover || layout === shown) return;
    shownRef.current = layout;
    if (!motionEnabled(popover)) return;
    if (!shown) {
      const timing = {
        duration: MOTION_DURATION.menuIn,
        easing: MOTION_EASE.arrive,
      };
      spotlight.animate([{ opacity: 0 }, { opacity: 1 }], timing);
      popover.animate(
        [
          {
            opacity: 0,
            transform: `translateY(${layout.side === 'below' ? -4 : 4}px)`,
          },
          { opacity: 1, transform: 'none' },
        ],
        timing,
      );
      return;
    }

    const gliding = glideRef.current.filter(
      (animation) => animation.playState === 'running',
    );
    if (shown.anchor === layout.anchor && gliding.length === 0) return;
    let duration: number = MOTION_DURATION.coachMark;
    let from = { spotlight: shown.spotlight, popover: shown.popover };
    if (gliding.length > 0) {
      // The glide still holds both where they are on screen; read them
      // there before letting go of it.
      from = {
        spotlight: boxOnScreen(spotlight),
        popover: boxOnScreen(popover),
      };
      if (shown.anchor === layout.anchor) {
        const elapsed = gliding[0].currentTime;
        duration -= typeof elapsed === 'number' ? elapsed : 0;
      }
      for (const animation of gliding) animation.cancel();
    }
    glideRef.current = [];
    if (duration <= 0) return;
    const timing = { duration, easing: MOTION_EASE.settle };
    const corner = (box: Omit<Box, 'height'>) =>
      pixels({ top: box.top, left: box.left });
    glideRef.current = [
      spotlight.animate(
        [pixels(from.spotlight), pixels(layout.spotlight)],
        timing,
      ),
      popover.animate([corner(from.popover), corner(layout.popover)], timing),
    ];
  }, [layout, popoverRef, spotlightRef]);

  React.useLayoutEffect(() => {
    const spotlight = spotlightRef.current;
    const popover = popoverRef.current;
    if (!spotlight || !popover) return undefined;
    return () => {
      if (!shownRef.current || !motionEnabled(popover)) return;
      // Copied where they stand, which mid-glide is not where they were going.
      const copies = [spotlight, popover].map((element) => {
        const copy = inertCopy(element);
        Object.assign(copy.style, pixels(boxOnScreen(element)));
        return copy;
      });
      // StrictMode rehearses an unmount and keeps the mark; only one that
      // really left fades out.
      queueMicrotask(() => {
        if (popover.isConnected) return;
        for (const copy of copies) {
          document.body.appendChild(copy);
          copy
            .animate([{ opacity: 1 }, { opacity: 0 }], {
              duration: MOTION_DURATION.menuOut,
              easing: MOTION_EASE.leave,
              fill: 'forwards',
            })
            .finished.then(
              () => copy.remove(),
              () => copy.remove(),
            );
        }
      });
    };
  }, [popoverRef, spotlightRef]);
}

interface CoachMarkProps {
  mark: TourMark;
  position: number;
  total: number;
  onBack: () => void;
  onNext: () => void;
  onClose: () => void;
  onSkip: () => void;
}

function CoachMark({
  mark,
  position,
  total,
  onBack,
  onNext,
  onClose,
  onSkip,
}: CoachMarkProps) {
  const { t } = useTranslation('generator');
  const prefersReducedMotion = usePrefersReducedMotion();
  const popoverRef = React.useRef<HTMLDivElement | null>(null);
  const spotlightRef = React.useRef<HTMLDivElement | null>(null);
  const titleId = React.useId();
  const bodyId = React.useId();
  // A mark whose element disappears (the teacher deleted the last student,
  // say) hands over to the next one instead of pointing at nothing.
  const layout = useCoachMarkLayout(mark, popoverRef, onNext);
  useCoachMarkMotion(layout, spotlightRef, popoverRef);
  const isPlaced = layout !== null;
  const isLast = position === total;

  // Focus returns to where it was before the tour — unless the teacher has
  // moved it somewhere else in the meantime (into a dialog that just opened).
  React.useEffect(() => {
    const popover = popoverRef.current;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    return () => {
      const active = document.activeElement;
      const focusWasInTour =
        active === null ||
        active === document.body ||
        (popover?.contains(active) ?? false);
      if (focusWasInTour && previous && document.contains(previous)) {
        previous.focus({ preventScroll: true });
      }
    };
  }, []);

  React.useEffect(() => {
    findTourAnchor(mark.anchor)?.scrollIntoView?.({
      block: 'center',
      inline: 'nearest',
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  }, [mark.anchor, prefersReducedMotion]);

  // Focus follows the marks so a screen reader announces each one. A hidden
  // element cannot take focus, hence the wait for the first placement.
  React.useEffect(() => {
    if (isPlaced) {
      popoverRef.current?.focus({ preventScroll: true });
    }
  }, [mark.anchor, isPlaced]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return createPortal(
    <>
      {/* There from the start, unseen until placed, so the motion holds
          the element it fades out. */}
      <div
        ref={spotlightRef}
        aria-hidden="true"
        className="tour-spotlight pointer-events-none fixed z-50"
        style={layout ? layout.spotlight : { visibility: 'hidden' }}
      />
      <div
        ref={popoverRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        className={`${menuSurfaceClass} fixed z-50 flex flex-col gap-3 p-4! shadow-2xl focus:outline-none`}
        style={
          layout
            ? layout.popover
            : {
                top: VIEWPORT_GUTTER,
                left: VIEWPORT_GUTTER,
                width: POPOVER_MAX_WIDTH,
                visibility: 'hidden',
              }
        }
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-orange-600">
              {t('tour.stepCounter', { current: position, total })}
            </p>
            <h2
              id={titleId}
              className="mt-0.5 text-base font-semibold text-(--text-page)"
            >
              {t(`${mark.textKey}.title`)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`${quietIconButtonClass} shrink-0`}
            aria-label={t('tour.close')}
            title={t('tour.close')}
          >
            <XIcon size={16} aria-hidden="true" />
          </button>
        </div>
        <p id={bodyId} className="text-sm leading-relaxed text-(--text-muted)">
          {t(`${mark.textKey}.body`)}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="cursor-pointer rounded text-xs font-medium text-(--text-muted) underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)"
          >
            {t('tour.skip')}
          </button>
          <div className="flex gap-2">
            {position > 1 && (
              <button
                type="button"
                onClick={onBack}
                className={`${secondaryButtonClass} h-9 px-3`}
              >
                {t('tour.back')}
              </button>
            )}
            <button
              type="button"
              onClick={onNext}
              className={`${primaryButtonClass} h-9 px-3`}
            >
              {isLast ? t('tour.finish') : t('tour.next')}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

type OnboardingTourProps = {
  /** The tour for what the wizard shows right now (`resolveTourId`). */
  tourId: TourId | null;
};

/**
 * Coach marks for a first visit.
 *
 * Runs the tour for the current wizard context once — or again when the Help
 * dialog asks for it — and stays out of the way otherwise: it never blocks the
 * page (the dimmed backdrop lets clicks through), it waits while any other
 * overlay is open, and it hides behind a dialog that opens on top of it.
 * Leaving the step ends it.
 */
export default function OnboardingTour({ tourId }: OnboardingTourProps) {
  const { isTourDue, markTourSeen, skipTours } = useOnboardingTour();
  const [run, setRun] = React.useState<TourRun | null>(null);
  const [runTourId, setRunTourId] = React.useState(tourId);
  if (runTourId !== tourId) {
    setRunTourId(tourId);
    setRun(null);
  }

  const layerId = React.useId();
  const otherOverlayOpen = useOtherDialogLayerOpen(layerId);
  const visible = run !== null && !otherOverlayOpen;
  // While visible the tour owns Escape, and views that react to it stand down.
  useDialogLayer(visible, layerId);

  const due = tourId !== null && isTourDue(tourId);

  React.useEffect(() => {
    if (!due || run !== null || otherOverlayOpen || tourId === null) {
      return;
    }
    let settledChecks = 0;
    let previousAnchors = '';
    const timer = window.setInterval(() => {
      // A layer still loading shows its skeleton, while the header and the
      // status bar already carry some of its marks: started then, the tour
      // would keep only those and count as seen.
      if (document.querySelector(`[${LAYER_LOADING_ATTRIBUTE}]`)) {
        settledChecks = 0;
        previousAnchors = '';
        return;
      }
      const marks = TOURS[tourId].filter(
        (mark) => findTourAnchor(mark.anchor) !== null,
      );
      // It starts once the same marks are found twice in a row.
      const anchors = marks.map((mark) => mark.anchor).join(' ');
      settledChecks =
        marks.length === 0
          ? 0
          : anchors === previousAnchors
            ? settledChecks + 1
            : 1;
      previousAnchors = anchors;
      if (settledChecks < ANCHOR_SETTLE_CHECKS) {
        return;
      }
      window.clearInterval(timer);
      // Seen as soon as it shows (see onboardingTourStore).
      markTourSeen(tourId);
      setRun({ id: tourId, marks, index: 0 });
    }, ANCHOR_POLL_MS);
    return () => window.clearInterval(timer);
  }, [due, run, otherOverlayOpen, tourId, markTourSeen]);

  const move = React.useCallback((direction: 1 | -1) => {
    setRun((current) => {
      if (!current) {
        return current;
      }
      for (
        let index = current.index + direction;
        index >= 0 && index < current.marks.length;
        index += direction
      ) {
        if (findTourAnchor(current.marks[index].anchor)) {
          return { ...current, index };
        }
      }
      // Nothing left ahead ends the tour; nothing left behind stays put.
      return direction === 1 ? null : current;
    });
  }, []);
  const handleBack = React.useCallback(() => move(-1), [move]);
  const handleNext = React.useCallback(() => move(1), [move]);
  const handleClose = React.useCallback(() => setRun(null), []);
  const handleSkip = React.useCallback(() => {
    skipTours();
    setRun(null);
  }, [skipTours]);

  if (!visible || !run) {
    return null;
  }

  return (
    <CoachMark
      mark={run.marks[run.index]}
      position={run.index + 1}
      total={run.marks.length}
      onBack={handleBack}
      onNext={handleNext}
      onClose={handleClose}
      onSkip={handleSkip}
    />
  );
}
