// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  InspectorChoice,
  InspectorIcon,
  InspectorRow,
} from '@/components/shell/InspectorPanel';
import ToggleSwitch from '@/components/ui/controls/ToggleSwitch';
import type {
  PlanFeedback,
  PlanFeedbackRating,
  PlanUsage,
  SeatingArrangement,
  Student,
} from '@/types';
import { buildNameLabels, getDisplayNameForMode } from '@/utils';
import { findPlanUsage } from '@/utils/data/planUsage';
import { CRITERIA_ICON_MAP } from '@/utils/ui/criteriaIcons';

/** A table's students as feedback names them: their sorted ids. */
const tableKey = (ids: readonly string[]) => JSON.stringify(ids);

/**
 * How a plan in use went (decision 0054), the same in a plan's inspector in
 * "Bibliothek" and in the plan layer's: "Gut" or "Nicht gut", each saying
 * what it does and so a list under the question, the option pressed again
 * taking it back, and with "Nicht gut" a row for each table of two or more,
 * named by who sat there, to say where it did not work. What it changes in the mixing is "Erfahrung"'s; while that criterion
 * is off, a sentence says the feedback waits for it.
 */
export default function PlanFeedbackRows({
  seating,
  records,
  students,
  counts,
  onChange,
}: {
  /** The plan's arrangement: its tables, and its record by its pairs */
  seating: SeatingArrangement;
  /** The class's usage records */
  records: readonly PlanUsage[];
  /** The class, for first names that tell its students apart */
  students: readonly Student[];
  /** Whether "Erfahrung" counts in the class's mixing */
  counts: boolean;
  /** Feedback to keep, or null to take it back */
  onChange: (feedback: PlanFeedback | null) => void;
}) {
  const { t } = useTranslation('generator');
  const feedback = findPlanUsage(records, seating)?.feedback;

  const tables = React.useMemo(() => {
    const labels = buildNameLabels(
      students.map((student) => student.name),
      'firstName',
    );
    return seating
      .map((seats) => seats.filter((seat): seat is Student => Boolean(seat)))
      .filter((seated) => seated.length >= 2)
      .map((seated) => {
        const ids = seated.map((student) => student.id).sort();
        return {
          key: tableKey(ids),
          ids,
          names: seated
            .map((student) =>
              getDisplayNameForMode(student.name, 'full', 'firstName', labels),
            )
            .join(' · '),
        };
      });
  }, [seating, students]);

  const poorTables = feedback?.poorTables ?? [];
  const chosen = new Set(poorTables.map(tableKey));
  const now = () => new Date().toISOString();

  const rate = (rating: PlanFeedbackRating | undefined) => {
    if (!rating) {
      onChange(null);
      return;
    }
    // An option pressed again comes in as none, so "Nicht gut" arrives
    // only for a plan that was not rated so: its tables start empty.
    onChange({ rating, at: now() });
  };

  const choose = (ids: string[], on: boolean) => {
    const kept = poorTables.filter(
      (table) => tableKey(table) !== tableKey(ids),
    );
    const next = on ? [...kept, ids] : kept;
    onChange(
      next.length > 0
        ? { rating: 'poor', poorTables: next, at: now() }
        : { rating: 'poor', at: now() },
    );
  };

  return (
    <>
      <InspectorRow
        label={t('planFeedback.label')}
        hint={t('planFeedback.hint')}
        stacked
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
            { value: 'good', label: t('planFeedback.good') },
            { value: 'poor', label: t('planFeedback.poor') },
          ]}
          onChange={rate}
          label={t('planFeedback.label')}
          layout="list"
        />
      </InspectorRow>
      {feedback?.rating === 'poor' && tables.length > 0 && (
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
                onChange={(on) => choose(table.ids, on)}
                label={t('planFeedback.table', { names: table.names })}
                size="sm"
              />
            </InspectorRow>
          ))}
        </div>
      )}
    </>
  );
}
