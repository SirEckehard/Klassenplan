// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import {
  ArrowCounterClockwiseIcon,
  ArrowsClockwiseIcon,
  ArrowsOutIcon,
  BroomIcon,
  CardsIcon,
  DiceThreeIcon,
  EyeIcon,
  FloppyDiskIcon,
  HandPointingIcon,
  UserMinusIcon,
  HeartBreakIcon,
  ImagesIcon,
  MagnifyingGlassIcon,
  MagnifyingGlassPlusIcon,
  ScalesIcon,
  SkipForwardIcon,
  StudentIcon,
  SunIcon,
} from '@phosphor-icons/react';
import type { HelpTopic } from '@/components/help/HelpTopicList';
import { VIEW_SETTING_ICONS } from '@/components/SeatingPlanGenerator/canvas/viewSettingIcons';
import { ENTITY_ICONS } from '@/components/shell/entityIcons';

/**
 * What the help says on the pages beside the workspace — the projection and
 * the class tools — kept apart from the workspace's topics, so a page opened
 * on its own loads only its own icons.
 */
export const PAGE_HELP_TOPICS = {
  present: [
    { key: 'help.present.studentView', icon: StudentIcon },
    { key: 'help.present.display', icon: EyeIcon },
    { key: 'help.present.contrast', icon: SunIcon },
    { key: 'help.present.size', icon: MagnifyingGlassPlusIcon },
    { key: 'help.present.pick', icon: HandPointingIcon },
    { key: 'help.present.absent', icon: UserMinusIcon },
    { key: 'help.present.fullscreen', icon: ArrowsOutIcon },
  ],
  whoIsNext: [
    { key: 'tools.whoIsNext.help.round', icon: HandPointingIcon },
    { key: 'tools.whoIsNext.help.skip', icon: SkipForwardIcon },
    { key: 'tools.whoIsNext.help.reset', icon: ArrowCounterClockwiseIcon },
  ],
  groups: [
    { key: 'tools.groups.help.draw', icon: DiceThreeIcon },
    // The distance partner's badge (`STUDENT_ATTRIBUTE_ICONS`), named here
    // so the tools' pages do not load the seats' whole appearance for it.
    { key: 'tools.groups.help.avoid', icon: HeartBreakIcon },
    { key: 'tools.groups.help.plan', icon: ENTITY_ICONS.plan },
  ],
  seatFinder: [
    { key: 'tools.seatFinder.help.search', icon: MagnifyingGlassIcon },
    { key: 'tools.seatFinder.help.seat', icon: ENTITY_ICONS.seats },
  ],
  duties: [
    { key: 'tools.duties.help.fair', icon: ScalesIcon },
    { key: 'tools.duties.help.rounds', icon: BroomIcon },
    { key: 'tools.duties.help.replace', icon: ArrowsClockwiseIcon },
    { key: 'tools.duties.help.saved', icon: FloppyDiskIcon },
  ],
  nameGame: [
    { key: 'pages:nameGame.help.photos', icon: VIEW_SETTING_ICONS.photos },
    { key: 'pages:nameGame.help.quiz', icon: ImagesIcon },
    { key: 'pages:nameGame.help.memory', icon: CardsIcon },
  ],
} satisfies Record<string, readonly HelpTopic[]>;
