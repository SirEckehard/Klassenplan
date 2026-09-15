// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The sample class behind "Beispielklasse laden".
 *
 * A first visit used to start with an empty wizard: nothing to look at until a
 * whole class had been typed in or imported. The sample class fills that gap
 * with 24 invented students whose attributes exercise every criterion the
 * algorithm knows — restlessness, partner wishes, language levels, social
 * roles, seat preferences, performance — plus a furnished room, so steps 2 and
 * 3 can be tried straight away.
 *
 * Everything here is plain data. The class is stored like any other class: no
 * marker, no special case in the persistence layer or the backup format
 * (docs/decisions/0015-onboarding-sample-class-and-tour.md).
 */
import arrangeTables from '@/utils/algorithm/autoArrange';
import {
  DEFAULT_BOARD_FEATURE,
  DEFAULT_DOOR_FEATURES,
  DEFAULT_WINDOW_FEATURES,
  generateId,
  getTablePresets,
} from '@/utils';
import type {
  ClassroomScene,
  ClassSummary,
  Gender,
  HeightCategory,
  LanguageSkillLevel,
  SocialRole,
  Student,
} from '@/types';

export type DemoClassLanguage = 'de' | 'en';

interface DemoStudentBlueprint {
  /** Names per UI language, picked once when the class is created. */
  names: Record<DemoClassLanguage, string>;
  gender: Gender;
  height?: HeightCategory;
  restless?: boolean;
  shy?: boolean;
  concentrationIssues?: boolean;
  needsFrontSeat?: boolean;
  performance?: 'strong' | 'weak';
  languageSkill?: LanguageSkillLevel;
  socialRole?: SocialRole;
  prefersWindow?: boolean;
  prefersDoor?: boolean;
  /** Indices into {@link DEMO_STUDENTS}; resolved to ids when the class is built. */
  wishes?: number[];
  avoids?: number[];
}

/**
 * Three mutual wish pairs, four one-sided wishes and three avoid wishes — none
 * of them contradicting another, so the statistics show what a criterion does
 * rather than a conflict the teacher would have to untangle first.
 */
const DEMO_STUDENTS: readonly DemoStudentBlueprint[] = [
  {
    names: { de: 'Emma Becker', en: 'Olivia Carter' },
    gender: 'girl',
    height: 'medium',
    performance: 'strong',
    socialRole: 'mediator',
    wishes: [8],
  },
  {
    names: { de: 'Ben Schulz', en: 'Jack Thompson' },
    gender: 'boy',
    height: 'tall',
    restless: true,
    wishes: [5],
    avoids: [11],
  },
  {
    names: { de: 'Aylin Yıldız', en: 'Aisha Patel' },
    gender: 'girl',
    height: 'small',
    shy: true,
    languageSkill: 'intermediate',
    wishes: [6],
  },
  {
    names: { de: 'Noah Wagner', en: 'Noah Bennett' },
    gender: 'boy',
    height: 'medium',
    concentrationIssues: true,
    performance: 'weak',
  },
  {
    names: { de: 'Sofia Rossi', en: 'Sofia Garcia' },
    gender: 'girl',
    height: 'tall',
    socialRole: 'socialHub',
    prefersWindow: true,
  },
  {
    names: { de: 'Elias Hoffmann', en: 'Ethan Brooks' },
    gender: 'boy',
    height: 'medium',
    restless: true,
    wishes: [1],
  },
  {
    names: { de: 'Lina Schneider', en: 'Lily Morgan' },
    gender: 'girl',
    height: 'small',
    needsFrontSeat: true,
    wishes: [2],
  },
  {
    names: { de: 'Mehmet Demir', en: 'Omar Hassan' },
    gender: 'boy',
    height: 'tall',
    languageSkill: 'daz',
    socialRole: 'leader',
  },
  {
    names: { de: 'Hannah Krüger', en: 'Grace Kim' },
    gender: 'girl',
    height: 'medium',
    performance: 'strong',
    wishes: [0],
  },
  {
    names: { de: 'Jonas Richter', en: 'Oscar Hughes' },
    gender: 'boy',
    height: 'medium',
    restless: true,
    avoids: [1],
  },
  {
    names: { de: 'Zeynep Kaya', en: 'Priya Shah' },
    gender: 'girl',
    height: 'medium',
    shy: true,
    languageSkill: 'fluent',
  },
  {
    names: { de: 'Finn Neumann', en: "Finn O'Connor" },
    gender: 'boy',
    height: 'small',
    needsFrontSeat: true,
    concentrationIssues: true,
  },
  {
    names: { de: 'Mia Wolf', en: 'Mia Robinson' },
    gender: 'girl',
    height: 'tall',
    performance: 'strong',
    socialRole: 'leader',
  },
  {
    names: { de: 'Luca Bianchi', en: 'Luca Rossi' },
    gender: 'boy',
    height: 'medium',
    languageSkill: 'beginner',
    wishes: [7],
  },
  {
    names: { de: 'Amira Haddad', en: 'Amira Haddad' },
    gender: 'girl',
    height: 'small',
    languageSkill: 'daz',
    wishes: [10],
  },
  {
    names: { de: 'Paul Zimmermann', en: 'Samuel Wright' },
    gender: 'boy',
    height: 'tall',
    socialRole: 'loner',
    prefersDoor: true,
  },
  {
    names: { de: 'Nele Braun', en: 'Chloe Turner' },
    gender: 'girl',
    height: 'medium',
    performance: 'weak',
    wishes: [12],
  },
  {
    names: { de: 'Yusuf Aydın', en: 'Yusuf Aydin' },
    gender: 'boy',
    height: 'medium',
    socialRole: 'socialHub',
  },
  {
    names: { de: 'Clara Lehmann', en: 'Ruby Walsh' },
    gender: 'girl',
    height: 'small',
    concentrationIssues: true,
    prefersWindow: true,
  },
  {
    names: { de: 'Leon Hartmann', en: 'Leo Martin' },
    gender: 'boy',
    height: 'tall',
    performance: 'strong',
    avoids: [3],
  },
  {
    names: { de: 'Ida Nowak', en: 'Ava Nowak' },
    gender: 'girl',
    height: 'medium',
    shy: true,
    socialRole: 'loner',
  },
  {
    names: { de: 'Mats Jansen', en: 'Theo Clarke' },
    gender: 'boy',
    height: 'medium',
    performance: 'weak',
    wishes: [17],
  },
  {
    names: { de: 'Lea Fischer', en: 'Ella Foster' },
    gender: 'girl',
    height: 'tall',
  },
  {
    names: { de: 'Alex Kowalski', en: 'Alex Rivera' },
    gender: 'diverse',
    height: 'medium',
    socialRole: 'mediator',
  },
];

