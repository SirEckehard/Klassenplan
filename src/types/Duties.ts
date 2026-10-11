// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Class duties ("Dienste verteilen"): board, sweeping, the bins —
 * named by the teacher, each wanting a number of students, handed out in
 * rounds that rotate fairly (decision 0028).
 *
 * Kept per class in a store of their own (`DB_KEYS.duties`), apart from the
 * class record: the tool lives outside the workspace and must not write into
 * the open class's live state.
 */

/** One duty as the teacher named it. */
export interface Duty {
  id: string;
  name: string;
  /** How many students it takes. */
  count: number;
}

/** One handing-out of the duties. */
export interface DutyRound {
  /** ISO 8601 timestamp of the draw. */
  at: string;
  /** Duty id → the students holding it, in the order drawn. */
  assignments: Record<string, string[]>;
}

/** What a class keeps of its duties. */
export interface ClassDuties {
  duties: Duty[];
  /** The round on the wall now; null before the first draw. */
  current: DutyRound | null;
  /** Earlier rounds, oldest first — what the rotation reads. */
  rounds: DutyRound[];
}

/** The single persisted record holding every class's duties. */
export interface DutyData {
  version: 1;
  byClass: Record<string, ClassDuties>;
}
