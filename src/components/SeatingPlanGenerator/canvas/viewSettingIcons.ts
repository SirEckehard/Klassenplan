// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import {
  ArmchairIcon,
  ImageIcon,
  LinkSimpleIcon,
  TextAaIcon,
  UserSquareIcon,
  type Icon,
} from '@phosphor-icons/react';

/**
 * The icon each view setting wears — in the plan's toolbar and on the export
 * sheet's inspector alike, so a setting the teacher knows from the one is
 * found by its symbol in the other.
 */
export const VIEW_SETTING_ICONS = {
  photos: ImageIcon,
  names: TextAaIcon,
  badges: UserSquareIcon,
  features: ArmchairIcon,
  connections: LinkSimpleIcon,
} satisfies Record<string, Icon>;
