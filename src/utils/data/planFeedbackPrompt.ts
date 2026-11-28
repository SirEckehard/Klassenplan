// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * When the plan layer asks how a plan in use went (decision 0054, addendum
 * of 2026-11-27): "Mischen" asks once about the plan on the stage before it
 * mixes it over, from the day after that plan was first in use — the one
 * moment the teacher knows how it went, the plan is still there to point at
 * its tables, and the answer counts in the plan that follows.
 */
import type { PlanUsage } from '@/types';
import { LOCAL_STORAGE_KEYS } from '@/utils/data/storageKeys';
import { isCountedUsage } from '@/utils/data/planUsage';
import { logWarn } from '@/utils';

/** How many records the "asked already" list remembers. */
const ASKED_LIMIT = 60;

const SOURCE = 'planFeedbackPrompt';

/**
 * Whether a plan first in use at `since` was in use before today, on this
 * device's calendar: a plan saved a minute ago has not been in a classroom
 * yet, so nobody can say how it went.
 *
 * @param since When the plan was first in use (ISO 8601), if known
 * @param now The moment of asking
 */
export function inUseBeforeToday(
  since: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!since) return false;
  const time = Date.parse(since);
  if (!Number.isFinite(time)) return false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return time < today.getTime();
}

/**
 * The plan on the stage to ask about before it is mixed over, or null: its
 * record counts, carries no feedback, was in use before today and was not
 * asked about before.
 *
 * @param record The record of the plan on the stage, if it has one
 * @param asked Records asked about already
 * @param now The moment of asking
 */
export function planToAskBeforeMix(
  record: PlanUsage | null | undefined,
  asked: ReadonlySet<string>,
  now: Date = new Date(),
): PlanUsage | null {
  if (!record || !isCountedUsage(record) || record.feedback) return null;
  if (asked.has(record.id)) return null;
  return inUseBeforeToday(record.firstSeenAt, now) ? record : null;
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
