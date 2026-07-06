// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import {
  WarningCircleIcon,
  CheckCircleIcon,
  InfoIcon,
  ShieldWarningIcon,
  XIcon,
} from '@phosphor-icons/react';

import {
  dismissToast,
  subscribeToToasts,
  type ToastInstance,
  type ToastEvent,
} from '@/utils/ui/toast';
import {
  quietIconButtonClass,
  toastAccentClass,
  toastIconClass,
  toastSurfaceClass,
} from '@/utils';

const ICON_SIZE = 18;

const iconMap = {
  success: CheckCircleIcon,
  error: WarningCircleIcon,
  info: InfoIcon,
  warning: WarningCircleIcon,
  critical: ShieldWarningIcon,
} as const;

interface ToastProviderProps {
  children: React.ReactNode;
}

function ToastItem({ toast }: { toast: ToastInstance }): React.JSX.Element {
  const Icon = iconMap[toast.type] ?? InfoIcon;

  return (
    <div
      role="status"
      className={`${toastSurfaceClass} pointer-events-auto`}
      data-testid="toast-item"
      data-tone={toast.type}
    >
      <span aria-hidden="true" className={toastAccentClass} />
      <div aria-hidden="true" className={toastIconClass}>
        <Icon size={ICON_SIZE} />
      </div>
      <div className="flex-1 text-sm leading-5">
        {toast.message}
        {toast.action && (
          <button
            type="button"
            className="mt-2 block rounded-md bg-white/20 px-3 py-1.5 text-xs font-semibold hover:bg-white/30 focus:outline text-inherit dark:bg-white/10 dark:hover:bg-white/20"
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
        aria-label="Toast schließen"
        className={`${quietIconButtonClass} -mr-1 shrink-0`}
        onClick={() => {
          toast.onDismiss?.();
          dismissToast(toast.id);
        }}
      >
        <XIcon aria-hidden="true" size={ICON_SIZE} />
      </button>
    </div>
  );
}

function handleAddEvent(
  event: Extract<ToastEvent, { action: 'add' }>,
  setToasts: React.Dispatch<React.SetStateAction<ToastInstance[]>>,
  timers: React.MutableRefObject<Map<string, number>>,
) {
  setToasts((prev) => {
    const filtered = prev.filter((item) => item.id !== event.toast.id);
    return [...filtered, event.toast];
  });

  // Reset timer if toast is re-added with same id
  const existingTimer = timers.current.get(event.toast.id);
  if (existingTimer) {
    window.clearTimeout(existingTimer);
    timers.current.delete(event.toast.id);
  }

  if (event.toast.duration > 0) {
    const timeoutId = window.setTimeout(() => {
      timers.current.delete(event.toast.id);
      dismissToast(event.toast.id);
    }, event.toast.duration);

    timers.current.set(event.toast.id, timeoutId);
  }
}

function handleDismissEvent(
  id: string,
  setToasts: React.Dispatch<React.SetStateAction<ToastInstance[]>>,
  timers: React.MutableRefObject<Map<string, number>>,
) {
  const timer = timers.current.get(id);
  if (timer) {
    window.clearTimeout(timer);
    timers.current.delete(id);
  }

  setToasts((prev) => prev.filter((toast) => toast.id !== id));
}

function handleDismissAll(
  setToasts: React.Dispatch<React.SetStateAction<ToastInstance[]>>,
  timers: React.MutableRefObject<Map<string, number>>,
) {
  timers.current.forEach((timer) => window.clearTimeout(timer));
  timers.current.clear();
  setToasts([]);
}

export function ToastProvider({
  children,
}: ToastProviderProps): React.JSX.Element {
  const [toasts, setToasts] = React.useState<ToastInstance[]>([]);
  const timers = React.useRef(new Map<string, number>());

  React.useEffect(() => {
    const timerMap = timers.current;
    const unsubscribe = subscribeToToasts((event) => {
      switch (event.action) {
        case 'add':
          handleAddEvent(event, setToasts, timers);
          break;
        case 'dismiss':
          handleDismissEvent(event.id, setToasts, timers);
          break;
        case 'dismissAll':
          handleDismissAll(setToasts, timers);
          break;
      }
    });

    return () => {
      unsubscribe();
      timerMap.forEach((timer) => window.clearTimeout(timer));
      timerMap.clear();
    };
  }, []);

  return (
    <>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-4 top-6 z-9999 mx-auto flex max-h-svh flex-col items-end gap-3 sm:inset-x-auto sm:right-6"
        data-testid="toast-container"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </div>
    </>
  );
}
