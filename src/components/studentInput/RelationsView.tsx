// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowsLeftRightIcon,
  GraphIcon,
  HeartBreakIcon,
  HeartIcon,
  WarningIcon,
} from '@phosphor-icons/react';
import type { Student } from '@/types';
import { useInspector } from '@/contexts/InspectorContext';
import { useStudentCard } from '@/hooks/student/useStudentCard';
import type { StudentCardSettings } from '@/hooks/student/useStudentCardSettings';
import StudentAvatar from '@/components/students/StudentAvatar';
import StudentCardLayer from '@/components/students/StudentCardLayer';
import {
  dataFamilyClass,
  describeClassRelations,
  listContainerClass,
  type ClassRelations,
} from '@/utils';

type Finding = 'contradictions' | 'namedByNobody' | 'withoutWish' | 'mutual';
type SortMode = 'class' | 'rarely' | 'often';

const FINDINGS: readonly Finding[] = [
  'contradictions',
  'namedByNobody',
  'withoutWish',
  'mutual',
];
const SORT_MODES: readonly SortMode[] = ['class', 'rarely', 'often'];

/**
 * Who wants to sit next to whom — the whole class in one reading
 * (decision 0052).
 *
 * The same wishes are edited one student at a time in the inspector, which
 * answers "what do I know about Ben". This answers what only the class as a
 * whole can: does anybody want to sit next to Ben, does a wish run into a
 * wish to sit apart, who has nobody named them yet. Those come first, as
 * figures that open on who they are; below, a line per student — the wishes
 * in their order, how often the student was named, whom they keep apart
 * from — sortable by how often they were named. It lives on the class
 * layer, which only the teacher sees; nothing of it reaches a projection or
 * an export.
 */
export default function RelationsView({
  students,
  cards,
}: {
  students: Student[];
  /** Whether a face opens its profile card; omitted, it does. */
  cards?: StudentCardSettings;
}) {
  const { t } = useTranslation('students');
  const { selectStudent, selection } = useInspector();
  const openedId = selection?.kind === 'student' ? selection.id : null;
  const [finding, setFinding] = React.useState<Finding | null>(null);
  const [sortMode, setSortMode] = React.useState<SortMode>('class');
  // A small face explains whom it shows, as a name in the class list does.
  // In state, not a ref: the view is drawn only once the class has a wish.
  const [rootElement, setRootElement] = React.useState<HTMLDivElement | null>(
    null,
  );
  const { card } = useStudentCard(rootElement, { kinds: cards });

  const relations = React.useMemo(
    () => describeClassRelations(students),
    [students],
  );
  const byId = React.useMemo(
    () => new Map(students.map((student) => [student.id, student])),
    [students],
  );

  const sorted = React.useMemo(() => {
    if (sortMode === 'class') return students;
    const named = (student: Student) =>
      relations.byId.get(student.id)?.namedBy.length ?? 0;
    // `sort` is stable: equals keep the class's order.
    return [...students].sort((a, b) =>
      sortMode === 'rarely' ? named(a) - named(b) : named(b) - named(a),
    );
  }, [relations, sortMode, students]);

  if (!relations.hasAny) {
    return (
      <div
        className={`${listContainerClass} flex flex-col items-center gap-3 px-6 py-12 text-center`}
      >
        <GraphIcon
          size={28}
          className="text-(--text-muted)"
          aria-hidden="true"
        />
        <p className="text-sm font-semibold">{t('relations.noRelations')}</p>
        <p className="max-w-md text-xs leading-relaxed text-(--text-muted)">
          {t('relations.noRelationsHint')}
        </p>
      </div>
    );
  }

  const nameOf = (student: Student) =>
    student.name.trim() || t('relations.unknownStudent');
  const countOf = (kind: Finding) =>
    kind === 'contradictions'
      ? relations.contradictions.length
      : kind === 'namedByNobody'
        ? relations.namedByNobody.length
        : kind === 'withoutWish'
          ? relations.withoutWish.length
          : relations.mutualPairs.length;
  const detailsId = 'relations-finding';

  return (
    <div ref={setRootElement} className="@container flex flex-col gap-4">
      <p className="text-sm text-(--text-muted)">
        {t('relations.description')}
      </p>

      <section
        aria-label={t('relations.findings.title')}
        className="flex flex-col gap-2"
      >
        <div className="grid grid-cols-2 gap-2 @2xl:grid-cols-4">
          {FINDINGS.map((kind) => {
            const count = countOf(kind);
            const alert = kind === 'contradictions' && count > 0;
            const open = finding === kind;
            return (
              <button
                key={kind}
                type="button"
                disabled={count === 0}
                aria-expanded={open}
                aria-controls={open ? detailsId : undefined}
                onClick={() => setFinding(open ? null : kind)}
                className={`flex min-h-16 cursor-pointer flex-col items-start gap-0.5 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring) disabled:cursor-default disabled:opacity-60 ${
                  open
                    ? 'border-(--text-page) bg-(--surface-sunken)'
                    : 'border-(--border-card) bg-(--surface-card) enabled:hover:bg-(--surface-sunken)'
                }`}
              >
                <span
                  className={`flex items-center gap-1.5 text-xl font-bold tabular-nums ${
                    alert ? 'text-(--status-alert)' : 'text-(--text-page)'
                  }`}
                >
                  {alert && <WarningIcon size={18} aria-hidden="true" />}
                  {count}
                </span>
                <span className="text-xs leading-tight text-(--text-muted)">
                  {t(`relations.findings.${kind}`, { count })}
                </span>
              </button>
            );
          })}
        </div>
        {finding && (
          <div
            id={detailsId}
            className={`${listContainerClass} flex flex-col gap-2 p-3`}
          >
            <FindingDetails
              kind={finding}
              relations={relations}
              nameOf={nameOf}
              onOpen={selectStudent}
            />
          </div>
        )}
      </section>

      <section
        aria-label={t('relations.title')}
        className={`${listContainerClass} overflow-hidden`}
      >
        <div
          role="group"
          aria-label={t('relations.sort.label')}
          className="flex flex-wrap items-center gap-1.5 border-b border-(--border-card) bg-(--surface-sunken) px-3 py-2"
        >
          <span className="mr-1 text-xs text-(--text-muted)">
            {t('relations.sort.label')}
          </span>
          {SORT_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={sortMode === mode}
              onClick={() => setSortMode(mode)}
              className={`h-7 cursor-pointer rounded-full border px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring) pointer-coarse:h-9 ${
                sortMode === mode
                  ? 'border-(--border-option-selected) bg-(--surface-option-selected) font-semibold text-(--text-page)'
                  : 'border-(--border-card) bg-(--surface-card) text-(--text-page) hover:bg-(--surface-sunken)'
              }`}
            >
              {t(`relations.sort.${mode}`)}
            </button>
          ))}
        </div>
        <RelationsHeader />
        <ul className="m-0 list-none p-0">
          {sorted.map((student) => (
            <RelationsRow
              key={student.id}
              student={student}
              relations={relations}
              byId={byId}
              nameOf={nameOf}
              opened={student.id === openedId}
              onOpen={selectStudent}
            />
          ))}
        </ul>
      </section>
      <StudentCardLayer card={card} allStudents={students} />
    </div>
  );
}

