// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Records which seating plans were actually in use, as opposed to the mix
 * history, which is an undo buffer for one working session.
 *
 * Teachers shuffle many times before settling on an arrangement, so the mix
 * history cannot tell an experiment apart from the plan that ended up on the
 * wall. The signals below are derived from actions that only happen for a plan
 * that is really being used — no extra step in the UI.
 */

/** Action a usage record was derived from. */
export type PlanUsageSource =
  /** Shown in presentation mode long enough to rule out a stray click. */
  | 'presented'
  /** Printed or exported as PDF/PNG/SVG. */
  | 'exported'
  /** Saved under a name the teacher chose (not a silent auto-save). */
  | 'saved'
  /** Seats rearranged by hand — on its own only a provisional signal. */
  | 'edited';

/** One seating plan that was in use, with the evidence backing that claim. */
export interface PlanUsage {
  id: string;
  /**
   * Stable hash over {@link pairs}. Two arrangements that seat the same people
   * next to each other share a fingerprint, so re-presenting the same plan
   * extends the existing record instead of appending a new one.
   */
  fingerprint: string;
  /**
   * Neighbourhoods as `"idA::idB"` keys, sorted. Deliberately not the full
   * `SeatingArrangement`: a year of records stays small, and no personal data
   * beyond the student ids already stored is duplicated here.
   */
  pairs: string[];
  /** ISO 8601 timestamp of the first signal for this arrangement. */
  firstSeenAt: string;
  /** ISO 8601 timestamp of the most recent signal. */
  lastSeenAt: string;
  /** Every action seen for this arrangement, in insertion order. */
  sources: PlanUsageSource[];
  /** Highest confidence among {@link sources}, between 0 and 1. */
  confidence: number;
  /**
   * Set once the teacher answers the confirmation prompt. Left undefined until
   * then; a record is counted on its {@link confidence} alone in that case.
   */
  confirmed?: boolean;
}

/** Stored shape of the plan usage record, one bucket per class. */
export interface PlanUsageData {
  version: 1;
  byClass: Record<string, PlanUsage[]>;
  /** Classes already seeded from their saved plans, so it happens only once. */
  backfilledClassIds: string[];
}
