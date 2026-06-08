/**
 * Lightweight manager for route prefetch hints.
 * Ensures we only inject each hint once and keeps logging centralized.
 */
import { logDebug } from '@/utils';
import { prefetchOrchestrator } from '@/utils/performance/prefetchOrchestrator';

type PrefetchImportance = 'auto' | 'low' | 'high';

export type PrefetchHintOptions = {
  as?: HTMLLinkElement['as'];
  crossOrigin?: HTMLLinkElement['crossOrigin'];
  importance?: PrefetchImportance;
};

const registeredHints = new Map<string, HTMLLinkElement>();

const getAbsoluteHref = (href: string): string => {
  if (typeof window === 'undefined') {
    return href;
  }

  try {
    return new URL(href, window.location.href).toString();
  } catch {
    return href;
  }
};

export const addPrefetchHint = (
  href: string,
  options: PrefetchHintOptions = {},
): void => {
  if (typeof document === 'undefined') {
    return;
  }

  const absoluteHref = getAbsoluteHref(href);

  if (registeredHints.has(absoluteHref)) {
    return;
  }

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = absoluteHref;
  link.dataset.prefetch = 'true';
  link.as = options.as ?? link.as;

  if (options.crossOrigin) {
    link.crossOrigin = options.crossOrigin;
  }

  if (options.importance) {
    // Importance is still experimental; cast to assign without TS complaints
    (
      link as Partial<HTMLLinkElement> & { importance?: PrefetchImportance }
    ).importance = options.importance;
  }

  document.head.appendChild(link);
  registeredHints.set(absoluteHref, link);

  logDebug(
    'Added prefetch hint',
    { href: absoluteHref, as: options.as },
    'prefetchHints',
  );
  prefetchOrchestrator.recordHint(absoluteHref, options.importance ?? 'auto');
};

export const ensurePrefetchHints = (
  hints: ReadonlyArray<{ href: string; options?: PrefetchHintOptions }>,
): void => {
  hints.forEach(({ href, options }) => {
    addPrefetchHint(href, options);
  });
};
