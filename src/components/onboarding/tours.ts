// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The coach-mark tours of the workspace and of "Bibliothek".
 *
 * A mark points at an element tagged `data-tour="…"`. The attribute is the only
 * coupling between a tour and the view it explains: a mark whose element is not
 * on screen — a sidebar folded into a phone sheet, a class without students, a
 * plan without statistics yet — is skipped instead of pointing at nothing.
 * Views can change without breaking a tour; at worst they shorten it.
 *
 * A tour reads its screen as a page is read: the header, the toolbar from top
 * to bottom, the stage, the inspector, and last the status bar from left to
 * right, so the spotlight never crosses back over ground it has covered.
 *
 * Texts live under `generator:<textKey>.{title,body}`. A mark that explains
 * what a help topic explains takes that topic's key (`help.*`,
 * `components/help/workspaceHelpTopics.ts`), so the tour and the help say the
 * same; only what the help leaves to the screen — the way on, the toolbar's
 * foot, the help itself — has a text of its own under `tour.*`.
 *
 * `e2e/onboarding.spec.ts` asserts the German titles word for word and in the
 * order below. Renaming a title or adding, removing or reordering a mark means
 * updating the title lists in that spec as well.
 */
import type { TourId } from '@/hooks/onboarding/onboardingTourStore';

export const TOUR_ANCHORS = {
  classEmptyState: 'class-empty-state',
  classSwitcher: 'class-switcher',
  classViews: 'class-views',
  addStudents: 'add-students',
  studentRow: 'student-row',
  proceedToLayout: 'proceed-layout',
  library: 'library',
  backup: 'backup',
  help: 'help',
  inspector: 'inspector',
  layoutCanvas: 'layout-canvas',
  layoutSidebar: 'layout-sidebar',
  layoutRooms: 'layout-rooms',
  layoutSetup: 'layout-setup',
  proceedToPlan: 'proceed-plan',
  mixButton: 'mix-button',
  sidebarToggle: 'sidebar-toggle',
  planCanvas: 'plan-canvas',
  planFulfillment: 'plan-fulfillment',
  seatingModeToggle: 'seating-mode-toggle',
  planExits: 'plan-exits',
  libraryToolbar: 'library-toolbar',
  libraryColumns: 'library-columns',
  libraryOpen: 'library-open',
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
    { anchor: TOUR_ANCHORS.classSwitcher, textKey: 'help.students.classes' },
    // The toolbar from the top: the views, then who joins the class.
    { anchor: TOUR_ANCHORS.classViews, textKey: 'help.students.views' },
    { anchor: TOUR_ANCHORS.addStudents, textKey: 'help.students.add' },
    // It ends on the data staying on this device, which leads to the foot.
    { anchor: TOUR_ANCHORS.studentRow, textKey: 'help.students.edit' },
    // The foot every toolbar shares, and the switch under it in the status
    // bar: met here first, so this tour explains them for every layer.
    { anchor: TOUR_ANCHORS.library, textKey: 'tour.students.library' },
    { anchor: TOUR_ANCHORS.backup, textKey: 'tour.students.backup' },
    { anchor: TOUR_ANCHORS.sidebarToggle, textKey: 'tour.sidebarToggle' },
    { anchor: TOUR_ANCHORS.proceedToLayout, textKey: 'tour.students.proceed' },
    // Last, because the help is where every tour can be started again.
    { anchor: TOUR_ANCHORS.help, textKey: 'tour.help' },
  ],
  layout: [
    // The inspector's room panel, while nothing is selected, from the top;
    // below `lg` it sits in a closed drawer and both marks are skipped.
    { anchor: TOUR_ANCHORS.layoutRooms, textKey: 'help.layout.rooms' },
    { anchor: TOUR_ANCHORS.layoutSetup, textKey: 'help.layout.setup' },
    { anchor: TOUR_ANCHORS.layoutCanvas, textKey: 'help.layout.move' },
    // The toolbar's "Hinzufügen", below `lg` the tray at the status bar.
    { anchor: TOUR_ANCHORS.layoutSidebar, textKey: 'help.layout.add' },
    { anchor: TOUR_ANCHORS.proceedToPlan, textKey: 'tour.layout.proceed' },
  ],
  plan: [
    { anchor: TOUR_ANCHORS.seatingModeToggle, textKey: 'tour.plan.circle' },
    { anchor: TOUR_ANCHORS.planCanvas, textKey: 'help.plan.seats' },
    // The column, from `lg` up; folded or in a closed drawer it is skipped.
    { anchor: TOUR_ANCHORS.inspector, textKey: 'help.plan.criteria' },
    // The status bar from the left: how well, again, and out.
    { anchor: TOUR_ANCHORS.planFulfillment, textKey: 'help.plan.fulfilment' },
    { anchor: TOUR_ANCHORS.mixButton, textKey: 'tour.plan.mix' },
    { anchor: TOUR_ANCHORS.planExits, textKey: 'tour.plan.exits' },
  ],
  library: [
    { anchor: TOUR_ANCHORS.libraryColumns, textKey: 'help.library.columns' },
    { anchor: TOUR_ANCHORS.libraryToolbar, textKey: 'help.library.add' },
    // The column, from `lg` up; folded or in a closed drawer it is skipped.
    { anchor: TOUR_ANCHORS.inspector, textKey: 'help.library.edit' },
    { anchor: TOUR_ANCHORS.libraryOpen, textKey: 'help.library.open' },
    { anchor: TOUR_ANCHORS.help, textKey: 'tour.help' },
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

/**
 * Carried by the placeholder a layer shows while its code loads. A due tour
 * waits until none is on screen: the header and the status bar already hold
 * some of the layer's marks, and a tour keeps the marks it starts with.
 */
export const LAYER_LOADING_ATTRIBUTE = 'data-layer-loading';

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
