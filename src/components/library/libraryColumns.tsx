// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { TFunction } from 'i18next';
import {
  ClockCounterClockwiseIcon,
  GraduationCapIcon,
  GridNineIcon,
  ShuffleIcon,
  SquaresFourIcon,
  UserIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react';
import type { ClassroomTemplate, ClassSummary, PlanUsage } from '@/types';
import type { LibraryClass } from '@/hooks/library/useClassLibrary';
import { formatDate, formatDateAndTime, formatStoredDate } from '@/utils';
import { buildNeighborhoodStats, isCountedUsage } from '@/utils/data/planUsage';
import StudentAvatar from '@/components/students/StudentAvatar';
import RoomThumbnail from './RoomThumbnail';
import type { BrowserColumn, BrowserItem } from './ColumnBrowser';

/** What an entry of "Bibliothek" stands for. */
export type LibraryNode =
  | { kind: 'class'; classId: string }
  | { kind: 'templates' }
  | { kind: 'template'; templateId: number }
  | { kind: 'room'; classId: string; roomId: string }
  | { kind: 'mixes'; classId: string }
  | { kind: 'mix'; classId: string; mixId: number }
  | { kind: 'neighbours'; classId: string }
  | { kind: 'neighbourStudent'; classId: string; studentId: string }
  | {
      kind: 'neighbourPair';
      classId: string;
      studentId: string;
      neighbourId: string;
    }
  | { kind: 'plan'; classId: string; planId: string };

/** The key of an entry, unique across all columns. */
export function libraryKey(node: LibraryNode): string {
  switch (node.kind) {
    case 'class':
      return `class:${node.classId}`;
    case 'templates':
      return 'templates';
    case 'template':
      return `template:${node.templateId}`;
    case 'room':
      return `room:${node.classId}:${node.roomId}`;
    case 'mixes':
      return `mixes:${node.classId}`;
    case 'mix':
      return `mix:${node.classId}:${node.mixId}`;
    case 'neighbours':
      return `neighbours:${node.classId}`;
    case 'neighbourStudent':
      return `neighbourStudent:${node.classId}:${node.studentId}`;
    case 'neighbourPair':
      return `neighbourPair:${node.classId}:${node.studentId}:${node.neighbourId}`;
    case 'plan':
      return `plan:${node.classId}:${node.planId}`;
  }
}

/** The path that opens with the page: the open class, its room, its plan. */
export function defaultLibraryPath(
  openClassId: string | null,
  activeRoomId: string | null,
  activePlanId: string | null,
): string[] {
  if (!openClassId) return [];
  const path = [libraryKey({ kind: 'class', classId: openClassId })];
  if (!activeRoomId) return path;
  path.push(
    libraryKey({ kind: 'room', classId: openClassId, roomId: activeRoomId }),
  );
  if (activePlanId) {
    path.push(
      libraryKey({ kind: 'plan', classId: openClassId, planId: activePlanId }),
    );
  }
  return path;
}

/** Someone a student sat next to, in the plans that count. */
export interface Neighbour {
  studentId: string;
  /** In how many of those plans. */
  count: number;
  lastSeenAt: string;
}

/**
 * Who sat next to whom, per student: the pairs of the plans that count
 * (decision 0010), each neighbour once, most often first, then most recently.
 */
export function neighboursByStudent(
  planUsage: readonly PlanUsage[],
): Map<string, Neighbour[]> {
  const byStudent = new Map<string, Neighbour[]>();
  const add = (studentId: string, neighbour: Neighbour) => {
    const list = byStudent.get(studentId);
    if (list) list.push(neighbour);
    else byStudent.set(studentId, [neighbour]);
  };
  for (const stat of buildNeighborhoodStats(planUsage)) {
    const { count, lastSeenAt } = stat;
    add(stat.studentIdA, { studentId: stat.studentIdB, count, lastSeenAt });
    add(stat.studentIdB, { studentId: stat.studentIdA, count, lastSeenAt });
  }
  for (const list of byStudent.values()) {
    list.sort(
      (a, b) => b.count - a.count || b.lastSeenAt.localeCompare(a.lastSeenAt),
    );
  }
  return byStudent;
}

/** A quiet word after a name: what is open, what was saved by itself. */
function LibraryChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 rounded-full border border-(--border-card) px-1.5 py-px text-[11px] text-(--text-muted)">
      {children}
    </span>
  );
}

const thumbnailClass = 'h-7 w-10 shrink-0';
const iconSize = 18;

export interface LibraryColumns {
  columns: BrowserColumn[];
  /** Every entry shown, by key. */
  nodes: Map<string, LibraryNode>;
  /** The path that resolves: keys of entries that are still there. */
  path: string[];
  /** The name of every entry, for the path in the status bar. */
  labels: Map<string, string>;
}

/**
 * The columns of "Bibliothek" for a path (decision 0024): the classes
 * and the templates; a class's rooms, its recent mixes and neighbourhoods; a
 * room's plans, the mixes or the students; a student's neighbours; the
 * templates. A key of the path that names an
 * entry no longer there — deleted, or of another class — ends it.
 */
