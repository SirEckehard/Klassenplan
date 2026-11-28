// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import {
  InspectorChoice,
  InspectorIcon,
  InspectorRow,
} from '@/components/shell/InspectorPanel';
import ToggleSwitch from '@/components/ui/controls/ToggleSwitch';
import type {
  ClassroomScene,
  PlanFeedback,
  PlanFeedbackRating,
  PlanUsage,
  SeatingArrangement,
  Student,
} from '@/types';
import { quietLinkClass } from '@/utils';
import {
  findPlanUsage,
  poorTableKey,
  withPoorTable,
} from '@/utils/data/planUsage';
import { CRITERIA_ICON_MAP } from '@/utils/ui/criteriaIcons';
import { usePlanFeedbackTables } from '@/hooks/plan/usePlanFeedbackTables';

/**
 * How a plan in use went (decision 0054), the same in a plan's inspector in
 * "Bibliothek" and in the plan layer's: one row, "Gut" or "Nicht gut" beside
 * the question, the option pressed again taking it back, and what each does
 * in its tooltip. With "Nicht gut" the tables where it did not work: on the
 * plan layer chosen on the stage, where they stand (`onPickTables`), the row
 * saying how many; in "Bibliothek", which has no stage, a row for each table
 * of two or more, named by who sat there — a table as the mixing reads the
 * room: tables pushed together round a corner or face to face are one, desks
 * pushed together in a row are their own and each join a double desk. What
 * it changes in the mixing is "Erfahrung"'s; while that criterion is off, a
 * sentence says the feedback waits for it.
 */
export default function PlanFeedbackRows({
  seating,
  scene,
  records,
  students,
  counts,
  onChange,
  feedback: given,
  onPickTables,
  picking = false,
}: {
  /** The plan's arrangement: its tables, and its record by its pairs */
  seating: SeatingArrangement;
  /** The room it was made in, whose tables may be pushed together */
  scene: ClassroomScene;
  /** The class's usage records */
  records: readonly PlanUsage[];
  /** The class, for first names that tell its students apart */
  students: readonly Student[];
  /** Whether "Erfahrung" counts in the class's mixing */
  counts: boolean;
  /** Feedback to keep, or null to take it back */
  onChange: (feedback: PlanFeedback | null) => void;
  /** The feedback as last given, before the records have it back */
  feedback?: PlanFeedback;
  /** Chooses the tables on the stage; without it they are rows here */
  onPickTables?: () => void;
  /** Whether the stage is asking for the tables now */
  picking?: boolean;
}) {
  const { t } = useTranslation('generator');
  const feedback =
    onPickTables !== undefined
      ? given
      : findPlanUsage(records, seating, scene)?.feedback;
  const tables = usePlanFeedbackTables(seating, scene, students);

  const poorTables = feedback?.poorTables ?? [];
  const chosen = new Set(poorTables.map(poorTableKey));
  const now = () => new Date().toISOString();

  const rate = (rating: PlanFeedbackRating | undefined) => {
    if (!rating) {
      onChange(null);
      return;
    }
    // An option pressed again comes in as none, so "Nicht gut" arrives
    // only for a plan that was not rated so: its tables start empty.
    onChange({ rating, at: now() });
    if (rating === 'poor' && tables.length > 0) onPickTables?.();
  };

  return (
    <>
      <InspectorRow
        label={t('planFeedback.label')}
        hint={t('planFeedback.hint')}
        icon={
          <InspectorIcon
            icon={CRITERIA_ICON_MAP.considerPlanFeedback}
            family="history"
          />
        }
        description={feedback && !counts ? t('planFeedback.off') : undefined}
      >
        <InspectorChoice
          value={feedback?.rating}
          options={[
            {
              value: 'good',
              label: t('planFeedback.ratedGood'),
              title: t('planFeedback.good'),
            },
            {
              value: 'poor',
              label: t('planFeedback.ratedPoor'),
              title: t('planFeedback.poor'),
            },
          ]}
          onChange={rate}
          label={t('planFeedback.label')}
        />
      </InspectorRow>
      {feedback?.rating === 'poor' &&
        tables.length > 0 &&
        (onPickTables ? (
          // On the name's edge, as a row's description: the icon's 14px
          // and the row's gap.
          <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pl-5.5 text-xs text-(--text-muted)">
            <span>
              {picking
                ? t('planFeedback.picking')
                : poorTables.length > 0
                  ? t('planFeedback.picked', { count: poorTables.length })
                  : t('planFeedback.pickedNone')}
            </span>
            {!picking && (
              <button
                type="button"
                onClick={onPickTables}
                className={`${quietLinkClass} underline pointer-coarse:min-h-11`}
              >
                {t('planFeedback.pickTables')}
              </button>
            )}
          </p>
        ) : (
          <div
            role="group"
            aria-label={t('planFeedback.tables')}
            className="flex flex-col"
          >
            <p className="text-xs text-(--text-muted)">
              {t('planFeedback.tables')}
            </p>
            {tables.map((table) => (
              <InspectorRow key={table.key} label={table.names} labelsControl>
                <ToggleSwitch
                  checked={chosen.has(table.key)}
                  onChange={(on) =>
                    onChange(withPoorTable(feedback, table.ids, on, now()))
                  }
                  label={t('planFeedback.table', { names: table.names })}
                  size="sm"
                />
              </InspectorRow>
            ))}
          </div>
        ))}
    </>
  );
}
