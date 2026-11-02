// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import {
  AddressBookTabsIcon,
  AlignCenterVerticalSimpleIcon,
  ArmchairIcon,
  ChairIcon,
  CircleDashedIcon,
  FadersHorizontalIcon,
  GridNineIcon,
  HouseIcon,
  SquaresFourIcon,
  UsersThreeIcon,
  type Icon,
} from '@phosphor-icons/react';

/**
 * The icon each thing of the app wears wherever it stands — the layer switch,
 * the header's class menu, "Bibliothek", an inspector's header and the line
 * under its title — so a class looks like a class everywhere.
 */
export const ENTITY_ICONS = {
  class: AddressBookTabsIcon,
  room: HouseIcon,
  plan: GridNineIcon,
  circle: CircleDashedIcon,
  template: SquaresFourIcon,
  preset: FadersHorizontalIcon,
  students: UsersThreeIcon,
  tables: AlignCenterVerticalSimpleIcon,
  seats: ChairIcon,
  roomElements: ArmchairIcon,
} satisfies Record<string, Icon>;
