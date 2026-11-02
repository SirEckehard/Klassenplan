// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  WarningCircleIcon,
  WarningIcon,
  CheckCircleIcon,
  InfoIcon,
  ShieldWarningIcon,
  XIcon,
} from '@phosphor-icons/react';

import {
  dismissToast,
  subscribeToToasts,
  type ToastInstance,
} from '@/utils/ui/toast';
import {
  quietIconButtonClass,
  toastActionClass,
  toastIconClass,
  toastSurfaceClass,
  toastTimelineClass,
} from '@/utils';
import { DRAG_THRESHOLD_PX } from '@/hooks/ui/useDragGesture';
import {
  animateToastBack,
  animateToastIn,
  animateToastNudge,
  animateToastOut,
  type SwipeOffset,
} from './toastMotion';
import { motionEnabled } from '@/utils/ui/motion';
import { measureToastDock, type ToastDock } from '@/hooks/ui/toastDock';
import { useCookieBannerOffset } from '@/hooks/ui/useCookieBannerOffset';

const ICON_SIZE = 18;
const CLOSE_ICON_SIZE = 16;

const iconMap = {
  success: CheckCircleIcon,
  error: WarningCircleIcon,
  info: InfoIcon,
  warning: WarningIcon,
  critical: ShieldWarningIcon,
} as const;

/** A swipe that carries a card this far sideways puts it away … */
const SWIPE_DISTANCE_PX = 90;
/** … or this far down, towards the bar it rose from … */
const SWIPE_DOWN_PX = 48;
/** … and so does a flick faster than this (px per ms) past a few pixels. */
const SWIPE_VELOCITY = 0.45;
const SWIPE_FLICK_MIN_PX = 24;
const SWIPE_DOWN_FLICK_MIN_PX = 16;

/** On a touch screen a 28px button gets a 44px target around it. */
const COARSE_HIT_AREA =
  "pointer-coarse:before:absolute pointer-coarse:before:-inset-2 pointer-coarse:before:content-['']";

interface ToastEntry {
  /** React's key: a card gliding out and a new one under its id are two. */
  key: number;
  toast: ToastInstance;
  /** Counts the times the same id came again: its time starts anew. */
  revision: number;
  /** Gliding out — still on screen, but gone for assistive technology. */
  leaving: boolean;
}

