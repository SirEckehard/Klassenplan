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
