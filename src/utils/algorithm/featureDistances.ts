// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { ClassroomScene } from '@/types';
import { CLASSROOM_HEIGHT, CLASSROOM_WIDTH } from '@/utils';

/**
 * Per-seat distances to the nearest window and door, plus the largest measured
 * distance of each kind. The maxima are used to normalize a raw distance into a
 * 0..1 proximity value.
 *
 * Seats keep `POSITIVE_INFINITY` when the scene has no feature of that type, so
 * callers can distinguish "far away" from "does not exist".
 */
export type FeatureDistanceMaps = {
  window: Map<string, number>;
  door: Map<string, number>;
  maxWindowDistance: number;
  maxDoorDistance: number;
};

type Rectangle = { x: number; y: number; width: number; height: number };

/**
 * Shortest distance from a point to the rectangle occupied by a feature.
 * Returns 0 when the point lies inside the rectangle.
 */
const distanceToFeature = (
  x: number,
  y: number,
  feature: Rectangle,
): number => {
  const dx = Math.max(feature.x - x, 0, x - (feature.x + feature.width));
  const dy = Math.max(feature.y - y, 0, y - (feature.y + feature.height));
  return Math.hypot(dx, dy);
};

const nearestFeatureDistance = (
  position: { x: number; y: number },
  features: Rectangle[],
): number => {
  let minDistance = Number.POSITIVE_INFINITY;
  for (const feature of features) {
    const distance = distanceToFeature(position.x, position.y, feature);
    if (distance < minDistance) {
      minDistance = distance;
    }
  }
  return minDistance;
};

/**
 * Computes window/door distance maps for every seat of a scene.
 *
 * Module-private: callers go through {@link getFeatureDistanceMaps}, which
 * memoizes the result per scene geometry.
 */
const computeFeatureDistanceMaps = (
  scene: ClassroomScene,
  seatPositions: Map<string, { x: number; y: number }>,
): FeatureDistanceMaps => {
  const features = scene.features ?? [];
  const windowFeatures = features.filter(
    (feature) => feature.type === 'window',
  );
  const doorFeatures = features.filter((feature) => feature.type === 'door');

  const windowDistances = new Map<string, number>();
  const doorDistances = new Map<string, number>();

  let maxWindowDistance = 0;
  let maxDoorDistance = 0;

  const defaultFallbackDistance = Math.hypot(CLASSROOM_WIDTH, CLASSROOM_HEIGHT);

  for (const [seatKey, position] of seatPositions.entries()) {
    if (windowFeatures.length > 0) {
      const minDistance = nearestFeatureDistance(position, windowFeatures);
      windowDistances.set(seatKey, minDistance);
      if (Number.isFinite(minDistance)) {
        maxWindowDistance = Math.max(maxWindowDistance, minDistance);
      }
    } else {
      windowDistances.set(seatKey, Number.POSITIVE_INFINITY);
    }

    if (doorFeatures.length > 0) {
      const minDistance = nearestFeatureDistance(position, doorFeatures);
      doorDistances.set(seatKey, minDistance);
      if (Number.isFinite(minDistance)) {
        maxDoorDistance = Math.max(maxDoorDistance, minDistance);
      }
    } else {
      doorDistances.set(seatKey, Number.POSITIVE_INFINITY);
    }
  }

  return {
    window: windowDistances,
    door: doorDistances,
    maxWindowDistance:
      maxWindowDistance > 0 ? maxWindowDistance : defaultFallbackDistance,
    maxDoorDistance:
      maxDoorDistance > 0 ? maxDoorDistance : defaultFallbackDistance,
  };
};

/**
 * Identifies a scene by everything the distance maps depend on: table geometry
 * (seat positions derive from it) and feature rectangles. Ignores names, ids of
 * tables and any styling, so cosmetic edits keep the cache warm.
 */
const buildSceneSignature = (scene: ClassroomScene): string => {
  const tableSignature = scene.tables
    .map((table, index) =>
      [
        index,
        table.x,
        table.y,
        table.width,
        table.height,
        table.rotation,
        table.seatCount,
      ].join(':'),
    )
    .join('|');

  const featureSignature = (scene.features ?? [])
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((feature) =>
      [
        feature.id,
        feature.type,
        feature.x,
        feature.y,
        feature.width,
        feature.height,
        feature.rotation ?? 0,
      ].join(':'),
    )
    .join('|');

  return `${tableSignature}#${featureSignature}`;
};

const MAX_FEATURE_DISTANCE_CACHE_SIZE = 100;
const featureDistanceCache = new Map<string, FeatureDistanceMaps>();

/**
 * Cached variant of {@link computeFeatureDistanceMaps}. Safe to share across
 * callers because `seatPositions` is always derived from `scene` via
 * `getSeatPositions`, which the signature already covers.
 */
export const getFeatureDistanceMaps = (
  scene: ClassroomScene,
  seatPositions: Map<string, { x: number; y: number }>,
): FeatureDistanceMaps => {
  const signature = buildSceneSignature(scene);
  const cached = featureDistanceCache.get(signature);
  if (cached) return cached;

  const distances = computeFeatureDistanceMaps(scene, seatPositions);
  featureDistanceCache.set(signature, distances);
  if (featureDistanceCache.size > MAX_FEATURE_DISTANCE_CACHE_SIZE) {
    const firstKey = featureDistanceCache.keys().next().value;
    if (firstKey) {
      featureDistanceCache.delete(firstKey);
    }
  }
  return distances;
};