interface Swipe {
  pointerId: number;
  startX: number;
  startY: number;
  /** Which way the card follows, settled once the pointer has moved. */
  axis: 'x' | 'y' | null;
  offset: SwipeOffset;
  lastX: number;
  lastY: number;
  lastTime: number;
  velocity: number;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

/** The newest toast goes on top; the same id again keeps its place. */
function addEntry(
  entries: ToastEntry[],
  toast: ToastInstance,
  key: number,
): ToastEntry[] {
  const index = entries.findIndex(
    (entry) => !entry.leaving && entry.toast.id === toast.id,
  );
  if (index === -1) {
    return [{ key, toast, revision: 0, leaving: false }, ...entries];
  }
  return entries.map((entry, i) =>
    i === index ? { ...entry, toast, revision: entry.revision + 1 } : entry,
  );
}

/**
 * Lets the matching toasts go: with motion they glide out first and the card
 * reports back (`onExited`), without it they are gone at once.
 */
function leaveEntries(
  entries: ToastEntry[],
  matches: (toast: ToastInstance) => boolean,
  animate: boolean,
): ToastEntry[] {
  if (!entries.some((entry) => !entry.leaving && matches(entry.toast))) {
    return entries;
  }
  return animate
    ? entries.map((entry) =>
        !entry.leaving && matches(entry.toast)
          ? { ...entry, leaving: true }
          : entry,
      )
    : entries.filter((entry) => entry.leaving || !matches(entry.toast));
}

/**
 * Dismisses a toast once its duration has run, counting only the time it was
 * not paused. A repeat of its id (`revision`) starts the count again.
 */
function useToastClock(
  id: string,
  duration: number,
  revision: number,
  paused: boolean,
): void {
  const remaining = React.useRef(duration);

  React.useEffect(() => {
    remaining.current = duration;
  }, [duration, revision]);

  React.useEffect(() => {
    // A non-finite duration reads as "never auto-dismiss", but setTimeout
    // clamps it to a 32-bit int and would fire after roughly a millisecond.
    if (paused || !Number.isFinite(duration) || duration <= 0) return undefined;
    const startedAt = Date.now();
    const timeoutId = window.setTimeout(
      () => dismissToast(id),
      Math.max(0, remaining.current),
    );
    return () => {
      window.clearTimeout(timeoutId);
      remaining.current -= Date.now() - startedAt;
    };
  }, [id, duration, revision, paused]);
}

/** A toast's time stands still while the page is in the background. */
function usePageHidden(): boolean {
  const [hidden, setHidden] = React.useState(
    () => document.visibilityState === 'hidden',
  );

  React.useEffect(() => {
    const update = () => setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  return hidden;
}

interface ToastItemProps {
  entry: ToastEntry;
  paused: boolean;
  zIndex: number;
  onExited: (key: number) => void;
  onSwipeChange: (swiping: boolean) => void;
}

function ToastItem({
  entry,
  paused,
  zIndex,
  onExited,
  onSwipeChange,
}: ToastItemProps): React.JSX.Element {
  const { t } = useTranslation('common');
  const { key, toast, revision, leaving } = entry;
  const cardRef = React.useRef<HTMLDivElement>(null);
  const swipeRef = React.useRef<Swipe | null>(null);
  const swipedBy = React.useRef<SwipeOffset | undefined>(undefined);
  // A swipe ends in a click on the card; that click must not close it.
  const swipeEnded = React.useRef(false);
  const Icon = iconMap[toast.type] ?? InfoIcon;
  // Errors interrupt the screen reader (role="alert" implies assertive);
  // everything else is announced politely via role="status".
  const isUrgent = toast.type === 'error' || toast.type === 'critical';
  const timed = Number.isFinite(toast.duration) && toast.duration > 0;
  const stopped = paused || leaving;

  useToastClock(toast.id, toast.duration, revision, stopped);

  React.useLayoutEffect(() => {
    const card = cardRef.current;
    if (card && motionEnabled()) animateToastIn(card);
  }, []);

  React.useLayoutEffect(() => {
    const card = cardRef.current;
    if (revision > 0 && card && motionEnabled()) animateToastNudge(card);
  }, [revision]);

  React.useLayoutEffect(() => {
    const card = cardRef.current;
    if (!leaving || !card) return undefined;
    let current = true;
    const done = () => {
      if (current) onExited(key);
    };
    if (motionEnabled()) {
      animateToastOut(card, swipedBy.current).then(done, done);
    } else {
      done();
    }
    return () => {
      current = false;
    };
  }, [leaving, key, onExited]);

  const close = () => {
    toast.onDismiss?.();
    dismissToast(toast.id);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    swipeEnded.current = false;
    if (leaving || event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest('button')) {
      return;
    }
    // A mouse would otherwise start selecting the message's text.
    if (event.pointerType === 'mouse') event.preventDefault();
    if (typeof event.currentTarget.setPointerCapture === 'function') {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    swipeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      axis: null,
      offset: { x: 0, y: 0 },
      lastX: event.clientX,
      lastY: event.clientY,
      lastTime: event.timeStamp,
      velocity: 0,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const swipe = swipeRef.current;
    const card = cardRef.current;
    if (!swipe || !card || swipe.pointerId !== event.pointerId) return;
    const dx = event.clientX - swipe.startX;
    const dy = event.clientY - swipe.startY;
    if (!swipe.axis) {
      const threshold =
        event.pointerType === 'touch'
          ? DRAG_THRESHOLD_PX.touch
          : DRAG_THRESHOLD_PX.mouse;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return;
      swipe.axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      onSwipeChange(true);
    }
    // Sideways the card follows either way; downwards, towards the bar it
    // rose from, it follows too, and upwards it barely gives.
    swipe.offset =
      swipe.axis === 'x'
        ? { x: dx, y: 0 }
        : { x: 0, y: dy > 0 ? dy : dy * 0.2 };
    const elapsed = event.timeStamp - swipe.lastTime;
    if (elapsed > 0) {
      swipe.velocity =
        swipe.axis === 'x'
          ? Math.abs(event.clientX - swipe.lastX) / elapsed
          : (event.clientY - swipe.lastY) / elapsed;
    }
    swipe.lastX = event.clientX;
    swipe.lastY = event.clientY;
    swipe.lastTime = event.timeStamp;
    card.style.transform = `translate(${swipe.offset.x}px, ${swipe.offset.y}px)`;
    const travelled =
      swipe.axis === 'x'
        ? Math.abs(swipe.offset.x) / Math.max(1, card.offsetWidth * 0.9)
        : Math.max(0, swipe.offset.y) / Math.max(1, card.offsetHeight * 1.5);
    card.style.opacity = String(Math.max(0.25, 1 - travelled));
  };

  const endSwipe = (
    event: React.PointerEvent<HTMLDivElement>,
    cancelled: boolean,
  ) => {
    const swipe = swipeRef.current;
    const card = cardRef.current;
    if (!swipe || swipe.pointerId !== event.pointerId) return;
    swipeRef.current = null;
    if (!swipe.axis || !card) return;
    swipeEnded.current = true;
    onSwipeChange(false);
    const { x, y } = swipe.offset;
    const farEnough =
      swipe.axis === 'x'
        ? Math.abs(x) > Math.min(SWIPE_DISTANCE_PX, card.offsetWidth * 0.35) ||
          (swipe.velocity > SWIPE_VELOCITY && Math.abs(x) > SWIPE_FLICK_MIN_PX)
        : y > Math.min(SWIPE_DOWN_PX, card.offsetHeight * 0.8) ||
          (swipe.velocity > SWIPE_VELOCITY && y > SWIPE_DOWN_FLICK_MIN_PX);
    if (farEnough && !cancelled) {
      swipedBy.current = swipe.offset;
      close();
      return;
    }
    // Let go too early, or taken back by the browser: it settles back.
    const from = { x, y, opacity: card.style.opacity || '1' };
    card.style.transform = '';
    card.style.opacity = '';
    if (motionEnabled()) animateToastBack(card, from);
  };

  // A tap anywhere on the card puts it away; only its own button does
  // something else (decision 0037). The close button stays, for the keyboard
  // and as the sign that a card can be put away.
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (swipeEnded.current) {
      swipeEnded.current = false;
      return;
    }
    if (leaving) return;
    if (event.target instanceof Element && event.target.closest('button')) {
      return;
    }
    close();
  };

  return (
    <div
      ref={cardRef}
      role={leaving ? undefined : isUrgent ? 'alert' : 'status'}
      aria-hidden={leaving || undefined}
      inert={leaving}
      className={`${toastSurfaceClass} pointer-events-auto cursor-pointer`}
      style={{ zIndex }}
      data-testid="toast-item"
      data-toast-card=""
      data-tone={toast.type}
      data-paused={stopped ? '' : undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => endSwipe(event, false)}
      onPointerCancel={(event) => endSwipe(event, true)}
      onClick={handleClick}
    >
      <span aria-hidden="true" className={toastIconClass}>
        <Icon size={ICON_SIZE} />
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
        <p className="min-w-0 grow basis-40 py-1 text-sm leading-5">
          {toast.message}
        </p>
        {toast.action && (
          <button
            type="button"
            className={`${toastActionClass} ml-auto shrink-0 ${COARSE_HIT_AREA}`}
            onClick={(e) => {
              e.stopPropagation();
              toast.action?.onClick();
              dismissToast(toast.id);
            }}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        aria-label={t('common.dismissToast')}
        className={`${quietIconButtonClass} relative size-7 shrink-0 p-0! ${COARSE_HIT_AREA}`}
        onClick={close}
      >
        <XIcon aria-hidden="true" size={CLOSE_ICON_SIZE} />
      </button>
      {timed && (
        <span
          // A new key restarts the line when the same message comes again.
          key={revision}
          aria-hidden="true"
          className={toastTimelineClass}
          style={
            { '--toast-duration': `${toast.duration}ms` } as React.CSSProperties
          }
        />
      )}
    </div>
  );
}

/** Whether the pointer still rests on a card — `:hover` may be unsupported. */
function pointerRestsOnCard(stack: HTMLElement): boolean {
  try {
    return stack.querySelector('[data-toast-card]:hover') !== null;
  } catch {
    return false;
  }
}

export function ToastProvider({
  children,
}: ToastProviderProps): React.JSX.Element {
  const [entries, setEntries] = React.useState<ToastEntry[]>([]);
  const nextKey = React.useRef(0);
  const stackRef = React.useRef<HTMLDivElement>(null);
  const [pointerOver, setPointerOver] = React.useState(false);
  const [focusInside, setFocusInside] = React.useState(false);
  const [swiping, setSwiping] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState<{
    id: string;
    message: string;
  } | null>(null);
  const [dock, setDock] = React.useState<ToastDock | null>(null);
  const cookieBannerOffset = useCookieBannerOffset();
  const pageHidden = usePageHidden();
  // Every toast's time stands still while one is pointed at, holds the
  // keyboard focus or is being swiped, and while the page is in the
  // background — a message is not lost while it is being read (WCAG 2.2.1).
  const paused = pointerOver || focusInside || swiping || pageHidden;

  const leave = React.useCallback(
    (matches: (toast: ToastInstance) => boolean) => {
      const animate = motionEnabled();
      setEntries((prev) => leaveEntries(prev, matches, animate));
    },
    [],
  );

  const handleExited = React.useCallback((key: number) => {
    setEntries((prev) => prev.filter((entry) => entry.key !== key));
  }, []);

  React.useEffect(
    () =>
      subscribeToToasts((event) => {
        switch (event.action) {
          case 'add': {
            const key = nextKey.current++;
            setEntries((prev) => addEntry(prev, event.toast, key));
            break;
          }
          case 'announce':
            setAnnouncement({ id: event.id, message: event.message });
            break;
          case 'dismiss':
            leave((toast) => toast.id === event.id);
            break;
          case 'dismissType':
            leave((toast) => toast.type === event.type);
            break;
          case 'dismissAll':
            leave(() => true);
            break;
        }
      }),
    [leave],
  );

  // Where the stack stands is asked anew whenever a card comes or goes and
  // while the window changes with cards on it: the shell's columns and
  // drawers decide it (`toastDock`), and they change with the layout.
  const count = entries.length;
  React.useLayoutEffect(() => {
    if (count === 0) return undefined;
    const update = () => setDock(measureToastDock());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [count]);

  // A card taken away under the pointer or with the focus in it sends
  // neither pointerout nor focusout, so the stack would stay paused for good.
  const previousCount = React.useRef(count);
  React.useEffect(() => {
    const removed = count < previousCount.current;
    previousCount.current = count;
    const stack = stackRef.current;
    if (!removed || !stack) return;
    if (!pointerRestsOnCard(stack)) setPointerOver(false);
    if (!stack.contains(document.activeElement)) setFocusInside(false);
  }, [count]);

  return (
    <>
      {children}
      {/* Over the status bar's middle, just above it, the newest nearest the
          bar (decision 0037): top right they lay over the inspector's head,
          where a teacher was typing. Outside the shell at the bottom of the
          window, above a cookie banner. */}
      <div
        ref={stackRef}
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed z-9999 flex flex-col-reverse items-center gap-3"
        style={{
          left: `calc(${dock?.left ?? 0}px + max(1rem, env(safe-area-inset-left)))`,
          right: `calc(${dock?.right ?? 0}px + max(1rem, env(safe-area-inset-right)))`,
          bottom: dock
            ? `${Math.max(dock.bottom, cookieBannerOffset + 16)}px`
            : `calc(1rem + env(safe-area-inset-bottom) + ${cookieBannerOffset}px)`,
          maxHeight: `calc(100svh - ${dock?.bottom ?? 16}px - 4.5rem)`,
        }}
        data-testid="toast-container"
        onPointerOver={(event) => {
          if (
            event.pointerType !== 'touch' &&
            event.target instanceof Element &&
            event.target.closest('[data-toast-card]')
          ) {
            setPointerOver(true);
          }
        }}
        onPointerOut={(event) => {
          const next = event.relatedTarget;
          if (
            next instanceof Element &&
            next.closest('[data-toast-card]') &&
            event.currentTarget.contains(next)
          ) {
            return;
          }
          setPointerOver(false);
        }}
        onFocus={() => setFocusInside(true)}
        onBlur={(event) => {
          const next = event.relatedTarget;
          if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
            setFocusInside(false);
          }
        }}
      >
        {entries.map((entry, index) => (
          <ToastItem
            key={entry.key}
            entry={entry}
            paused={paused}
            // Newer cards lie above older ones as they glide in, and a card
            // gliding out lies under the ones closing the gap.
            zIndex={entry.leaving ? 0 : entries.length - index}
            onExited={handleExited}
            onSwipeChange={setSwiping}
          />
        ))}
      </div>
      {/* What the screen already shows, said to a screen reader alone
          (`announce`). A new node each time, so the same words twice are
          read twice. */}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement && (
          <span key={announcement.id}>{announcement.message}</span>
        )}
      </div>
    </>
  );
}