// The flags are a union type, so they are built as literals rather than from
// two independent booleans.
const performanceFlags = (performance: DemoStudentBlueprint['performance']) =>
  performance === 'strong'
    ? ({ performanceStrong: true, performanceWeak: false } as const)
    : performance === 'weak'
      ? ({ performanceStrong: false, performanceWeak: true } as const)
      : ({ performanceStrong: false, performanceWeak: false } as const);

/**
 * Build the sample students with fresh ids.
 *
 * @param language - Which name set to use; the names stay once created
 * @param createId - Id source, injectable for tests
 */
export function buildDemoStudents(
  language: DemoClassLanguage,
  createId: () => string = generateId,
): Student[] {
  const ids = DEMO_STUDENTS.map(() => createId());

  return DEMO_STUDENTS.map((blueprint, index) => ({
    id: ids[index],
    name: blueprint.names[language],
    gender: blueprint.gender,
    ...(blueprint.height ? { height: blueprint.height } : {}),
    restless: blueprint.restless ?? false,
    shy: blueprint.shy ?? false,
    concentrationIssues: blueprint.concentrationIssues ?? false,
    needsFrontSeat: blueprint.needsFrontSeat ?? false,
    wishPartnerId: null,
    avoidPartnerId: null,
    wishPartnerIds: (blueprint.wishes ?? []).map((partner) => ids[partner]),
    avoidPartnerIds: (blueprint.avoids ?? []).map((partner) => ids[partner]),
    prefersWindow: blueprint.prefersWindow ?? false,
    prefersDoor: blueprint.prefersDoor ?? false,
    ...(blueprint.languageSkill
      ? { languageSkill: blueprint.languageSkill }
      : {}),
    ...(blueprint.socialRole ? { socialRole: blueprint.socialRole } : {}),
    ...performanceFlags(blueprint.performance),
  }));
}

/**
 * A room that fits the class: double desks from the quick setup's own
 * arrangement, the board at the front, windows on the left and the door at the
 * back — enough for the window, door and front-seat criteria to mean something.
 */
export function buildDemoClassroomScene(studentCount: number): ClassroomScene {
  const tableCount = Math.ceil(
    studentCount / getTablePresets().double.seatCount,
  );

  return {
    totalStudents: studentCount,
    tables: arrangeTables('double', tableCount),
    features: [
      DEFAULT_BOARD_FEATURE,
      ...DEFAULT_WINDOW_FEATURES,
      ...DEFAULT_DOOR_FEATURES,
    ].map((feature) => ({ ...feature })),
  };
}

/**
 * The sample class among the teacher's classes, if one exists.
 *
 * The record carries no marker, so the name is what identifies it — compared
 * the way the repository compares names (ignoring case and surrounding
 * spaces). A renamed sample class counts as the teacher's own class from then
 * on.
 *
 * @param classes - The classes to search
 * @param demoClassNames - The sample class name in every UI language
 */
export function findDemoClass(
  classes: readonly ClassSummary[],
  demoClassNames: readonly string[],
): ClassSummary | null {
  const names = new Set(
    demoClassNames.map((name) => name.trim().toLowerCase()),
  );
  return (
    classes.find((entry) => names.has(entry.name.trim().toLowerCase())) ?? null
  );
}
