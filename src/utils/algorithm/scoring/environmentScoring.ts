import type { ScoringContext } from './scoringContext';

const buildSeatKey = (tableIndex: number, seatIndex: number) =>
  `${tableIndex}-${seatIndex}`;

const normalizeDistance = (distance: number, maxDistance: number) => {
  if (!Number.isFinite(distance)) {
    return 1;
  }
  const denominator = Math.max(maxDistance, 1);
  return Math.min(distance / denominator, 1);
};

export function scoreEnvironment(context: ScoringContext): number {
  const seatKey = buildSeatKey(context.tableIndex, context.seatIndex);
  let score = 0;

  if (
    context.student.prefersWindow &&
    (context.settings.preferWindowSeats ?? 0) > 0
  ) {
    const distance = context.featureDistances.window.get(seatKey);
    if (distance !== undefined && Number.isFinite(distance)) {
      const normalized = normalizeDistance(distance, context.maxWindowDistance);
      score += normalized * (context.settings.preferWindowSeats ?? 0);
    }
  }

  if (
    context.student.prefersDoor &&
    (context.settings.preferDoorSeats ?? 0) > 0
  ) {
    const distance = context.featureDistances.door.get(seatKey);
    if (distance !== undefined && Number.isFinite(distance)) {
      const normalized = normalizeDistance(distance, context.maxDoorDistance);
      score += normalized * (context.settings.preferDoorSeats ?? 0);
    }
  }

  return score;
}
