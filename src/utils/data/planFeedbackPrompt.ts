// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * When the plan layer asks how the last plan in use went (decision 0054,
 * addendum of 2026-11-24): "Erfahrung" lives on feedback that the
 * inspector holds and only finds who looks for it. Once a plan in use was
 * followed by another, after a week at least, the layer asks once.
 */
import type { PlanUsage } from '@/types';
import { LOCAL_STORAGE_KEYS } from '@/utils/data/storageKeys';
import {
  isCountedUsage,
  isRecordOf,
  type PlanPairs,
} from '@/utils/data/planUsage';
import { logWarn } from '@/utils';

/** How long a plan must have been in use before the question comes. */
const PLAN_FEEDBACK_ASK_AFTER_DAYS = 7;

/** How many records the "asked already" list remembers. */
const ASKED_LIMIT = 60;

const DAY_MS = 24 * 60 * 60 * 1000;
const SOURCE = 'planFeedbackPrompt';

/**
 * The plan in use to ask about, or null: the newest record that counts, as
 * long as it carries no feedback, is not the plan on the stage, was in use a
 * week at least and was not asked about before.
 *
 * @param records The class's usage records, resolved for its mode
 * @param shown The plan on the stage, by its pairs, if any
 * @param asked Records asked about already
 * @param now The moment of asking
 */
export function planToAskAbout(
  records: readonly PlanUsage[],
  shown: Pick<PlanPairs, 'fingerprint' | 'formerFingerprint'> | null,
  asked: ReadonlySet<string>,
  now: Date = new Date(),
): PlanUsage | null {
  const newest = records
    .filter(isCountedUsage)
    .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt))[0];
  if (!newest || newest.feedback) return null;
  if (shown && isRecordOf(newest, shown)) return null;
  if (asked.has(newest.id)) return null;
  const since = Date.parse(newest.firstSeenAt);
  if (!Number.isFinite(since)) return null;
  return now.getTime() - since >= PLAN_FEEDBACK_ASK_AFTER_DAYS * DAY_MS
    ? newest
    : null;
}

/** The records asked about already, by id; ids only, no names. */
export function readAskedPlanFeedback(): Set<string> {
  try {
    const raw = window.localStorage.getItem(
      LOCAL_STORAGE_KEYS.planFeedbackAsked,
    );
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === 'string')
        : [],
    );
  } catch (error) {
    logWarn('Could not read the plans asked about', { error }, SOURCE);
    return new Set();
  }
}

/** Notes a record as asked about, so the question does not come again. */
export function noteAskedPlanFeedback(recordId: string): void {
  try {
    const asked = [...new Set([...readAskedPlanFeedback(), recordId])];
    window.localStorage.setItem(
      LOCAL_STORAGE_KEYS.planFeedbackAsked,
      JSON.stringify(asked.slice(-ASKED_LIMIT)),
    );
  } catch (error) {
    logWarn('Could not note a plan asked about', { error }, SOURCE);
  }
}
