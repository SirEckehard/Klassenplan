// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Intelligent route preloading for better perceived performance
 */
import { logWarn, logDebug, logError } from '@/utils';
import { addPrefetchHint } from '@/utils/performance/prefetchHints';
import { scheduleIdleTask } from '@/utils/performance/idleTasks';
import { prefetchOrchestrator } from '@/utils/performance/prefetchOrchestrator';
import { routeComponents, type RouteName } from '@/pages/lazyPages';

// Cache for preloaded routes to avoid duplicate loads
const preloadedRoutes = new Set<string>();

function isRouteName(name: string): name is RouteName {
  return name in routeComponents;
}

/**
 * Map a location pathname to its route name, ignoring the `/en` language
 * prefix. Unknown paths fall back to the start page.
 */
export function routeNameForPath(pathname: string): RouteName {
  const withoutLang = pathname.replace(/^\/en(?=\/|$)/, '');
  const segment = withoutLang.split('/')[1] ?? '';
  return isRouteName(segment) ? segment : 'startpage';
}

/**
 * Preload a route component for faster navigation.
 *
 * Resolves the component's chunk so a later render skips Suspense entirely.
 * Never rejects: a failed preload leaves the lazy fallback path in charge.
 */
export async function preloadRoute(routeName: string): Promise<void> {
  if (preloadedRoutes.has(routeName)) {
    return; // Already preloaded
  }

  if (!isRouteName(routeName)) {
    logWarn(`Unknown route for preloading: ${routeName}`, {}, 'routePreloader');
    return;
  }

  const component = routeComponents[routeName];

  try {
    await prefetchOrchestrator.trackJob(
      { type: 'route', target: routeName, trigger: 'auto' },
      () => component.preload(),
    );

    preloadedRoutes.add(routeName);
    logDebug(`Route preloaded: ${routeName}`, {}, 'routePreloader');
  } catch (error) {
    logError(
      `Failed to preload route ${routeName}`,
      { error },
      'routePreloader',
    );
  }
}

/**
 * Preload likely next routes based on current route
 */
export function preloadLikelyRoutes(currentPath: string): void {
  // Use requestIdleCallback for non-blocking preloading
  const preload = () => {
    switch (currentPath) {
      case '/':
        // From start page, users likely go to generator
        addPrefetchHint('/generator', { as: 'document', importance: 'low' });
        preloadRoute('generator');
        break;
      case '/generator':
        // From generator, users likely export, present, or go back to start
        addPrefetchHint('/export', { as: 'document', importance: 'low' });
        addPrefetchHint('/present', { as: 'document', importance: 'low' });
        addPrefetchHint('/', { as: 'document', importance: 'low' });
        preloadRoute('export');
        preloadRoute('present');
        preloadRoute('startpage');
        break;
      case '/export':
        // From export, users might go back to generator or start
        addPrefetchHint('/generator', { as: 'document', importance: 'low' });
        addPrefetchHint('/', { as: 'document', importance: 'low' });
        preloadRoute('generator');
        preloadRoute('startpage');
        break;
      default:
        // For other pages, preload start page
        addPrefetchHint('/', { as: 'document', importance: 'low' });
        preloadRoute('startpage');
    }
  };

  scheduleIdleTask(preload, { timeout: 2000 });
}

/**
 * Preload route on link hover for instant navigation
 */
export function preloadOnHover(routeName: string): (event: MouseEvent) => void {
  return (event: MouseEvent) => {
    // Only preload on hover for mouse devices (not touch)
    if (event.type === 'mouseenter') {
      preloadRoute(routeName);
    }
  };
}
