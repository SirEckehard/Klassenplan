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
