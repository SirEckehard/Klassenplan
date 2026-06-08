// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useEffect, useMemo, useRef } from 'react';
import type { Student, MixSettings } from '@/types';
import { DEFAULT_MIX_WEIGHTS } from '@/utils';

type StudentNeeds = {
  hasRestlessPair: boolean;
  hasConcentrationPair: boolean;
  hasRestlessAndConcentration: boolean;
  hasShy: boolean;
  hasNeedsFrontSeat: boolean;
  hasWishPartner: boolean;
  hasAvoidPartner: boolean;
  hasPerformance: boolean;
  hasHeightData: boolean;
  hasWindowPreference: boolean;
  hasDoorPreference: boolean;
};

/**
 * Calculate student needs from the students array.
 * Memoized to avoid redundant filter/some iterations on every render.
 */
function calculateStudentNeeds(students: Student[]): StudentNeeds {
  const restlessCount = students.filter((s) => s.restless).length;
  const concentrationCount = students.filter(
    (s) => s.concentrationIssues,
  ).length;

  return {
    hasRestlessPair: restlessCount >= 2,
    hasConcentrationPair: concentrationCount >= 2,
    hasRestlessAndConcentration: restlessCount > 0 && concentrationCount > 0,
    hasShy: students.some((s) => s.shy),
    hasNeedsFrontSeat: students.some((s) => s.needsFrontSeat),
    hasWishPartner: students.some((s) => Boolean(s.wishPartnerId)),
    hasAvoidPartner: students.some((s) => Boolean(s.avoidPartnerId)),
    hasPerformance: students.some(
      (s) => s.performanceStrong === true || s.performanceWeak === true,
    ),
    hasHeightData: students.some(
      (s) => s.height === 'small' || s.height === 'tall',
    ),
    hasWindowPreference: students.some((s) => s.prefersWindow),
    hasDoorPreference: students.some((s) => s.prefersDoor),
  };
}

