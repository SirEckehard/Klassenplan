// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Student } from '@/types';
import type { CircleLayout } from '@/types/Circle';
import {
  summarizeCircle,
  type CirclePair,
  type CircleSummary,
} from '@/utils/algorithm/circleSummary';
import {
  getDisplayNameForMode,
  getStatisticStatusMeta,
  resolveLocale,
  type NameDisplayMode,
} from '@/utils';
import { useNameLabels } from '@/hooks/student/useNameLabels';
import InspectorPortal from '@/components/shell/InspectorPortal';
import {
  InspectorBody,
  InspectorHeader,
  InspectorSection,
} from '@/components/shell/InspectorPanel';

/** More than three names stop being a line and start being a list. */
const MAX_ITEMS = 3;

/**
 * What the circle came to, in the panel the table plan fills with its
 * criteria.
 *
 * The circle is not built from the criteria — it keeps table neighbours side
 * by side and restless students apart, nothing else — so this panel sets
 * nothing. It says how many table neighbours stayed together, which is what
 * the circle aims for.
 */
export default function CircleInspector({
  layout,
  nameDisplay,
}: {
  layout: CircleLayout | null;
  /** The rule the seats use, so a line names what is on them. */
  nameDisplay?: NameDisplayMode;
}) {
  const { t, i18n } = useTranslation(['generator', 'students']);
  const summary = React.useMemo(
    () => (layout ? summarizeCircle(layout) : null),
    [layout],
  );

  const students = React.useMemo(
    () =>
      (layout?.students ?? [])
        .map((position) => position?.student)
        .filter((student): student is Student => Boolean(student)),
    [layout],
  );
  const labels = useNameLabels(students, nameDisplay);
  const nameById = React.useMemo(
    () => new Map(students.map((student) => [student.id, student.name])),
    [students],
  );
  const listFormat = React.useMemo(
    () =>
      new Intl.ListFormat(resolveLocale(i18n.language), {
        style: 'long',
        type: 'conjunction',
      }),
    [i18n.language],
  );

  const title = t('circleView.title');

  if (!summary) {
    return (
      <InspectorPortal label={title}>
        <InspectorHeader title={title} />
      </InspectorPortal>
    );
  }

  const nameOf = (id: string) => {
    const name = nameById.get(id)?.trim();
    return name
      ? getDisplayNameForMode(name, 'full', nameDisplay, labels)
      : t('students:studentList.newStudent');
  };
  const formatList = (items: string[]) =>
    items.length > MAX_ITEMS
      ? t('circleView.inspector.andMore', {
          names: items.slice(0, MAX_ITEMS).join(', '),
          more: items.length - MAX_ITEMS,
        })
      : listFormat.format(items);
  const formatPairs = (pairs: CirclePair[]) =>
    formatList(
      pairs.map(([first, second]) =>
        t('circleView.inspector.pair', {
          first: nameOf(first),
          second: nameOf(second),
        }),
      ),
    );

  return (
    <InspectorPortal label={title}>
      <InspectorHeader title={title} />
      <InspectorBody>
        <InspectorSection
          title={t('circleView.inspector.tableNeighbors.title')}
        >
          <TableNeighbors
            neighbors={summary.tableNeighbors}
            formatPairs={formatPairs}
          />
        </InspectorSection>
      </InspectorBody>
    </InspectorPortal>
  );
}

/**
 * How many table neighbours stayed side by side: the bar and the percentage
 * the criteria use in the table plan, the counting in words below them.
 */
function TableNeighbors({
  neighbors,
  formatPairs,
}: {
  neighbors: CircleSummary['tableNeighbors'];
  formatPairs: (pairs: CirclePair[]) => string;
}) {
  const { t } = useTranslation('generator');
  const { total, kept, separated } = neighbors;

  if (total === 0) {
    return (
      <p className="text-xs leading-relaxed text-(--text-muted)">
        {t('circleView.inspector.tableNeighbors.none')}
      </p>
    );
  }

  const percentage = Math.round((kept.length / total) * 100);
  const { dotClass } = getStatisticStatusMeta(percentage);
  const sentence =
    kept.length === total
      ? t('circleView.inspector.tableNeighbors.allKept', { count: total })
      : kept.length === 0
        ? t('circleView.inspector.tableNeighbors.noneKept', { count: total })
        : t('circleView.inspector.tableNeighbors.someKept', {
            count: kept.length,
            total,
          });

  return (
    <>
      {/* The sentence below says the same in words, so the bar stays out of
          the accessibility tree. */}
      <div
        aria-hidden="true"
        className="flex items-center gap-2 text-xs tabular-nums"
      >
        <span className="h-1 flex-1 overflow-hidden rounded-full bg-(--surface-sunken)">
          <span
            className={`block h-1 rounded-full ${dotClass} transition-[width] duration-300 motion-reduce:transition-none`}
            style={{ width: `${percentage}%` }}
          />
        </span>
        <span className="shrink-0 text-(--text-muted)">
          {t('mix.fulfillment.value', { percentage })}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-(--text-page)">{sentence}</p>
      {separated.length > 0 && (
        <p className="text-xs leading-relaxed text-(--text-muted)">
          {t('circleView.inspector.tableNeighbors.separated', {
            pairs: formatPairs(separated),
          })}
        </p>
      )}
    </>
  );
}
