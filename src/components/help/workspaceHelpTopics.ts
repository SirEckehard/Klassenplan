// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import {
  ArrowSquareOutIcon,
  ArrowsOutCardinalIcon,
  BooksIcon,
  ChartBarIcon,
  CheckSquareIcon,
  ClockCounterClockwiseIcon,
  EyeIcon,
  FileIcon,
  FloppyDiskIcon,
  FolderPlusIcon,
  LockIcon,
  PencilLineIcon,
  PlusIcon,
  PrinterIcon,
  ShuffleIcon,
  SquaresFourIcon,
  UserIcon,
  UserPlusIcon,
} from '@phosphor-icons/react';
import type { HelpTopic } from '@/components/help/HelpTopicList';
import { VIEW_SETTING_ICONS } from '@/components/SeatingPlanGenerator/canvas/viewSettingIcons';
import { ENTITY_ICONS } from '@/components/shell/entityIcons';
import { STUDENT_ATTRIBUTE_ICONS } from '@/utils/ui/studentAppearance';

/**
 * What the help says on each screen of the workspace, in the order a teacher
 * meets it there. Each topic wears the icon the screen gives the same thing —
 * the toolbar's entry, the status bar's button, the inspector's heading.
 *
 * Only what the screen does not say by itself: the keys are listed under
 * "Tastenkürzel", the status bar's arrows name themselves.
 */
export const WORKSPACE_HELP_TOPICS = {
  students: [
    { key: 'help.students.classes', icon: ENTITY_ICONS.class },
    { key: 'help.students.add', icon: UserPlusIcon },
    { key: 'help.students.edit', icon: UserIcon },
    {
      key: 'help.students.partners',
      icon: STUDENT_ATTRIBUTE_ICONS.wishPartner,
    },
    { key: 'help.students.several', icon: CheckSquareIcon },
    { key: 'help.students.views', icon: SquaresFourIcon },
  ],
  layout: [
    { key: 'help.layout.setup', icon: ENTITY_ICONS.tables },
    { key: 'help.layout.add', icon: PlusIcon },
    { key: 'help.layout.move', icon: ArrowsOutCardinalIcon },
    { key: 'help.layout.edit', icon: PencilLineIcon },
    { key: 'help.layout.rooms', icon: ENTITY_ICONS.room },
    { key: 'help.layout.templates', icon: ENTITY_ICONS.template },
  ],
  plan: [
    { key: 'help.plan.criteria', icon: ENTITY_ICONS.preset },
    { key: 'help.plan.save', icon: FloppyDiskIcon },
    { key: 'help.plan.seats', icon: LockIcon },
    { key: 'help.plan.fulfilment', icon: ChartBarIcon },
    { key: 'help.plan.badges', icon: VIEW_SETTING_ICONS.badges },
    { key: 'help.plan.view', icon: VIEW_SETTING_ICONS.names },
  ],
  circle: [
    { key: 'help.circle.origin', icon: ShuffleIcon },
    { key: 'help.circle.seats', icon: LockIcon },
    { key: 'help.circle.connections', icon: VIEW_SETTING_ICONS.connections },
    { key: 'help.circle.save', icon: FloppyDiskIcon },
    // The seats' icons explain themselves in the circle as on the plan.
    { key: 'help.plan.badges', icon: VIEW_SETTING_ICONS.badges },
  ],
  export: [
    { key: 'help.export.views', icon: ENTITY_ICONS.plan },
    { key: 'help.export.sheetTitle', icon: PencilLineIcon },
    { key: 'help.export.format', icon: FileIcon },
    { key: 'help.export.content', icon: EyeIcon },
    { key: 'help.export.save', icon: PrinterIcon },
  ],
  library: [
    { key: 'help.library.columns', icon: BooksIcon },
    { key: 'help.library.edit', icon: PencilLineIcon },
    { key: 'help.library.open', icon: ArrowSquareOutIcon },
    { key: 'help.library.history', icon: ClockCounterClockwiseIcon },
    { key: 'help.library.add', icon: FolderPlusIcon },
  ],
} satisfies Record<string, readonly HelpTopic[]>;
