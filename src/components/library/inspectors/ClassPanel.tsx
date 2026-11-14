// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import {
  InspectorBody,
  InspectorDeleteFooter,
  InspectorHeader,
  InspectorMediaTile,
  InspectorRow,
  InspectorSection,
} from '@/components/shell/InspectorPanel';
import InspectorTitleField from '@/components/shell/InspectorTitleField';
import { ENTITY_ICONS } from '@/components/shell/entityIcons';
import ClassMetadataFields from '@/components/students/ClassMetadataFields';
import type { UpdateClassMetadataPayload } from '@/types';
import {
  checkName,
  formatDate,
  formatStoredDate,
  MAX_NAME_LENGTH,
  neutralButtonClass,
} from '@/utils';
import { ValueRow } from './panelParts';

/**
 * A class: what it is called and what it holds — in "Bibliothek", and in the
 * class layer's inspector while no student is open there. The name is
 * changed in the header, as a student's is, and under it how many students
 * and rooms it holds; the school year, the notes, its plans and when it was
 * last opened are the panel's. A name another class carries is refused as
 * it is typed. The class goes with everything in it
 * only after the question the delete asks.
 */
export default function ClassPanel({
  name,
  label,
  notes,
  studentCount,
  roomCount,
  planCount,
  lastUsedAt,
  otherNames,
  onCommit,
  onDelete,
  renameRequest,
  markersReviewedAt,
  markerReviewWeeks,
  onMarkersReviewed,
}: {
  name: string;
  label?: string;
  notes?: string;
  studentCount: number;
  roomCount: number;
  planCount: number;
  lastUsedAt?: string;
  /** The names of the other classes, which this one may not take. */
  otherNames: string[];
  onCommit: (patch: UpdateClassMetadataPayload) => Promise<boolean>;
  onDelete: () => void;
  /** Counts up whenever the name is asked for (F2), to take the focus. */
  renameRequest?: number;
  /** The day the markers were last said to hold (decision 0044). */
  markersReviewedAt?: string;
  /** After how many weeks unchanged markers are asked about. */
  markerReviewWeeks?: number;
  /** "Jetzt geprüft"; without it the row is not shown. */
  onMarkersReviewed?: () => void;
}) {
  const { t } = useTranslation('generator');

  return (
    <>
      <InspectorHeader
        media={<InspectorMediaTile icon={ENTITY_ICONS.class} />}
        title={
          <InspectorTitleField
            label={t('classPanel.name')}
            value={name}
            problemFor={(draft) =>
              checkName(draft, otherNames, MAX_NAME_LENGTH)
            }
            // A refusal the field could not foresee is said by a toast; the
            // field keeps what was typed.
            onCommit={async (next) => {
              await onCommit({ name: next });
              return null;
            }}
            takenMessage={t('classPanel.nameTaken')}
            focusRequest={renameRequest}
          />
        }
        meta={[
          {
            icon: ENTITY_ICONS.students,
            label: t('shell.status.students', { count: studentCount }),
          },
          {
            icon: ENTITY_ICONS.room,
            label: t('library.roomsCount', { count: roomCount }),
          },
        ]}
      />
      <InspectorBody>
        <InspectorSection title={t('library.class.section')}>
          <ClassMetadataFields
            label={label}
            notes={notes}
            onCommit={onCommit}
          />
          <ValueRow label={t('library.class.plans')}>{planCount}</ValueRow>
          {lastUsedAt && (
            <ValueRow label={t('library.class.lastUsed')}>
              {formatDate(lastUsedAt)}
            </ValueRow>
          )}
          {onMarkersReviewed && (
            <InspectorRow
              label={t('markerReview.row')}
              hint={t('markerReview.rowHint', { weeks: markerReviewWeeks })}
            >
              <span className="flex items-center gap-2">
                <span className="text-control tabular-nums text-(--text-muted)">
                  {markersReviewedAt
                    ? formatStoredDate(markersReviewedAt)
                    : t('markerReview.never')}
                </span>
                <button
                  type="button"
                  onClick={onMarkersReviewed}
                  className={`${neutralButtonClass} shrink-0 px-2.5 py-1 text-xs`}
                >
                  {t('markerReview.now')}
                </button>
              </span>
            </InspectorRow>
          )}
        </InspectorSection>
      </InspectorBody>
      <InspectorDeleteFooter
        label={t('library.class.delete')}
        onDelete={onDelete}
      />
    </>
  );
}
