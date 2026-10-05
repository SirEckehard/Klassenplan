// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CopyIcon, FolderPlusIcon } from '@phosphor-icons/react';
import {
  InspectorBody,
  InspectorChoice,
  InspectorHeader,
  InspectorRow,
  InspectorSection,
} from '@/components/shell/InspectorPanel';
import type { LibraryRoom } from '@/hooks/library/useClassLibrary';
import { usePlanUsageRecords } from '@/hooks/plan/usePlanUsageRecords';
import type { SavedPlan } from '@/types';
import {
  checkName,
  formatLongDate,
  formatStoredDate,
  MAX_NAME_LENGTH,
  uniqueName,
  type NameProblem,
} from '@/utils';
import {
  collectSeatingPairKeys,
  computePlanFingerprint,
} from '@/utils/data/planUsage';
import { hasShapeMismatch } from '@/utils/math/scene';
import RoomThumbnail from '../RoomThumbnail';
import NameField from './NameField';
import { ActionRow, DeleteFooter, ValueRow } from './panelParts';

export type PlanMove = { roomId: string } | { newRoomName: string };

/**
 * A saved plan in "Bibliothek": its name, renamed here; the room it
 * belongs to, which it can leave for another or a new one (decision 0024);
 * what it holds; whether it was really in use; a copy beside it; and removing
 * it.
 */
export default function PlanPanel({
  plan,
  classId,
  rooms,
  plans,
  studentCount,
  onRename,
  onMove,
  onDuplicate,
  onDelete,
  renameRequest,
}: {
  plan: SavedPlan;
  classId: string;
  rooms: LibraryRoom[];
  /** Every plan of the class: a name one of them carries is taken. */
  plans: SavedPlan[];
  studentCount: number;
  onRename: (name: string) => Promise<NameProblem | null> | NameProblem | null;
  onMove: (move: PlanMove) => Promise<NameProblem | null> | NameProblem | null;
  onDuplicate: () => void;
  onDelete: () => void;
  renameRequest: number;
}) {
  const { t } = useTranslation('generator');
  const [namingRoom, setNamingRoom] = React.useState(false);
  const { planUsage } = usePlanUsageRecords(classId);

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
  const usage = React.useMemo(() => {
    if (seated === 0) return undefined;
    const fingerprint = computePlanFingerprint(
      collectSeatingPairKeys(plan.seating),
    );
    return planUsage.find((record) => record.fingerprint === fingerprint);
  }, [plan.seating, planUsage, seated]);
  const usageSources = usage
    ? [...new Set(usage.sources.filter((source) => source !== 'edited'))]
    : [];

  return (
    <>
      <InspectorHeader
        media={
          <RoomThumbnail scene={plan.scene} className="h-10 w-15 shrink-0" />
        }
        title={plan.name}
        subtitle={[
          formatStoredDate(plan.date),
          plan.autoSaved ? t('library.chipAutoSaved') : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      />
      <InspectorBody>
        <InspectorSection title={t('library.plan.section')}>
          <NameField
            label={t('planSave.nameLabel')}
            value={plan.name}
            problemFor={problemFor}
            onCommit={onRename}
            takenMessage={t('planSave.nameTaken')}
            focusRequest={renameRequest}
          />
        </InspectorSection>

        <InspectorSection title={t('library.plan.room')}>
          <InspectorRow label={t('library.plan.room')} stacked>
            <InspectorChoice
              layout="list"
              label={t('library.plan.room')}
              value={plan.roomId}
              options={rooms.map((room) => ({
                value: room.id,
                label: room.name,
              }))}
              onChange={(roomId) => {
                if (roomId && roomId !== plan.roomId) {
                  void onMove({ roomId });
                }
              }}
            />
          </InspectorRow>
          {otherTables && room && !namingRoom && (
            <p className="text-xs leading-relaxed text-(--text-muted)">
              {t('library.plan.otherTables', { room: room.name })}
            </p>
          )}
          {namingRoom ? (
            <NameField
              key="new-room"
              label={t('library.plan.newRoomName')}
              value={uniqueName(
                t('rooms.newName'),
                rooms.map((room) => room.name),
                MAX_NAME_LENGTH,
              )}
              problemFor={(draft) =>
                checkName(
                  draft,
                  rooms.map((room) => room.name),
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
            />
          ) : (
            <ActionRow
              icon={FolderPlusIcon}
              label={t('library.plan.toNewRoom')}
              onClick={() => setNamingRoom(true)}
            />
          )}
        </InspectorSection>

        <InspectorSection title={t('library.contents')}>
          <ValueRow label={t('library.plan.seated')}>
            {t('library.plan.seatedValue', {
              seated,
              total: studentCount,
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
          <ValueRow label={t('library.plan.used')}>
            {usageSources.length > 0 && usage
              ? `${usageSources
                  .map((source) => t(`storage.neighbors.sources.${source}`))
                  .join(', ')} · ${formatLongDate(usage.lastSeenAt)}`
              : t('library.plan.notUsed')}
          </ValueRow>
        </InspectorSection>

        <InspectorSection title={t('library.actions')}>
          <ActionRow
            icon={CopyIcon}
            label={t('sceneInspector.duplicate')}
            onClick={onDuplicate}
          />
        </InspectorSection>
      </InspectorBody>
      <DeleteFooter label={t('library.plan.delete')} onDelete={onDelete} />
    </>
  );
}
