// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Lazily loaded route components, defined once and shared by the router and the
 * route preloader. Both must reference the *same* component instance: preload()
 * warms the module cache held inside it, which is what lets an already-loaded
 * route render without suspending.
 */
import { lazyWithRetry } from '@/utils/performance/lazyWithRetry';

export const StartPage = lazyWithRetry(() => import('@/pages/StartPage'));
export const SeatingPlanGenerator = lazyWithRetry(
  () => import('@/components/SeatingPlanGenerator/SeatingPlanGenerator'),
);
export const Export = lazyWithRetry(() => import('@/pages/Export'));
export const Present = lazyWithRetry(() => import('@/pages/Present'));
export const NameGame = lazyWithRetry(() => import('@/pages/NameGame'));
export const Impressum = lazyWithRetry(() => import('@/pages/Impressum'));
export const Datenschutz = lazyWithRetry(() => import('@/pages/Datenschutz'));
export const Feedback = lazyWithRetry(() => import('@/pages/Feedback'));
export const FAQ = lazyWithRetry(() => import('@/pages/FAQ'));
export const Changelog = lazyWithRetry(() => import('@/pages/Changelog'));
export const Support = lazyWithRetry(() => import('@/pages/Support'));
export const NotFound = lazyWithRetry(() => import('@/pages/NotFound'));

/**
 * Preloadable routes keyed by the first path segment (`''` is the start page).
 * Keys double as the route names used by the preloader.
 */
export const routeComponents = {
  startpage: StartPage,
  generator: SeatingPlanGenerator,
  export: Export,
  present: Present,
  namensspiel: NameGame,
  impressum: Impressum,
  datenschutz: Datenschutz,
  feedback: Feedback,
  faq: FAQ,
  changelog: Changelog,
  support: Support,
} as const;

export type RouteName = keyof typeof routeComponents;
