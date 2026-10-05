// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckIcon,
  FloppyDiskIcon,
  PencilLineIcon,
  PlusIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import type { ClassroomTemplate, TableTemplateType } from '@/types';
import { InspectorSection } from '@/components/shell/InspectorPanel';
import {
  useOptionalSeatingPlanActions,
  useOptionalSeatingPlanState,
} from '@/contexts/seatingPlan/seatingPlanSelectors';
import TablePreview from '@/components/TablePreview';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';
import { confirmDialog } from '@/services/ui/dialogs';
import { showToast } from '@/utils/ui/toast';
import {
  checkName,
  getTablePresets,
  inputFieldClass,
  MAX_NAME_LENGTH,
  menuItemClass,
  quietDangerIconButtonClass,
  quietIconButtonClass,
  uniqueName,
} from '@/utils';

/** The four kinds of table a room can be set up with, smallest first. */
const SETUP_TYPES: TableTemplateType[] = [
  'single',
  'double',
  'group4',
  'group6',
];

/**
 * Sets the whole room up from one kind of table: as many of them as the class
 * needs, arranged in rows. It replaces the tables that stand there — windows,
 * doors and the board stay — so the hint says so, and the undo history holds
 * the room it replaced.
 */
export function RoomSetupSection({
  studentsCount,
  hasTables,
  onSetUp,
  focusRequest = 0,
}: {
  studentsCount: number;
  hasTables: boolean;
  onSetUp: (type: TableTemplateType) => void;
  /** Counts up whenever the setup is asked for (Ctrl/⌘+E), to take the focus. */
  focusRequest?: number;
}) {
  const { t } = useTranslation('generator');
  const hintId = React.useId();
  const firstRowRef = React.useRef<HTMLButtonElement | null>(null);
  const presets = getTablePresets();
  const labels: Record<TableTemplateType, string> = {
    single: t('sceneInspector.setupSingle'),
    double: t('sceneInspector.setupDouble'),
    group4: t('sceneInspector.setupGroup4'),
    group6: t('sceneInspector.setupGroup6'),
  };

  React.useEffect(() => {
    if (focusRequest === 0) return undefined;
    // A frame later, so the drawer below `lg` has taken the focus for itself
    // first and this lands inside it.
    const frame = requestAnimationFrame(() => firstRowRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [focusRequest]);

  const hint =
    studentsCount === 0
      ? t('sceneInspector.setupNoStudents')
      : hasTables
        ? t('sceneInspector.setupReplaceHint')
        : t('sceneInspector.setupHint');

  return (
    <InspectorSection
      title={t('sceneInspector.setup')}
      tourAnchor={TOUR_ANCHORS.layoutSetup}
    >
      <p id={hintId} className="text-xs leading-relaxed text-(--text-muted)">
        {hint}
      </p>
      {/* The rows carry their own padding, as in a menu; the section's edge
          stays in line with the heading. */}
      <div className="-mx-3 flex flex-col">
        {SETUP_TYPES.map((type, index) => (
          <button
            key={type}
            ref={index === 0 ? firstRowRef : undefined}
            type="button"
            onClick={() => onSetUp(type)}
            disabled={studentsCount === 0}
            aria-describedby={hintId}
            className={menuItemClass}
          >
            <span aria-hidden="true" className="flex shrink-0">
              <TablePreview type={type} iconSize={20} />
            </span>
            <span className="min-w-0 flex-1 truncate">{labels[type]}</span>
            {studentsCount > 0 && (
              <span className="shrink-0 text-xs tabular-nums text-(--text-muted)">
                {t('sceneInspector.tables', {
                  count: Math.ceil(studentsCount / presets[type].seatCount),
                })}
              </span>
            )}
          </button>
        ))}
      </div>
    </InspectorSection>
  );
}

/** Renaming a template in its own row: Enter keeps the name, Escape drops it. */
function TemplateRenameRow({
  template,
  templates,
  onRename,
  onDone,
}: {
  template: ClassroomTemplate;
  templates: ClassroomTemplate[];
  onRename: (
    id: number,
    name: string,
  ) => Promise<{ success: boolean; error?: string }>;
  onDone: () => void;
}) {
  const { t } = useTranslation('generator');
  const [draft, setDraft] = React.useState(template.name);
  // Enter and leaving the field can both ask while the rename is on its way.
  const committingRef = React.useRef(false);
  const errorId = React.useId();
  const trimmed = draft.trim();
  // Refused here rather than by a toast, as a plan's name is.
  const taken = templates.some(
    (entry) => entry.id !== template.id && entry.name === trimmed,
  );

  const commit = async () => {
    if (committingRef.current) return;
    if (trimmed === '' || trimmed === template.name) {
      onDone();
      return;
    }
    if (taken) return;
    committingRef.current = true;
    try {
      const result = await onRename(template.id, trimmed);
      if (result.success) onDone();
    } finally {
      committingRef.current = false;
    }
  };

  return (
    <div className="flex flex-col gap-1 px-3 py-1">
      <input
        type="text"
        value={draft}
        maxLength={MAX_NAME_LENGTH}
        autoFocus
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          void commit();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            void commit();
          } else if (event.key === 'Escape') {
            // Only "not this name" — the canvas would take Escape as
            // clearing its selection.
            event.preventDefault();
            event.stopPropagation();
            onDone();
          }
        }}
        aria-label={t('sceneInspector.templateName')}
        aria-invalid={taken || undefined}
        aria-describedby={taken ? errorId : undefined}
        className={`${inputFieldClass} h-8 w-full py-0 text-sm`}
      />
      {taken && (
        <p id={errorId} className="text-xs text-(--status-alert-text)">
          {t('template.duplicateWarning')}
        </p>
      )}
    </div>
  );
}

