// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { Icon } from '@phosphor-icons/react';
import {
  RepeatIcon,
  ActivityIcon,
  BrainIcon,
  SmileyNervousIcon,
  PersonSimpleIcon,
  HeartIcon,
  HeartBreakIcon,
  EqualsIcon,
  NotEqualsIcon,
  MapPinAreaIcon,
  ArrowsVerticalIcon,
  ImageIcon,
  DoorIcon,
  TranslateIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react';
import type { ScalarMixSettingKey } from '@/types';
import type { DataFamily } from './designTokens';

export const CRITERIA_ICON_MAP: Record<ScalarMixSettingKey, Icon> = {
  avoidPreviousPairs: RepeatIcon,
  avoidRestlessTogether: ActivityIcon,
  avoidConcentrationTogether: BrainIcon,
  avoidConcentrationNearRestless: BrainIcon,
  avoidShyAlone: SmileyNervousIcon,
  preferGenderMix: PersonSimpleIcon,
  considerWishPartners: HeartIcon,
  avoidConflictPartners: HeartBreakIcon,
  peerTutoring: NotEqualsIcon,
  homogeneousPerformanceGroups: EqualsIcon,
  preferFrontForNeedsFrontSeat: MapPinAreaIcon,
  preferFrontForSmallerStudents: ArrowsVerticalIcon,
  preferWindowSeats: ImageIcon,
  preferDoorSeats: DoorIcon,
  preferLanguageMixing: TranslateIcon,
  distributeSocialRoles: UsersThreeIcon,
};

/**
 * Which pedagogical family each criterion speaks for.
 *
 * A criterion that acts on a student attribute speaks in the family the
 * student chips use, so a criterion in the inspector and the attribute it acts
 * on carry one colour. Repetition acts on the plans already used, not on an
 * attribute, and has a family of its own. Colour never travels alone here
 * either: every row has its icon and its name.
 */
export const CRITERIA_FAMILY_MAP: Record<ScalarMixSettingKey, DataFamily> = {
  avoidRestlessTogether: 'behavior',
  avoidConcentrationTogether: 'behavior',
  avoidConcentrationNearRestless: 'behavior',
  avoidShyAlone: 'social',
  considerWishPartners: 'social',
  avoidConflictPartners: 'social',
  distributeSocialRoles: 'social',
  avoidPreviousPairs: 'history',
  peerTutoring: 'learning',
  homogeneousPerformanceGroups: 'learning',
  preferLanguageMixing: 'language',
  preferFrontForNeedsFrontSeat: 'space',
  preferFrontForSmallerStudents: 'space',
  preferWindowSeats: 'space',
  preferDoorSeats: 'space',
  preferGenderMix: 'person',
};