export function buildLibraryColumns({
  path,
  classes,
  openClassId,
  selected,
  loadingClass,
  templates,
  planUsage,
  t,
}: {
  path: string[];
  classes: ClassSummary[];
  openClassId: string | null;
  /** The class the path goes into, once it is read. */
  selected: LibraryClass | null;
  loadingClass: boolean;
  templates: ClassroomTemplate[];
  /** The plan usage record of the class the path goes into. */
  planUsage: readonly PlanUsage[];
  t: TFunction;
}): LibraryColumns {
  const nodes = new Map<string, LibraryNode>();
  const labels = new Map<string, string>();
  const add = (node: LibraryNode, item: Omit<BrowserItem, 'key'>) => {
    const key = libraryKey(node);
    nodes.set(key, node);
    labels.set(key, item.label);
    return { ...item, key };
  };
  const openChip = <LibraryChip>{t('library.chipOpen')}</LibraryChip>;

  const classItems = classes.map((summary) =>
    add(
      { kind: 'class', classId: summary.id },
      {
        label: summary.name,
        meta:
          summary.label ||
          t('shell.status.students', {
            count: summary.studentCount,
          }),
        leading: <GraduationCapIcon size={iconSize} />,
        badges: summary.id === openClassId ? openChip : undefined,
        isFolder: true,
      },
    ),
  );
  const templatesItem = add(
    { kind: 'templates' },
    {
      label: t('library.templates'),
      meta: t('library.templatesCount', { count: templates.length }),
      leading: <SquaresFourIcon size={iconSize} />,
      isFolder: true,
    },
  );

  const columns: BrowserColumn[] = [
    {
      key: 'classes',
      label: t('library.classes'),
      selectedKey: null,
      emptyText: t('library.emptyClasses'),
      groups: [
        { key: 'classes', items: classItems },
        { key: 'shared', items: [templatesItem] },
      ],
    },
  ];
  const resolved: string[] = [];

  const first = path[0] ? nodes.get(path[0]) : undefined;
  if (!first) {
    return { columns, nodes, path: resolved, labels };
  }
  columns[0].selectedKey = path[0];
  resolved.push(path[0]);

  // The templates belong to every class.
  if (first.kind === 'templates') {
    const items = templates.map((template) => {
      const seats = template.scene.tables.reduce(
        (sum, table) => sum + table.seatCount,
        0,
      );
      return add(
        { kind: 'template', templateId: template.id },
        {
          label: template.name,
          meta: [
            t('sceneInspector.tables', {
              count: template.scene.tables.length,
            }),
            t('sceneInspector.seats', { count: seats }),
          ].join(' · '),
          leading: (
            <RoomThumbnail scene={template.scene} className={thumbnailClass} />
          ),
        },
      );
    });
    const second = path[1] ? nodes.get(path[1]) : undefined;
    columns.push({
      key: 'templates',
      label: t('library.templates'),
      selectedKey: second ? path[1] : null,
      emptyText: t('library.emptyTemplates'),
      groups: [{ key: 'templates', items }],
    });
    if (second) resolved.push(path[1]);
    return { columns, nodes, path: resolved, labels };
  }

  if (first.kind !== 'class') {
    return { columns, nodes, path: resolved, labels };
  }
  const classId = first.classId;
  const library = selected?.id === classId ? selected : null;
  if (!library) {
    columns.push({
      key: `class:${classId}`,
      label: labels.get(path[0]) ?? '',
      selectedKey: null,
      emptyText: loadingClass ? t('library.loading') : undefined,
      groups: [],
    });
    return { columns, nodes, path: resolved, labels };
  }

  const roomItems = library.rooms.map((room) =>
    add(
      { kind: 'room', classId, roomId: room.id },
      {
        label: room.name,
        meta: t('library.plans', {
          count: library.plans.filter((plan) => plan.roomId === room.id).length,
        }),
        leading: (
          <RoomThumbnail scene={room.scene} className={thumbnailClass} />
        ),
        badges: library.isOpen && room.isOpen ? openChip : undefined,
        isFolder: true,
      },
    ),
  );
  const historyItems = [
    add(
      { kind: 'mixes', classId },
      {
        label: t('storage.mixHistory'),
        meta: t('library.mixesCount', { count: library.mixes.length }),
        leading: <ClockCounterClockwiseIcon size={iconSize} />,
        isFolder: true,
      },
    ),
    add(
      { kind: 'neighbours', classId },
      {
        label: t('storage.neighbors.tab'),
        meta: t('library.neighboursCount', {
          count: planUsage.filter(isCountedUsage).length,
        }),
        leading: <UsersThreeIcon size={iconSize} />,
        isFolder: true,
      },
    ),
  ];
  const second = path[1] ? nodes.get(path[1]) : undefined;
  columns.push({
    key: `class:${classId}`,
    label: library.name,
    selectedKey: second ? path[1] : null,
    groups: [
      { key: 'rooms', label: t('library.rooms'), items: roomItems },
      { key: 'history', label: t('library.history'), items: historyItems },
    ],
  });
  if (!second) {
    return { columns, nodes, path: resolved, labels };
  }
  resolved.push(path[1]);

  if (second.kind === 'room') {
    // Newest first: a plan saved anew is appended, and the auto-saved one
    // keeps the place it was first given.
    const plans = library.plans
      .filter((plan) => plan.roomId === second.roomId)
      .slice()
      .reverse();
    const items = plans.map((plan) =>
      add(
        { kind: 'plan', classId, planId: plan.id },
        {
          label: plan.name,
          meta: formatStoredDate(plan.date),
          leading: <GridNineIcon size={iconSize} />,
          badges:
            library.isOpen && plan.id === library.activePlanId ? (
              openChip
            ) : plan.autoSaved ? (
              <LibraryChip>{t('library.chipAutoSaved')}</LibraryChip>
            ) : undefined,
        },
      ),
    );
    const third = path[2] ? nodes.get(path[2]) : undefined;
    columns.push({
      key: path[1],
      label: labels.get(path[1]) ?? '',
      selectedKey: third ? path[2] : null,
      emptyText: t('library.emptyRoom'),
      groups: [{ key: 'plans', items }],
    });
    if (third) resolved.push(path[2]);
  } else if (second.kind === 'mixes') {
    const roomNames = new Map(
      library.rooms.map((room) => [room.id, room.name]),
    );
    const mixes = library.mixes
      .slice()
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const items = mixes.map((mix) =>
      add(
        { kind: 'mix', classId, mixId: mix.id },
        {
          label: formatDateAndTime(mix.timestamp),
          meta: mix.roomId ? roomNames.get(mix.roomId) : undefined,
          leading: <ShuffleIcon size={iconSize} />,
        },
      ),
    );
    const third = path[2] ? nodes.get(path[2]) : undefined;
    columns.push({
      key: path[1],
      label: t('storage.mixHistory'),
      selectedKey: third ? path[2] : null,
      emptyText: t('library.emptyMixes'),
      groups: [{ key: 'mixes', items }],
    });
    if (third) resolved.push(path[2]);
  } else if (second.kind === 'neighbours') {
    // A student per entry and their neighbours in the next column: a pair
    // of two full names does not fit a column, one name does.
    const neighbours = neighboursByStudent(planUsage);
    const studentById = new Map(
      library.students.map((student) => [student.id, student]),
    );
    const nameOf = (id: string) =>
      studentById.get(id)?.name || t('storage.neighbors.unknownStudent');
    // A face where the class has one, the plain figure otherwise.
    const studentLeading = (id: string) => {
      const student = studentById.get(id);
      return student?.hasPhoto ? (
        <StudentAvatar student={student} size={24} />
      ) : (
        <UserIcon size={iconSize} />
      );
    };
    const students = library.students
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
    const items = students.map((student) => {
      const count = neighbours.get(student.id)?.length ?? 0;
      return add(
        { kind: 'neighbourStudent', classId, studentId: student.id },
        {
          label: nameOf(student.id),
          meta:
            count > 0
              ? t('storage.neighbors.studentMeta', { count })
              : t('storage.neighbors.studentNone'),
          leading: studentLeading(student.id),
          isFolder: true,
        },
      );
    });
    const third = path[2] ? nodes.get(path[2]) : undefined;
    columns.push({
      key: path[1],
      label: t('storage.neighbors.tab'),
      selectedKey: third ? path[2] : null,
      emptyText: t('library.emptyNeighbours'),
      groups: [{ key: 'students', items }],
    });
    if (third?.kind !== 'neighbourStudent') {
      return { columns, nodes, path: resolved, labels };
    }
    resolved.push(path[2]);

    const pairItems = (neighbours.get(third.studentId) ?? []).map((neighbour) =>
      add(
        {
          kind: 'neighbourPair',
          classId,
          studentId: third.studentId,
          neighbourId: neighbour.studentId,
        },
        {
          label: nameOf(neighbour.studentId),
          meta: t('storage.neighbors.lastSeen', {
            date: formatDate(neighbour.lastSeenAt),
          }),
          leading: studentLeading(neighbour.studentId),
          badges: (
            <LibraryChip>
              {t('storage.neighbors.times', { count: neighbour.count })}
            </LibraryChip>
          ),
        },
      ),
    );
    const fourth = path[3] ? nodes.get(path[3]) : undefined;
    columns.push({
      key: path[2],
      label: nameOf(third.studentId),
      selectedKey: fourth ? path[3] : null,
      emptyText: t('storage.neighbors.emptyStudent', {
        name: nameOf(third.studentId),
      }),
      groups: [{ key: 'neighbours', items: pairItems }],
    });
    if (fourth) resolved.push(path[3]);
  }

  return { columns, nodes, path: resolved, labels };
}