export function useAutoMixSettings(
  students: Student[],
  mixSettings: MixSettings,
  setMixSettings: React.Dispatch<React.SetStateAction<MixSettings>>,
  activeClassId?: string,
) {
  const previousNeedsRef = useRef<StudentNeeds>({
    hasRestlessPair: false,
    hasConcentrationPair: false,
    hasRestlessAndConcentration: false,
    hasShy: false,
    hasNeedsFrontSeat: false,
    hasWishPartner: false,
    hasAvoidPartner: false,
    hasPerformance: false,
    hasHeightData: false,
    hasWindowPreference: false,
    hasDoorPreference: false,
  });

  const previousClassIdRef = useRef<string | undefined>(activeClassId);

  // Memoize current needs to avoid 12 filter/some operations per render
  const currentNeeds = useMemo(
    () => calculateStudentNeeds(students),
    [students],
  );

  useEffect(() => {
    // Reset previous needs when switching classes to avoid applying
    // logic based on the previous class's state
    // When switching classes, we need to immediately calculate the needs for the
    // new students to prevent the effect from thinking these are "new" needs
    // in the next render cycle and triggering unnecessary settings updates.
    if (previousClassIdRef.current !== activeClassId) {
      previousClassIdRef.current = activeClassId;
      // Use memoized current needs instead of recalculating
      previousNeedsRef.current = currentNeeds;
      // Do NOT return early. We want to proceed with the check, but since
      // previousNeedsRef is now up-to-date with the current students,
      // no changes will be detected unless the loaded settings are actually out of sync.
    }

    // Use memoized currentNeeds instead of recalculating
    const nextNeeds = currentNeeds;

    const prevNeeds = previousNeedsRef.current;
    const updates: Partial<MixSettings> = {};
    const concentrationPairBecameRelevant =
      nextNeeds.hasConcentrationPair && !prevNeeds.hasConcentrationPair;
    const combinedBecameRelevant =
      nextNeeds.hasRestlessAndConcentration &&
      !prevNeeds.hasRestlessAndConcentration;

    if (
      nextNeeds.hasRestlessPair &&
      !prevNeeds.hasRestlessPair &&
      mixSettings.avoidRestlessTogether === 0
    ) {
      updates.avoidRestlessTogether = DEFAULT_MIX_WEIGHTS.avoidRestlessTogether;
    }

    if (
      nextNeeds.hasShy &&
      !prevNeeds.hasShy &&
      mixSettings.avoidShyAlone === 0
    ) {
      updates.avoidShyAlone = DEFAULT_MIX_WEIGHTS.avoidShyAlone;
    }

    if (
      concentrationPairBecameRelevant &&
      mixSettings.avoidConcentrationTogether === 0
    ) {
      updates.avoidConcentrationTogether =
        DEFAULT_MIX_WEIGHTS.avoidConcentrationTogether;
    }

    if (
      combinedBecameRelevant &&
      mixSettings.avoidConcentrationNearRestless === 0
    ) {
      updates.avoidConcentrationNearRestless =
        DEFAULT_MIX_WEIGHTS.avoidConcentrationNearRestless;
    }

    if (
      nextNeeds.hasNeedsFrontSeat &&
      !prevNeeds.hasNeedsFrontSeat &&
      mixSettings.preferFrontForNeedsFrontSeat === 0
    ) {
      updates.preferFrontForNeedsFrontSeat =
        DEFAULT_MIX_WEIGHTS.preferFrontForNeedsFrontSeat;
    }

    if (
      nextNeeds.hasWishPartner &&
      !prevNeeds.hasWishPartner &&
      mixSettings.considerWishPartners === 0
    ) {
      updates.considerWishPartners = DEFAULT_MIX_WEIGHTS.considerWishPartners;
    }

    if (
      nextNeeds.hasAvoidPartner &&
      !prevNeeds.hasAvoidPartner &&
      mixSettings.avoidConflictPartners === 0
    ) {
      updates.avoidConflictPartners = DEFAULT_MIX_WEIGHTS.avoidConflictPartners;
    }

    if (
      nextNeeds.hasPerformance &&
      !prevNeeds.hasPerformance &&
      mixSettings.peerTutoring === 0
    ) {
      updates.peerTutoring = DEFAULT_MIX_WEIGHTS.peerTutoring;
    }

    if (
      nextNeeds.hasHeightData &&
      !prevNeeds.hasHeightData &&
      mixSettings.preferFrontForSmallerStudents === 0
    ) {
      updates.preferFrontForSmallerStudents =
        DEFAULT_MIX_WEIGHTS.preferFrontForSmallerStudents;
    }

    if (
      nextNeeds.hasWindowPreference &&
      !prevNeeds.hasWindowPreference &&
      mixSettings.preferWindowSeats === 0
    ) {
      updates.preferWindowSeats = DEFAULT_MIX_WEIGHTS.preferWindowSeats;
    }

    if (
      nextNeeds.hasDoorPreference &&
      !prevNeeds.hasDoorPreference &&
      mixSettings.preferDoorSeats === 0
    ) {
      updates.preferDoorSeats = DEFAULT_MIX_WEIGHTS.preferDoorSeats;
    }

    if (!nextNeeds.hasRestlessPair && mixSettings.avoidRestlessTogether !== 0) {
      updates.avoidRestlessTogether = 0;
    }

    if (
      !nextNeeds.hasConcentrationPair &&
      mixSettings.avoidConcentrationTogether !== 0
    ) {
      updates.avoidConcentrationTogether = 0;
    }

    if (
      !nextNeeds.hasRestlessAndConcentration &&
      mixSettings.avoidConcentrationNearRestless !== 0
    ) {
      updates.avoidConcentrationNearRestless = 0;
    }

    if (!nextNeeds.hasShy && mixSettings.avoidShyAlone !== 0) {
      updates.avoidShyAlone = 0;
    }

    if (
      !nextNeeds.hasNeedsFrontSeat &&
      mixSettings.preferFrontForNeedsFrontSeat !== 0
    ) {
      updates.preferFrontForNeedsFrontSeat = 0;
    }

    if (!nextNeeds.hasWishPartner && mixSettings.considerWishPartners !== 0) {
      updates.considerWishPartners = 0;
    }

    if (!nextNeeds.hasAvoidPartner && mixSettings.avoidConflictPartners !== 0) {
      updates.avoidConflictPartners = 0;
    }

    if (
      !nextNeeds.hasPerformance &&
      (mixSettings.peerTutoring !== 0 ||
        mixSettings.homogeneousPerformanceGroups !== 0)
    ) {
      updates.peerTutoring = 0;
      updates.homogeneousPerformanceGroups = 0;
    }

    if (
      !nextNeeds.hasHeightData &&
      mixSettings.preferFrontForSmallerStudents !== 0
    ) {
      updates.preferFrontForSmallerStudents = 0;
    }

    if (!nextNeeds.hasWindowPreference && mixSettings.preferWindowSeats !== 0) {
      updates.preferWindowSeats = 0;
    }

    if (!nextNeeds.hasDoorPreference && mixSettings.preferDoorSeats !== 0) {
      updates.preferDoorSeats = 0;
    }

    if (Object.keys(updates).length > 0) {
      setMixSettings((prev) => ({ ...prev, ...updates }));
    }

    previousNeedsRef.current = nextNeeds;
  }, [currentNeeds, mixSettings, setMixSettings, activeClassId]);
}
