export interface ScheduleIdleTaskOptions {
  timeout?: number;
  fallbackDelay?: number;
}

export const scheduleIdleTask = (
  task: () => void,
  { timeout, fallbackDelay = 100 }: ScheduleIdleTaskOptions = {},
): void => {
  if (typeof window === 'undefined') {
    setTimeout(task, fallbackDelay);
    return;
  }

  const idleWindow = window as Window & {
    requestIdleCallback?: (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions,
    ) => number;
  };

  if (typeof idleWindow.requestIdleCallback === 'function') {
    idleWindow.requestIdleCallback(
      () => {
        task();
      },
      typeof timeout === 'number' ? { timeout } : undefined,
    );
    return;
  }

  setTimeout(task, fallbackDelay);
};
