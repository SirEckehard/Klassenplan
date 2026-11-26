// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarBlankIcon,
  CheckCircleIcon,
  CopyIcon,
  FolderPlusIcon,
  MagicWandIcon,
} from '@phosphor-icons/react';
import {
  InspectorActionRow,
  InspectorBody,
  InspectorDeleteFooter,
  InspectorHeader,
  InspectorMediaTile,
  InspectorIcon,
  InspectorRow,
  InspectorSection,
} from '@/components/shell/InspectorPanel';
import type { LibraryRoom } from '@/hooks/library/useClassLibrary';
import type { PlanUsageRecordsReturn } from '@/hooks/plan/usePlanUsageRecords';
import type { SavedPlan, Student } from '@/types';
import {
  checkName,
  formatLongDate,
  formatStoredDate,
  MAX_NAME_LENGTH,
  uniqueName,
  type NameProblem,
} from '@/utils';
import {
  findPlanUsage,
  isCountedUsage,
  storedPlanDateToTimestamp,
} from '@/utils/data/planUsage';
import PlanFeedbackRows from '@/components/SeatingPlanGenerator/views/PlanFeedbackRows';
import ToggleSwitch from '@/components/ui/controls/ToggleSwitch';
import InspectorSelect from '@/components/students/InspectorSelect';
import { hasShapeMismatch } from '@/utils/math/scene';
import NameField from '@/components/shell/NameField';
import InspectorTitleField from '@/components/shell/InspectorTitleField';
import { ENTITY_ICONS } from '@/components/shell/entityIcons';
import { ValueRow } from './panelParts';

export type PlanMove = { roomId: string } | { newRoomName: string };

/**
 * A saved plan in "Bibliothek": its name, renamed in the header; the room it
 * belongs to, which it can leave for another or a new one (decision 0024) —
 * a menu, as a student's language level is, since a class may have many
 * rooms; what it holds; whether it was really in use — marked here by hand,
 * and whether the class detects that on its own (decision 0025) — and how it
 * went (decision 0054); a copy beside it; and removing it. What the plan is and where it belongs share
 * one section: a heading over the room's single row only repeated it.
 */