/** A face and a name that open the student, inside a finding. */
function PersonButton({
  student,
  nameOf,
  onOpen,
}: {
  student: Student;
  nameOf: (student: Student) => string;
  onOpen: (id: string) => void;
}) {
  const { t } = useTranslation('students');
  return (
    <button
      type="button"
      onClick={() => onOpen(student.id)}
      aria-label={t('listStatus.openStudent', { name: nameOf(student) })}
      className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-1.5 text-sm text-(--text-page) hover:bg-(--surface-sunken) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring) pointer-coarse:min-h-11"
    >
      <StudentAvatar student={student} size={24} />
      {nameOf(student)}
    </button>
  );
}

/** Who a finding is about, opened under the figures. */
function FindingDetails({
  kind,
  relations,
  nameOf,
  onOpen,
}: {
  kind: Finding;
  relations: ClassRelations;
  nameOf: (student: Student) => string;
  onOpen: (id: string) => void;
}) {
  const { t } = useTranslation('students');
  const person = (student: Student) => (
    <PersonButton student={student} nameOf={nameOf} onOpen={onOpen} />
  );

  if (kind === 'contradictions') {
    return (
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {relations.contradictions.map(({ from, to }) => (
          <li
            key={`${from.id}>${to.id}`}
            className="flex flex-wrap items-center gap-x-1 text-sm"
          >
            <WarningIcon
              size={16}
              aria-hidden="true"
              className="mr-1 shrink-0 text-(--status-alert)"
            />
            {person(from)}
            <HeartIcon
              size={14}
              aria-hidden="true"
              className={`${dataFamilyClass.social} text-(--data-chip-text)`}
            />
            {person(to)}
            <span className="text-(--text-muted)">
              {t('relations.contradiction', {
                from: nameOf(from),
                to: nameOf(to),
              })}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  if (kind === 'mutual') {
    return (
      <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0">
        {relations.mutualPairs.map(([a, b]) => (
          <li
            key={`${a.id}~${b.id}`}
            className="flex items-center"
            aria-label={t('relations.mutualPair', {
              a: nameOf(a),
              b: nameOf(b),
            })}
          >
            {person(a)}
            <ArrowsLeftRightIcon
              size={16}
              weight="bold"
              aria-hidden="true"
              className={`${dataFamilyClass.social} text-(--data-chip-text)`}
            />
            {person(b)}
          </li>
        ))}
      </ul>
    );
  }

  const who =
    kind === 'namedByNobody' ? relations.namedByNobody : relations.withoutWish;
  return (
    <>
      <ul className="m-0 flex list-none flex-wrap gap-1 p-0">
        {who.map((student) => (
          <li key={student.id}>{person(student)}</li>
        ))}
      </ul>
      <p className="text-xs text-(--text-muted)">
        {t(
          kind === 'namedByNobody'
            ? 'relations.namedByNobodyHint'
            : 'relations.withoutWishHint',
        )}
      </p>
    </>
  );
}

/**
 * Where the list is wide enough (`@2xl`), a line is four columns — the
 * student, the wishes, who named them, whom they keep apart from — and the
 * faces carry names; below it the line folds and the faces stand alone.
 */
const ROW_GRID_CLASS =
  '@2xl:grid @2xl:grid-cols-[minmax(10rem,14rem)_repeat(3,minmax(0,1fr))] @2xl:gap-x-4';

/** The column captions, over the lines where they are columns. */
function RelationsHeader() {
  const { t } = useTranslation('students');
  return (
    <div
      aria-hidden="true"
      className={`hidden border-b border-(--border-card) px-3 py-1.5 text-caption font-semibold tracking-wider text-(--text-muted) uppercase ${ROW_GRID_CLASS}`}
    >
      <span>{t('relations.columns.student')}</span>
      <span>{t('relations.columns.wishes')}</span>
      <span>{t('relations.columns.namedBy')}</span>
      <span>{t('relations.columns.avoids')}</span>
    </div>
  );
}

type FaceTone = 'wish' | 'named' | 'avoid';

/**
 * A classmate on a line: the face alone where the line is narrow, the face
 * and the name in a pill where it is wide — a wish in the social family's
 * fill, a distance wish as its outline, a classmate who named this one on
 * paper. A wish's rank, or both arrows for a returned one, sits on the face.
 * Explains itself on hover or a long press (`data-card-profile`).
 */
function Face({
  student,
  name,
  tone,
  mark,
}: {
  student: Student;
  name: string;
  tone: FaceTone;
  mark?: React.ReactNode;
}) {
  const pill =
    tone === 'wish'
      ? '@2xl:bg-(--data-chip-surface) @2xl:text-(--data-chip-text)'
      : tone === 'avoid'
        ? '@2xl:border @2xl:border-dashed @2xl:border-(--data-chip-accent) @2xl:text-(--data-chip-text)'
        : '@2xl:bg-(--surface-sunken) @2xl:text-(--text-page)';
  return (
    <span
      data-card-profile={student.id}
      className={`${dataFamilyClass.social} inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full @2xl:py-0.5 @2xl:pr-2.5 @2xl:pl-0.5 ${pill}`}
    >
      <span className="relative inline-flex shrink-0">
        <StudentAvatar student={student} size={26} />
        {mark !== undefined && (
          <span className="absolute -right-1.5 -bottom-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-(--data-chip-accent) px-0.5 text-micro leading-none font-bold text-(--surface-card)">
            {mark}
          </span>
        )}
      </span>
      <span className="hidden min-w-0 truncate text-control @2xl:inline">
        {name}
      </span>
    </span>
  );
}

/**
 * One student's relations on one line: the wishes with their rank — a
 * returned wish with both arrows instead —, who named the student, the
 * classmates kept apart from. One button that opens the student, as a row
 * of the class list is.
 */
function RelationsRow({
  student,
  relations,
  byId,
  nameOf,
  opened,
  onOpen,
}: {
  student: Student;
  relations: ClassRelations;
  byId: ReadonlyMap<string, Student>;
  nameOf: (student: Student) => string;
  opened: boolean;
  onOpen: (id: string) => void;
}) {
  const { t } = useTranslation('students');
  const own = relations.byId.get(student.id);
  if (!own) return null;
  const resolve = (ids: string[]) =>
    ids
      .map((id) => byId.get(id))
      .filter((other): other is Student => Boolean(other));
  const wishes = resolve(own.wishes);
  const avoids = resolve(own.avoids);
  const namedBy = resolve(own.namedBy);
  const summaryId = `relations-summary-${student.id}`;
  const none = t('relations.nobody');
  const empty = <span className="text-(--text-muted)">–</span>;

  return (
    <li
      className={`relative border-b border-(--border-card) last:border-b-0 pointer-coarse:touch-callout-none pointer-coarse:select-none ${
        opened ? 'bg-(--surface-sunken)' : ''
      }`}
    >
      {opened && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1 bg-(--border-option-selected)"
        />
      )}
      <button
        type="button"
        onClick={() => onOpen(student.id)}
        aria-current={opened ? 'true' : undefined}
        aria-label={t('listStatus.openStudent', { name: nameOf(student) })}
        aria-describedby={summaryId}
        className={`flex w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2 text-left hover:bg-(--surface-sunken) focus-visible:ring-2 focus-visible:ring-(--focus-ring) focus-visible:outline-none focus-visible:ring-inset @2xl:min-h-14 ${ROW_GRID_CLASS}`}
      >
        <span className="flex min-w-0 flex-1 items-center gap-3">
          <StudentAvatar student={student} size={32} />
          <span className="truncate text-name text-(--text-page)">
            {nameOf(student)}
          </span>
          {own.inContradiction && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-(--status-alert-surface) px-1.5 py-0.5 text-caption font-semibold text-(--status-alert)">
              <WarningIcon size={12} aria-hidden="true" />
              {t('relations.contradictionTag')}
            </span>
          )}
        </span>
        {/* Below `@2xl` the relations fold under the name; above it this
            wrapper steps aside, and its three parts are the grid's columns. */}
        <span
          aria-hidden="true"
          className="flex min-w-0 basis-full flex-wrap items-center gap-x-4 gap-y-1 pl-11 text-xs @2xl:contents"
        >
          <span
            className={`${dataFamilyClass.social} flex min-w-28 flex-wrap items-center gap-x-2.5 gap-y-1`}
          >
            <HeartIcon
              size={14}
              className="shrink-0 text-(--data-chip-text) @2xl:hidden"
            />
            {wishes.length === 0
              ? empty
              : wishes.map((other, index) => (
                  <Face
                    key={other.id}
                    student={other}
                    name={nameOf(other)}
                    tone="wish"
                    mark={
                      own.mutual.has(other.id) ? (
                        <ArrowsLeftRightIcon size={9} weight="bold" />
                      ) : (
                        index + 1
                      )
                    }
                  />
                ))}
          </span>
          <span className="flex min-w-20 flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="text-(--text-muted) tabular-nums @2xl:hidden">
              {t('relations.namedCount', { count: namedBy.length })}
            </span>
            <span className="hidden flex-wrap items-center gap-x-2.5 gap-y-1 @2xl:flex">
              {namedBy.length === 0
                ? empty
                : namedBy.map((other) => (
                    <Face
                      key={other.id}
                      student={other}
                      name={nameOf(other)}
                      tone="named"
                    />
                  ))}
            </span>
          </span>
          <span
            className={`${dataFamilyClass.social} flex-wrap items-center gap-x-2.5 gap-y-1 ${
              avoids.length > 0 ? 'flex' : 'hidden @2xl:flex'
            }`}
          >
            <HeartBreakIcon
              size={14}
              className="shrink-0 text-(--data-chip-text) @2xl:hidden"
            />
            {avoids.length === 0
              ? empty
              : avoids.map((other) => (
                  <Face
                    key={other.id}
                    student={other}
                    name={nameOf(other)}
                    tone="avoid"
                  />
                ))}
          </span>
        </span>
      </button>
      <span id={summaryId} className="sr-only">
        {t('relations.summary', {
          wishes: wishes.length
            ? wishes
                .map((other, index) =>
                  own.mutual.has(other.id)
                    ? t('relations.mutualWish', { name: nameOf(other) })
                    : t('relations.rankedWish', {
                        rank: index + 1,
                        name: nameOf(other),
                      }),
                )
                .join(', ')
            : none,
          named: namedBy.length
            ? t('relations.namedByList', {
                names: namedBy.map(nameOf).join(', '),
              })
            : t('relations.namedCount', { count: 0 }),
          avoids: avoids.length ? avoids.map(nameOf).join(', ') : none,
        })}
      </span>
    </li>
  );
}