/**
 * Rooms kept for other classes: this one saved as a template, and every saved
 * one loaded in a click — replacing the room, tables and elements alike, with
 * the undo history holding the old one. Renaming and removing sit beside each
 * row, as a class's do in the class menu.
 */
export function RoomTemplatesSection({
  templates,
  onSave,
  onLoad,
  onRename,
  onDelete,
}: {
  templates: ClassroomTemplate[];
  /** Opens the dialog that names this room as a new template or an old one. */
  onSave: () => void;
  onLoad: (id: number) => void;
  onRename: (
    id: number,
    name: string,
  ) => Promise<{ success: boolean; error?: string }>;
  onDelete: (id: number) => void;
}) {
  const { t } = useTranslation('generator');
  const [renamingId, setRenamingId] = React.useState<number | null>(null);

  // Deleting a template is not part of the room's undo history, so it asks.
  const requestDelete = async (template: ClassroomTemplate) => {
    const confirmed = await confirmDialog(
      t('sceneInspector.deleteTemplateMessage', { name: template.name }),
      {
        title: t('sceneInspector.deleteTemplateTitle'),
        confirmLabel: t('common.delete'),
      },
    );
    if (confirmed) onDelete(template.id);
  };

  return (
    <InspectorSection title={t('sceneInspector.templates')}>
      {templates.length === 0 && (
        <p className="text-xs leading-relaxed text-(--text-muted)">
          {t('sceneInspector.templatesHint')}
        </p>
      )}
      <div className="-mx-3 flex flex-col">
        {/* Keeping this room comes first, above the kept ones, as "Neue
            Klasse" leads the class menu. */}
        <button type="button" onClick={onSave} className={menuItemClass}>
          <FloppyDiskIcon
            size={16}
            aria-hidden="true"
            className="shrink-0 text-(--text-muted)"
          />
          {t('sceneInspector.saveAsTemplate')}
        </button>
        {templates.length > 0 && (
          <div
            className="mx-3 my-1 h-px bg-(--border-card)"
            aria-hidden="true"
          />
        )}
        {templates.map((template) => {
          if (template.id === renamingId) {
            return (
              <TemplateRenameRow
                key={template.id}
                template={template}
                templates={templates}
                onRename={onRename}
                onDone={() => setRenamingId(null)}
              />
            );
          }
          const tableCount = template.scene.tables.length;
          const seatCount = template.scene.tables.reduce(
            (sum, table) => sum + table.seatCount,
            0,
          );
          return (
            <div key={template.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onLoad(template.id)}
                title={t('sceneInspector.loadTemplate', {
                  name: template.name,
                })}
                className={`${menuItemClass} min-w-0 flex-1`}
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{template.name}</span>
                  <span className="text-xs tabular-nums text-(--text-muted)">
                    {t('sceneInspector.tables', { count: tableCount })} ·{' '}
                    {t('sceneInspector.seats', { count: seatCount })}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setRenamingId(template.id)}
                title={t('sceneInspector.renameTemplate')}
                aria-label={t('sceneInspector.renameTemplateNamed', {
                  name: template.name,
                })}
                className={`${quietIconButtonClass} h-9 w-9 shrink-0`}
              >
                <PencilLineIcon className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => {
                  void requestDelete(template);
                }}
                title={t('sceneInspector.deleteTemplate')}
                aria-label={t('sceneInspector.deleteTemplateNamed', {
                  name: template.name,
                })}
                className={`${quietDangerIconButtonClass} h-9 w-9 shrink-0`}
              >
                <TrashIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </InspectorSection>
  );
}

/**
 * A room's name in its own row: Enter keeps it, Escape or leaving the field
 * without a change drops it. A name another room of the class carries is
 * refused here, as a template's is.
 */
function RoomNameRow({
  initialName,
  roomId,
  onCommit,
  onDone,
}: {
  initialName: string;
  /** The room renamed; none while a new one is named. */
  roomId?: string;
  onCommit: (name: string) => void;
  onDone: () => void;
}) {
  const { t } = useTranslation('generator');
  const state = useOptionalSeatingPlanState();
  const [draft, setDraft] = React.useState(initialName);
  const errorId = React.useId();
  const otherNames = (state?.rooms ?? [])
    .filter((room) => room.id !== roomId)
    .map((room) => room.name);
  const problem = checkName(draft, otherNames, MAX_NAME_LENGTH);
  const taken = problem === 'taken';

  const commit = () => {
    if (draft.trim() === '' || (roomId && draft.trim() === initialName)) {
      onDone();
      return;
    }
    if (problem) return;
    onCommit(draft.trim());
    onDone();
  };

  return (
    <div className="flex flex-col gap-1 px-3 py-1">
      <input
        type="text"
        value={draft}
        maxLength={MAX_NAME_LENGTH}
        autoFocus
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          // A new room is made only on purpose: leaving the field drops it.
          if (roomId) commit();
          else onDone();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          } else if (event.key === 'Escape') {
            // Only "not this name" — the canvas would take Escape as
            // clearing its selection.
            event.preventDefault();
            event.stopPropagation();
            onDone();
          }
        }}
        aria-label={t('sceneInspector.roomName')}
        aria-invalid={taken || undefined}
        aria-describedby={taken ? errorId : undefined}
        className={`${inputFieldClass} h-8 w-full py-0 text-sm`}
      />
      {taken && (
        <p id={errorId} className="text-xs text-(--status-alert-text)">
          {t('sceneInspector.roomNameTaken')}
        </p>
      )}
    </div>
  );
}