export default function PlanPanel({
  plan,
  records,
  rooms,
  plans,
  students,
  experienceCounts,
  onRename,
  onMove,
  onDuplicate,
  onDelete,
  renameRequest,
}: {
  plan: SavedPlan;
  /**
   * The class's usage records, held by the page: loaded here, every plan
   * selected would start from the defaults until its own load resolved.
   */
  records: PlanUsageRecordsReturn;
  rooms: LibraryRoom[];
  /** Every plan of the class: a name one of them carries is taken. */
  plans: SavedPlan[];
  /** The class, for its size and the names at the plan's tables. */
  students: Student[];
  /** Whether "Erfahrung" counts in the class's mixing (decision 0054). */
  experienceCounts: boolean;
  onRename: (name: string) => Promise<NameProblem | null> | NameProblem | null;
  onMove: (move: PlanMove) => Promise<NameProblem | null> | NameProblem | null;
  onDuplicate: () => void;
  onDelete: () => void;
  renameRequest: number;
}) {
  const { t } = useTranslation('generator');
  const [namingRoom, setNamingRoom] = React.useState(false);
  const { planUsage, planUsageManual, setUsageManual, markUsed, setFeedback } =
    records;

  const seated = plan.seating.reduce(
    (sum, table) => sum + table.filter(Boolean).length,
    0,
  );
  const seats = plan.scene.tables.reduce(
    (sum, table) => sum + table.seatCount,
    0,
  );
  const locks = Object.keys(plan.locks ?? {}).length;
  // A plan whose tables are not its room's was likely made in another room —
  // what every plan from before rooms existed was put into one room for.
  const room = rooms.find((entry) => entry.id === plan.roomId);
  const otherTables = room ? hasShapeMismatch(room.scene, plan.seating) : false;
  // Plan names are held exactly, as saving holds them.
  const problemFor = (draft: string): NameProblem | null => {
    const trimmed = draft.trim();
    if (trimmed === '') return 'empty';
    return plans.some((entry) => entry.id !== plan.id && entry.name === trimmed)
      ? 'taken'
      : null;
  };

  // Whether the plan was really in use: its pairs match a usage record.
  const usage = React.useMemo(
    () => findPlanUsage(planUsage, plan.seating, plan.scene),
    [plan.seating, plan.scene, planUsage],
  );
  const usageSources = usage
    ? [...new Set(usage.sources.filter((source) => source !== 'edited'))]
    : [];
  // The records come resolved for the class's mode, so this is what counts.
  const used = usage ? isCountedUsage(usage) : false;
  // A record marking or feedback creates is dated the day the plan was made,
  // so an old plan does not become the most recent one.
  const madeAt = () =>
    storedPlanDateToTimestamp(plan.date ?? '') ?? new Date().toISOString();
  const handleUsedChange = (next: boolean) => {
    markUsed(plan.seating, plan.scene, next, madeAt());
  };

  return (
    <>
      <InspectorHeader
        media={<InspectorMediaTile icon={ENTITY_ICONS.plan} />}
        title={
          <InspectorTitleField
            label={t('planSave.nameLabel')}
            value={plan.name}
            problemFor={problemFor}
            onCommit={onRename}
            takenMessage={t('planSave.nameTaken')}
            focusRequest={renameRequest}
          />
        }
        meta={[
          { icon: CalendarBlankIcon, label: formatStoredDate(plan.date) },
          plan.autoSaved && {
            icon: MagicWandIcon,
            label: t('library.chipAutoSaved'),
          },
        ]}
      />
      <InspectorBody>
        <InspectorSection title={t('library.plan.section')}>
          <InspectorSelect
            label={t('library.plan.room')}
            value={plan.roomId}
            options={rooms.map((entry) => ({
              value: entry.id,
              label: entry.name,
            }))}
            onChange={(roomId) => {
              if (roomId && roomId !== plan.roomId) {
                void onMove({ roomId });
              }
            }}
            action={{
              label: t('library.plan.toNewRoom'),
              icon: FolderPlusIcon,
              onSelect: () => setNamingRoom(true),
            }}
            description={
              otherTables && room && !namingRoom
                ? t('library.plan.otherTables', { room: room.name })
                : undefined
            }
          />
          {namingRoom && (
            <NameField
              key="new-room"
              label={t('library.plan.newRoomName')}
              value={uniqueName(
                t('rooms.newName'),
                rooms.map((entry) => entry.name),
                MAX_NAME_LENGTH,
              )}
              problemFor={(draft) =>
                checkName(
                  draft,
                  rooms.map((entry) => entry.name),
                  MAX_NAME_LENGTH,
                )
              }
              onCommit={async (name) => {
                const problem = await onMove({ newRoomName: name });
                if (!problem) setNamingRoom(false);
                return problem;
              }}
              takenMessage={t('sceneInspector.roomNameTaken')}
              focusRequest={1}
              onCancel={() => setNamingRoom(false)}
            />
          )}
          <ValueRow label={t('library.plan.seated')}>
            {t('library.plan.seatedValue', {
              seated,
              total: students.length,
            })}
          </ValueRow>
          <ValueRow label={t('library.room.tables')}>
            {[
              t('sceneInspector.tables', { count: plan.scene.tables.length }),
              t('sceneInspector.seats', { count: seats }),
            ].join(' · ')}
          </ValueRow>
          <ValueRow label={t('shell.layers.circle')}>
            {plan.circleLayout ? t('library.plan.circleKept') : '–'}
          </ValueRow>
          <ValueRow label={t('library.plan.locks')}>{locks}</ValueRow>
        </InspectorSection>

        <InspectorSection title={t('library.plan.usage')}>
          <InspectorRow
            label={t('library.plan.used')}
            hint={t('library.plan.usedHint')}
            icon={<InspectorIcon icon={CheckCircleIcon} />}
            description={
              usageSources.length > 0 && usage
                ? `${usageSources
                    .map((source) => t(`storage.neighbors.sources.${source}`))
                    .join(', ')} · ${formatLongDate(usage.lastSeenAt)}`
                : undefined
            }
            labelsControl
          >
            <ToggleSwitch
              checked={used}
              onChange={handleUsedChange}
              label={t('library.plan.used')}
              disabled={seated === 0}
              size="sm"
            />
          </InspectorRow>
          {seated > 0 && (
            <PlanFeedbackRows
              seating={plan.seating}
              scene={plan.scene}
              records={planUsage}
              students={students}
              counts={experienceCounts}
              onChange={(feedback) =>
                setFeedback(plan.seating, plan.scene, feedback, madeAt())
              }
            />
          )}
          <InspectorRow
            label={t('library.plan.detect')}
            icon={<InspectorIcon icon={MagicWandIcon} />}
            description={
              planUsageManual
                ? t('library.plan.detectOff')
                : t('library.plan.detectOn')
            }
            labelsControl
          >
            <ToggleSwitch
              checked={!planUsageManual}
              onChange={(detect) => setUsageManual(!detect)}
              label={t('library.plan.detect')}
              size="sm"
            />
          </InspectorRow>
        </InspectorSection>

        <InspectorSection title={t('sceneInspector.edit')}>
          <InspectorActionRow
            icon={CopyIcon}
            label={t('sceneInspector.duplicate')}
            onClick={onDuplicate}
          />
        </InspectorSection>
      </InspectorBody>
      <InspectorDeleteFooter
        label={t('library.plan.delete')}
        onDelete={onDelete}
      />
    </>
  );
}
