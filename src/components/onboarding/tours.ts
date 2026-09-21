// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The coach-mark tours of the wizard.
 *
 * A mark points at an element tagged `data-tour="…"`. The attribute is the only
 * coupling between a tour and the view it explains: a mark whose element is not
 * on screen — a sidebar folded into a phone sheet, a class without students, a
 * plan without statistics yet — is skipped instead of pointing at nothing.
 * Views can change without breaking a tour; at worst they shorten it.
 *
 * Texts live under `generator:tour.<textKey>.{title,body}`.
 *
 * `e2e/onboarding.spec.ts` asserts the German titles word for word and in the
 * order below. Renaming a title or adding, removing or reordering a mark means
 * updating the title lists in that spec as well.
 */
import type { TourId } from '@/hooks/onboarding/onboardingTourStore';

export const TOUR_ANCHORS = {
  classEmptyState: 'class-empty-state',
  classSwitcher: 'class-switcher',
  classToolbar: 'class-toolbar',
  addStudents: 'add-students',
  studentRow: 'student-row',
  proceedToLayout: 'proceed-layout',
  backup: 'backup',
  help: 'help',
  layoutCanvas: 'layout-canvas',
  canvasSettings: 'canvas-settings',
  layoutSidebar: 'layout-sidebar',
  layoutStatus: 'layout-status',
  proceedToPlan: 'proceed-plan',
  mixButton: 'mix-button',
  planSidebar: 'plan-sidebar',
  sidebarToggle: 'sidebar-toggle',
  planCanvas: 'plan-canvas',
  planFulfillment: 'plan-fulfillment',
  seatingModeToggle: 'seating-mode-toggle',
  planExits: 'plan-exits',
} as const;

type TourAnchor = (typeof TOUR_ANCHORS)[keyof typeof TOUR_ANCHORS];

export interface TourMark {
  anchor: TourAnchor;
  textKey: string;
}

export const TOURS: Record<TourId, readonly TourMark[]> = {
  welcome: [
    {
      anchor: TOUR_ANCHORS.classEmptyState,
      textKey: 'tour.welcome.emptyState',
    },
  ],
  students: [
    {
      anchor: TOUR_ANCHORS.classSwitcher,
      textKey: 'tour.students.classSwitcher',
    },
    { anchor: TOUR_ANCHORS.addStudents, textKey: 'tour.students.addStudents' },
    { anchor: TOUR_ANCHORS.studentRow, textKey: 'tour.students.studentRow' },
    { anchor: TOUR_ANCHORS.proceedToLayout, textKey: 'tour.students.proceed' },
    // The data lives in this browser only, so the backup gets its own mark
    // before anything could be lost.
    { anchor: TOUR_ANCHORS.backup, textKey: 'tour.students.backup' },
    // Last, because the Help dialog is where every tour can be started again.
    { anchor: TOUR_ANCHORS.help, textKey: 'tour.help' },
  ],
  layout: [
    { anchor: TOUR_ANCHORS.layoutCanvas, textKey: 'tour.layout.canvas' },
    // Every canvas has this button with options of its own; step 2 is where it
    // first appears, so the text explains what the later steps offer as well.
    {
      anchor: TOUR_ANCHORS.canvasSettings,
      textKey: 'tour.layout.canvasSettings',
    },
    { anchor: TOUR_ANCHORS.layoutSidebar, textKey: 'tour.layout.sidebar' },
    { anchor: TOUR_ANCHORS.layoutStatus, textKey: 'tour.layout.status' },
    { anchor: TOUR_ANCHORS.proceedToPlan, textKey: 'tour.layout.proceed' },
  ],
  plan: [
    { anchor: TOUR_ANCHORS.mixButton, textKey: 'tour.plan.mix' },
    { anchor: TOUR_ANCHORS.planSidebar, textKey: 'tour.plan.sidebar' },
    // Explained once here; step 2 and the export page share the same sidebar.
    { anchor: TOUR_ANCHORS.sidebarToggle, textKey: 'tour.plan.sidebarToggle' },
    { anchor: TOUR_ANCHORS.planCanvas, textKey: 'tour.plan.canvas' },
    { anchor: TOUR_ANCHORS.planFulfillment, textKey: 'tour.plan.fulfillment' },
    { anchor: TOUR_ANCHORS.seatingModeToggle, textKey: 'tour.plan.circle' },
    { anchor: TOUR_ANCHORS.planExits, textKey: 'tour.plan.exits' },
  ],
};

/**
 * The tour that belongs to what the wizard shows right now, if any.
 *
 * @param isAutoMixing - Entering step 3 shuffles the first plan; the plan tour
 *   waits for it, because the statistics it points at only exist afterwards
 *   and a tour keeps the marks that were on screen when it started.
 */
export function resolveTourId(
  step: number,
  hasActiveClass: boolean,
  seatingMode: 'table' | 'circle',
  isAutoMixing = false,
): TourId | null {
  if (step === 1) {
    return hasActiveClass ? 'students' : 'welcome';
  }
  if (step === 2) {
    return 'layout';
  }
  // The circle view has its own controls; the plan tour would point at nothing.
  if (step === 3 && seatingMode === 'table' && !isAutoMixing) {
    return 'plan';
  }
  return null;
}

/** The first element carrying `anchor` that takes up space on screen, or null. */
export function findTourAnchor(anchor: TourAnchor): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>(
    `[data-tour="${anchor}"]`,
  );
  for (const element of candidates) {
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return element;
    }
  }
  return null;
}
