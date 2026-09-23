// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { CheckCircleIcon, WarningCircleIcon } from '@phosphor-icons/react';
import type { MixSettings, ScalarMixSettingKey, Student } from '@/types';
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
  InspectorRow,
  InspectorSection,
} from '@/components/shell/InspectorPanel';

/** More than three names stop being a line and start being a list. */
const MAX_ITEMS = 3;

type CriterionCheck = {
  key: ScalarMixSettingKey;
  label: string;
  hint?: string;
  met: boolean;
  value: string;
  /** Who it is about, where the check came out open. */
  detail?: string;
};

/**
 * What the circle came to, in the panel the table plan fills with its
 * criteria.
 *
 * The circle is not built from the criteria — it keeps table neighbours side
 * by side and restless students apart, nothing else — so this panel sets
 * nothing. It says how many table neighbours stayed together, which is what
 * the circle aims for, and checks the criteria that mean something in a ring
 * where everybody has two neighbours. Front, window, door and height have no
 * place in a circle and are left out; a criterion switched off for the plan
 * is not checked here either.
 */
export default function CircleInspector({
  layout,
  settings,
  nameDisplay,
}: {
  layout: CircleLayout | null;
  settings: Partial<MixSettings>;
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
      ? t('mix.reasons.andMore', {
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

  const checks = buildChecks(summary, settings, t, {
    names: (ids) => formatList(ids.map(nameOf)),
    pairs: formatPairs,
    name: nameOf,
  });

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
        {checks.length > 0 && (
          <InspectorSection title={t('circleView.inspector.criteria.title')}>
            {checks.map((check) => {
              const VerdictIcon = check.met
                ? CheckCircleIcon
                : WarningCircleIcon;
              return (
                <div key={check.key} className="flex flex-col gap-1">
                  <InspectorRow label={check.label} hint={check.hint}>
                    <VerdictIcon
                      size={14}
                      weight="fill"
                      aria-hidden="true"
                      className={
                        check.met
                          ? 'text-(--status-ok)'
                          : 'text-(--status-warn)'
                      }
                    />
                    <span className="text-xs tabular-nums text-(--text-muted)">
                      {check.value}
                    </span>
                  </InspectorRow>
                  {check.detail && (
                    <p className="text-xs leading-relaxed text-(--text-muted)">
                      {check.detail}
                    </p>
                  )}
                </div>
              );
            })}
          </InspectorSection>
        )}
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

/**
 * The criteria a ring can answer — who wished for whom, who asked for
 * distance, restlessness, genders. One is checked only while it is switched
 * on and somebody in the class gives it something to check.
 */
function buildChecks(
  summary: CircleSummary,
  settings: Partial<MixSettings>,
  t: TFunction,
  format: {
    names: (ids: string[]) => string;
    pairs: (pairs: CirclePair[]) => string;
    name: (id: string) => string;
  },
): CriterionCheck[] {
  const isOn = (key: ScalarMixSettingKey) => (settings[key] ?? 0) > 0;
  const label = (key: ScalarMixSettingKey) => t(`mix.criteria.${key}.label`);
  const checks: CriterionCheck[] = [];

  if (summary.wishes && isOn('considerWishPartners')) {
    const { total, waiting } = summary.wishes;
    checks.push({
      key: 'considerWishPartners',
      label: label('considerWishPartners'),
      hint: t('circleView.inspector.criteria.wishes.hint'),
      met: waiting.length === 0,
      value: t('circleView.inspector.criteria.wishes.value', {
        done: total - waiting.length,
        total,
      }),
      detail:
        waiting.length > 0
          ? t('circleView.inspector.criteria.wishes.waiting', {
              names: format.names(waiting),
            })
          : undefined,
    });
  }

  const pairCheck = (
    key: ScalarMixSettingKey,
    metKey: string,
    pairs: CirclePair[],
  ) =>
    checks.push({
      key,
      label: label(key),
      met: pairs.length === 0,
      value:
        pairs.length === 0
          ? t(metKey)
          : t('circleView.inspector.criteria.pairs', { count: pairs.length }),
      detail:
        pairs.length > 0
          ? t('circleView.inspector.criteria.beside', {
              pairs: format.pairs(pairs),
            })
          : undefined,
    });

  if (summary.distance && isOn('avoidConflictPartners')) {
    pairCheck(
      'avoidConflictPartners',
      'circleView.inspector.criteria.distance.met',
      summary.distance.pairs,
    );
  }
  if (summary.restless && isOn('avoidRestlessTogether')) {
    pairCheck(
      'avoidRestlessTogether',
      'circleView.inspector.criteria.restless.met',
      summary.restless.pairs,
    );
  }

  if (summary.gender && isOn('preferGenderMix')) {
    const { run } = summary.gender;
    checks.push({
      key: 'preferGenderMix',
      label: label('preferGenderMix'),
      hint: t('circleView.inspector.criteria.gender.hint'),
      met: run === null,
      value: run
        ? t('circleView.inspector.criteria.gender.run', { length: run.length })
        : t('circleView.inspector.criteria.gender.met'),
      detail: run
        ? t('circleView.inspector.criteria.gender.runRange', {
            first: format.name(run.firstId),
            last: format.name(run.lastId),
          })
        : undefined,
    });
  }

  return checks;
}
