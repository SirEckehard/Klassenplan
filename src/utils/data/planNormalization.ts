// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { SavedPlan } from '@/types';
import { generateId, logWarn } from '@/utils';

type NormalizePlanIdResult = { id: string; regenerated: boolean };

const DEFAULT_LOG_SOURCE = 'planNormalization';
const DEFAULT_LOG_MESSAGE = 'Adjusted seating plan IDs to ensure uniqueness';

export function normalizePlanId(value: unknown): NormalizePlanIdResult {
  if (typeof value === 'string' && value.trim()) {
    return { id: value, regenerated: false };
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { id: String(value), regenerated: false };
  }
  return { id: generateId(), regenerated: true };
}

function generateUniquePlanId(history: SavedPlan[]): string {
  const existingIds = new Set(history.map((plan) => plan.id));
  let candidate = generateId();

  while (existingIds.has(candidate)) {
    candidate = generateId();
  }

  return candidate;
}

export type ResolvePlanSlotParams = {
  history: SavedPlan[];
  activePlanId: string | null;
  /** Trimmed plan name. */
  name: string;
  /** Silent auto-save; recycles the previous auto-saved entry. */
  autoSave: boolean;
};

/**
 * Decides which history entry a save writes to.
 *
 * Three outcomes: update the active plan when the name is unchanged, recycle
 * the single auto-save slot, or append a new entry. Returns `null` when another
 * plan already carries the name — the caller then rejects the save.
 */
export function resolvePlanSlot({
  history,
  activePlanId,
  name,
  autoSave,
}: ResolvePlanSlotParams): { planId: string } | null {
  const previousAutoSave = autoSave
    ? history.find((plan) => plan.autoSaved)
    : undefined;

  const nameTaken = history.some(
    (plan) =>
      plan.name === name &&
      plan.id !== activePlanId &&
      plan.id !== previousAutoSave?.id,
  );
  if (nameTaken) {
    return null;
  }

  const active =
    activePlanId !== null
      ? history.find((plan) => plan.id === activePlanId)
      : undefined;

  if (active?.name === name && activePlanId !== null) {
    return { planId: activePlanId };
  }

  return { planId: previousAutoSave?.id ?? generateUniquePlanId(history) };
}

/**
 * Writes a plan into the history, replacing an entry with the same id when one
 * exists and appending otherwise.
 */
export function upsertPlan(history: SavedPlan[], plan: SavedPlan): SavedPlan[] {
  const index = history.findIndex((entry) => entry.id === plan.id);
  if (index === -1) {
    return [...history, plan];
  }
  const next = [...history];
  next[index] = plan;
  return next;
}

export function normalizeSeatingHistory(
  plans: SavedPlan[],
  options?: { logMessage?: string; logSource?: string },
): SavedPlan[] {
  const seenIds = new Set<string>();
  let regeneratedCount = 0;

  const normalized = plans.map((plan) => {
    const { id: baseId, regenerated } = normalizePlanId(plan?.id);
    let id = baseId;

    if (regenerated) {
      regeneratedCount += 1;
    }

    while (seenIds.has(id)) {
      id = generateId();
      regeneratedCount += 1;
    }

    seenIds.add(id);
    return { ...plan, id };
  });

  if (regeneratedCount > 0) {
    logWarn(
      options?.logMessage ?? DEFAULT_LOG_MESSAGE,
      { adjusted: regeneratedCount, total: plans.length },
      options?.logSource ?? DEFAULT_LOG_SOURCE,
    );
  }

  return normalized;
}