/**
 * The rooms of the class (decision 0024): a new one on top, as "Neue Klasse"
 * leads the class menu, then every room, the open one checked. A click opens
 * a room as it was left; a room is renamed and removed in its row, as a
 * template is. A new room is named before it is made, since making it opens
 * it. Removing takes the room's plans and mixes along, so it asks first; the
 * open room and the last one stay, and their bin says why.
 */
export function RoomListSection() {
  const { t } = useTranslation('generator');
  const state = useOptionalSeatingPlanState();
  const actions = useOptionalSeatingPlanActions();
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [naming, setNaming] = React.useState(false);
  if (!state || !actions) return null;
  const { rooms, activeRoomId, seatingHistory } = state;

  // Not part of the room's undo history, so it asks — as "Bibliothek"
  // does, in the same words.
  const requestDelete = async (room: { id: string; name: string }) => {
    if (room.id === activeRoomId) {
      showToast('info', t('library.room.deleteOpenHint'));
      return;
    }
    const count = seatingHistory.filter(
      (plan) => plan.roomId === room.id,
    ).length;
    const confirmed = await confirmDialog(
      count === 0
        ? t('library.room.deleteMessageEmpty', { name: room.name })
        : t('library.room.deleteMessage', { name: room.name, count }),
      {
        title: t('library.room.delete'),
        confirmLabel: t('common.delete'),
      },
    );
    if (!confirmed) return;
    if (actions.deleteRoom(room.id) === null) {
      showToast('success', t('library.room.deleted', { name: room.name }));
    }
  };

  return (
    <InspectorSection title={t('sceneInspector.rooms')}>
      {rooms.length <= 1 && (
        <p className="text-xs leading-relaxed text-(--text-muted)">
          {t('sceneInspector.roomsHint')}
        </p>
      )}
      <div className="-mx-3 flex flex-col">
        {naming ? (
          <RoomNameRow
            initialName={uniqueName(
              t('rooms.newName'),
              rooms.map((room) => room.name),
              MAX_NAME_LENGTH,
            )}
            onCommit={(name) => {
              actions.createRoom({ name });
            }}
            onDone={() => setNaming(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setNaming(true)}
            className={menuItemClass}
          >
            <PlusIcon
              size={16}
              aria-hidden="true"
              className="shrink-0 text-(--text-muted)"
            />
            {t('sceneInspector.newRoom')}
          </button>
        )}
        <div className="mx-3 my-1 h-px bg-(--border-card)" aria-hidden="true" />
        {rooms.map((room) => {
          if (room.id === renamingId) {
            return (
              <RoomNameRow
                key={room.id}
                roomId={room.id}
                initialName={room.name}
                onCommit={(name) => {
                  actions.renameRoom(room.id, name);
                }}
                onDone={() => setRenamingId(null)}
              />
            );
          }
          const isOpen = room.id === activeRoomId;
          return (
            <div key={room.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (!isOpen) actions.openRoom(room.id);
                }}
                aria-current={isOpen ? 'true' : undefined}
                title={
                  isOpen
                    ? undefined
                    : t('sceneInspector.openRoom', { name: room.name })
                }
                className={`${menuItemClass} min-w-0 flex-1`}
              >
                <span className="min-w-0 flex-1 truncate">{room.name}</span>
                {isOpen && (
                  <CheckIcon
                    size={16}
                    aria-hidden="true"
                    className="shrink-0 text-(--text-muted)"
                  />
                )}
              </button>
              <button
                type="button"
                onClick={() => setRenamingId(room.id)}
                title={t('sceneInspector.renameRoom')}
                aria-label={t('sceneInspector.renameRoomNamed', {
                  name: room.name,
                })}
                className={`${quietIconButtonClass} h-9 w-9 shrink-0`}
              >
                <PencilLineIcon className="h-4 w-4" aria-hidden="true" />
              </button>
              {/* A class keeps one room at least: with one, there is no bin. */}
              {rooms.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    void requestDelete(room);
                  }}
                  aria-disabled={isOpen || undefined}
                  title={
                    isOpen
                      ? t('library.room.deleteOpenHint')
                      : t('library.room.delete')
                  }
                  aria-label={t('sceneInspector.deleteRoomNamed', {
                    name: room.name,
                  })}
                  className={`${quietDangerIconButtonClass} h-9 w-9 shrink-0 ${
                    isOpen ? 'cursor-not-allowed opacity-40' : ''
                  }`}
                >
                  <TrashIcon className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </InspectorSection>
  );
}
