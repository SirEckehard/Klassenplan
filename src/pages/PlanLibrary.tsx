// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import {
  ClockCounterClockwiseIcon,
  FolderOpenIcon,
  SquaresFourIcon,
  UserIcon,
} from '@phosphor-icons/react';
import AppShell, { ShellProviders } from '@/components/shell/AppShell';
import InspectorPortal from '@/components/shell/InspectorPortal';
import {
  workspaceLayerClass,
  workspaceStageClass,
} from '@/components/shell/shellTokens';
import SeatingPlanHeader from '@/components/SeatingPlanGenerator/SeatingPlanHeader';
import SmartSidebar from '@/components/ui/panels/SmartSidebar';
import Seo from '@/components/Seo';
import ColumnBrowser from '@/components/library/ColumnBrowser';
import LibraryStatusBar from '@/components/library/LibraryStatusBar';
import LibraryToolPanel from '@/components/library/LibraryToolPanel';
import {
  buildLibraryColumns,
  defaultLibraryPath,
  libraryKey,
  type LibraryNode,
} from '@/components/library/libraryColumns';
import ClassPanel from '@/components/library/inspectors/ClassPanel';
import FolderPanel from '@/components/library/inspectors/FolderPanel';
import MixPanel from '@/components/library/inspectors/MixPanel';
import NeighbourPairPanel from '@/components/library/inspectors/NeighbourPairPanel';
import NeighboursPanel from '@/components/library/inspectors/NeighboursPanel';
import PlanPanel, {
  type PlanMove,
} from '@/components/library/inspectors/PlanPanel';
import RoomPanel from '@/components/library/inspectors/RoomPanel';
import TemplatePanel from '@/components/library/inspectors/TemplatePanel';
import StudentAvatar from '@/components/students/StudentAvatar';
import { useInspector } from '@/contexts/InspectorContext';
import { useClassDialogs } from '@/contexts/ClassDialogsContext';
import {
  useSeatingPlanActions,
  useSeatingPlanState,
} from '@/contexts/SeatingPlanContext';
import { useClassManagementContext } from '@/contexts/seatingPlan/ClassManagementContext';
import {
  useClassLibrary,
  type LibraryEdit,
  type LibraryEditOutcome,
} from '@/hooks/library/useClassLibrary';
import { usePlanUsageRecords } from '@/hooks/plan/usePlanUsageRecords';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useLocalizedNavigate } from '@/hooks/useLocalizedNavigate';
import { usePageSeo } from '@/hooks/usePageSeo';
import { useLayoutMode } from '@/hooks/ui/useLayoutMode';
import { isAnyDialogOpen } from '@/hooks/ui/useDialogLayer';
import { confirmDialog } from '@/services/ui/dialogs';
import type { ClassroomTemplate } from '@/types';
import {
  cardSurfaceClass,
  formatTime,
  logError,
  MAX_NAME_LENGTH,
  MAX_ROOMS_PER_CLASS,
  uniqueName,
  type NameProblem,
} from '@/utils';
import { buildUsageOrigins } from '@/utils/data/planUsage';
import { hasShapeMismatch } from '@/utils/math/scene';
import { showToast, TOAST_MESSAGES } from '@/utils/ui/toast';

const toProblem = (outcome: LibraryEditOutcome): NameProblem | null =>
  outcome.ok
    ? null
    : outcome.reason === 'taken' ||
        outcome.reason === 'empty' ||
        outcome.reason === 'too-long'
      ? outcome.reason
      : null;

/**
 * "Bibliothek": the classes, their rooms and plans, their recent mixes
 * and neighbourhoods, and the room templates, as folders in columns
 * (decision 0024). It wears the workspace's shell — header, toolbar,
 * inspector, status bar — as the export page does; what is selected is read
 * and changed in the inspector, the status bar holds its path and the one
 * button that opens it in the workspace.
 *
 * It opens on the plan that is open, in its room, in its class, so the room a
 * plan belongs to is the first thing to see. Another class is browsed without
 * being opened; opening something of it opens the class first.
 *
 * The page reads the shell's inspector and class dialogs itself, so it stands
 * inside the shell's providers rather than above them.
 */
export default function PlanLibrary() {
  return (
    <ShellProviders>
      <PlanLibraryPage />
    </ShellProviders>
  );
}

function PlanLibraryPage() {
  const { t } = useTranslation('generator');
  const metadata = usePageSeo('/bibliothek');
  const navigate = useLocalizedNavigate();
  const location = useLocation();
  const state = useSeatingPlanState();
  const actions = useSeatingPlanActions();
  const { selectClass } = useClassManagementContext();
  const { openCreate, openEdit, requestDelete } = useClassDialogs();
  const { setDrawerOpen, setFolded } = useInspector();
  const layoutMode = useLayoutMode();
  const isDesktop = layoutMode === 'desktop';

  // What was chosen; until then the path leads to what is open.
  const [chosenPath, setChosenPath] = React.useState<string[] | null>(null);
  const requestedPath =
    chosenPath ??
    defaultLibraryPath(
      state.activeClass.id,
      state.activeRoomId,
      state.activePlanId,
    );
  const firstKey = requestedPath[0];
  const selectedClassId = firstKey?.startsWith('class:')
    ? firstKey.slice('class:'.length)
    : null;
  const library = useClassLibrary(selectedClassId);
  const usageRecords = usePlanUsageRecords(selectedClassId);

  const [templates, setTemplates] = React.useState<ClassroomTemplate[]>([]);
  const [templatesRevision, setTemplatesRevision] = React.useState(0);
  const loadTemplates = actions.loadTemplate;
  React.useEffect(() => {
    let current = true;
    loadTemplates()
      .then((list) => {
        if (current) setTemplates(list);
      })
      .catch((error: unknown) => {
        logError('Failed to load templates', { error }, 'PlanLibrary');
      });
    return () => {
      current = false;
    };
  }, [loadTemplates, templatesRevision]);

  const built = buildLibraryColumns({
    path: requestedPath,
    classes: library.classes,
    openClassId: library.openClassId,
    selected: library.selected,
    loadingClass: library.loading,
    templates,
    planUsage: usageRecords.planUsage,
    t,
  });
  const path = built.path;
  const currentKey = path[path.length - 1];
  const current: LibraryNode | undefined = currentKey
    ? built.nodes.get(currentKey)
    : undefined;
  const classLibrary = library.selected;
  // The saved plan and the room behind each plan the neighbourhoods rest on.
  const usageOrigins = React.useMemo(
    () =>
      classLibrary
        ? buildUsageOrigins(
            classLibrary.plans,
            classLibrary.mixes,
            classLibrary.rooms,
          )
        : undefined,
    [classLibrary],
  );

  // The state and actions after an await — a class opened meanwhile.
  const latestRef = React.useRef({ state, actions });
  React.useLayoutEffect(() => {
    latestRef.current = { state, actions };
  });

  const [renameRequest, setRenameRequest] = React.useState(0);

  const choose = (columnIndex: number, key: string) =>
    setChosenPath([...path.slice(0, columnIndex), key]);
  const goUp = (index: number) => setChosenPath(path.slice(0, index + 1));

  // The inspector is where an entry is read; below `lg` it is a drawer,
  // shown when an entry that opens nothing further is tapped.
  const showInspector = () => {
    if (isDesktop) setFolded(false);
    else setDrawerOpen(true);
  };
  const handleItemClick = (_columnIndex: number, key: string) => {
    const node = built.nodes.get(key);
    if (!isDesktop && node && !isFolder(node)) setDrawerOpen(true);
  };

  const goBack = React.useCallback(() => {
    if (location.key !== 'default') {
      navigate(-1);
      return;
    }
    navigate('/generator');
  }, [location.key, navigate]);

  const toLayer = React.useCallback(
    (step: 1 | 2 | 3) => navigate('/generator', { state: { step } }),
    [navigate],
  );

  useKeyboardShortcuts(
    {
      'alt+arrowleft': goBack,
      '1': () => toLayer(1),
      '2': () => toLayer(2),
      '3': () => toLayer(3),
    },
    { condition: () => !isAnyDialogOpen() },
  );

  /** Opens a class that is not open yet; `false` when it could not be. */
  const ensureOpenClass = async (classId: string) =>
    classId === latestRef.current.state.activeClass.id ||
    (await selectClass(classId));

  const edit = (classId: string, change: LibraryEdit) =>
    library.edit(classId, change);

  // A mix keeps no tables of its own: one that no longer fits its room's
  // cannot be opened.
  const mixFits = (node: Extract<LibraryNode, { kind: 'mix' }>) => {
    const mix = classLibrary?.mixes.find((entry) => entry.id === node.mixId);
    if (!mix || !classLibrary) return false;
    const room =
      classLibrary.rooms.find((entry) => entry.id === mix.roomId) ??
      classLibrary.rooms.find((entry) => entry.isOpen);
    return room ? !hasShapeMismatch(room.scene, mix.seating) : false;
  };

  const openNode = async (node: LibraryNode | undefined) => {
    if (!node) return;
    switch (node.kind) {
      case 'class': {
        if (await ensureOpenClass(node.classId)) toLayer(1);
        return;
      }
      case 'room': {
        if (!(await ensureOpenClass(node.classId))) return;
        const latest = latestRef.current;
        if (latest.state.activeRoomId !== node.roomId) {
          latest.actions.openRoom(node.roomId);
        }
        toLayer(2);
        return;
      }
      case 'plan': {
        if (!(await ensureOpenClass(node.classId))) return;
        const latest = latestRef.current;
        const plan = latest.state.seatingHistory.find(
          (entry) => entry.id === node.planId,
        );
        if (!plan) return;
        // The plan on screen opens as it is, changes and all.
        if (plan.id !== latest.state.activePlanId) {
          latest.actions.handleHistoryLoad(plan);
          showToast('success', t('storage.planLoaded', { name: plan.name }));
        }
        toLayer(3);
        return;
      }
      case 'mix': {
        if (!(await ensureOpenClass(node.classId))) return;
        const latest = latestRef.current;
        const mix = latest.state.mixHistory.find(
          (entry) => entry.id === node.mixId,
        );
        if (!mix) return;
        if (!latest.actions.handleMixLoad(mix)) {
          showToast('warning', 'toast:mix.doesNotFit');
          return;
        }
        showToast(
          'success',
          t('storage.mixLoaded', { time: formatTime(mix.timestamp) }),
        );
        toLayer(3);
        return;
      }
      case 'template': {
        const template = templates.find(
          (entry) => entry.id === node.templateId,
        );
        if (!template || !state.activeClass.id) return;
        actions.createRoomFromTemplate(template);
        toLayer(2);
        return;
      }
      default:
    }
  };

  const openButton = (() => {
    const open = t('library.open');
    if (!current) return { label: open, hint: t('library.openHintNothing') };
    switch (current.kind) {
      case 'class':
      case 'room':
      case 'plan':
        return { label: open };
      case 'mix':
        return mixFits(current)
          ? { label: open }
          : { label: open, hint: t('toast:mix.doesNotFit') };
      case 'template':
        return state.activeClass.id
          ? { label: t('library.openAsRoom') }
          : {
              label: t('library.openAsRoom'),
              hint: t('library.openHintNoClass'),
            };
      case 'neighbours':
      case 'neighbourStudent':
      case 'neighbourPair':
        return { label: open, hint: t('library.openHintNeighbours') };
      default:
        return { label: open, hint: t('library.openHintFolder') };
    }
  })();

  const requestRename = (node: LibraryNode | undefined) => {
    if (!node) return;
    if (node.kind === 'class') {
      openEdit(node.classId);
      return;
    }
    if (
      node.kind === 'room' ||
      node.kind === 'plan' ||
      node.kind === 'template'
    ) {
      showInspector();
      setRenameRequest((count) => count + 1);
    }
  };

  const requestRemoval = async (node: LibraryNode | undefined) => {
    if (!node) return;
    switch (node.kind) {
      case 'class':
        requestDelete(node.classId);
        return;
      case 'plan': {
        const plan = classLibrary?.plans.find(
          (entry) => entry.id === node.planId,
        );
        if (!plan) return;
        const confirmed = await confirmDialog(
          t('planList.deleteDialogMessage', { name: plan.name }),
          {
            title: t('planList.deleteDialogTitle'),
            confirmLabel: t('common.delete'),
          },
        );
        if (!confirmed) return;
        const outcome = await edit(node.classId, {
          kind: 'deletePlan',
          planId: node.planId,
        });
        if (outcome.ok) {
          showToast('success', t('storage.planDeleted', { name: plan.name }));
          setChosenPath(path.slice(0, -1));
        }
        return;
      }
      case 'mix': {
        const mix = classLibrary?.mixes.find(
          (entry) => entry.id === node.mixId,
        );
        if (!mix) return;
        const confirmed = await confirmDialog(
          t('mixHistory.deleteDialogMessage', {
            time: formatTime(mix.timestamp),
          }),
          {
            title: t('mixHistory.deleteDialogTitle'),
            confirmLabel: t('common.delete'),
          },
        );
        if (!confirmed) return;
        const outcome = await edit(node.classId, {
          kind: 'deleteMix',
          mixId: node.mixId,
        });
        if (outcome.ok) {
          showToast('success', t('storage.mixDeleted'));
          setChosenPath(path.slice(0, -1));
        }
        return;
      }
      case 'room': {
        const blocked = roomRemovalHint(node);
        if (blocked) {
          showToast('info', blocked);
          return;
        }
        const room = classLibrary?.rooms.find(
          (entry) => entry.id === node.roomId,
        );
        if (!room || !classLibrary) return;
        const count = classLibrary.plans.filter(
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
        const outcome = await edit(node.classId, {
          kind: 'deleteRoom',
          roomId: node.roomId,
        });
        if (outcome.ok) {
          showToast('success', t('library.room.deleted', { name: room.name }));
          setChosenPath(path.slice(0, -1));
        }
        return;
      }
      case 'template': {
        const template = templates.find(
          (entry) => entry.id === node.templateId,
        );
        if (!template) return;
        const confirmed = await confirmDialog(
          t('sceneInspector.deleteTemplateMessage', { name: template.name }),
          {
            title: t('sceneInspector.deleteTemplateTitle'),
            confirmLabel: t('common.delete'),
          },
        );
        if (!confirmed) return;
        await actions.deleteTemplate(template.id);
        showToast('success', TOAST_MESSAGES.DELETE_TEMPLATE_SUCCESS);
        setTemplatesRevision((count) => count + 1);
        setChosenPath(path.slice(0, -1));
        return;
      }
      default:
    }
  };

  // The open room cannot go — another opens first — nor the last one.
  const roomRemovalHint = (node: Extract<LibraryNode, { kind: 'room' }>) => {
    if (!classLibrary) return null;
    if (node.roomId === classLibrary.activeRoomId) {
      return t('library.room.deleteOpenHint');
    }
    if (classLibrary.rooms.length <= 1) return t('library.room.deleteLastHint');
    return null;
  };

  const addRoom = async () => {
    if (!classLibrary) return;
    const outcome = await edit(classLibrary.id, {
      kind: 'createRoom',
      name: uniqueName(
        t('rooms.newName'),
        classLibrary.rooms.map((room) => room.name),
        MAX_NAME_LENGTH,
      ),
    });
    if (!outcome.ok) {
      if (outcome.reason === 'room-limit') {
        showToast(
          'warning',
          t('toast:rooms.limit', { max: MAX_ROOMS_PER_CLASS }),
        );
      }
      return;
    }
    if (outcome.roomId) {
      setChosenPath([
        libraryKey({ kind: 'class', classId: classLibrary.id }),
        libraryKey({
          kind: 'room',
          classId: classLibrary.id,
          roomId: outcome.roomId,
        }),
      ]);
      showInspector();
      setRenameRequest((count) => count + 1);
    }
  };

  const studentOf = (studentId: string) =>
    classLibrary?.students.find((student) => student.id === studentId);
  const studentName = (studentId: string) =>
    studentOf(studentId)?.name || t('storage.neighbors.unknownStudent');
  // Faces where the class has them; the icon tile otherwise.
  const photoMedia = (studentIds: string[]) => {
    const withPhoto = studentIds.flatMap((id) => {
      const student = studentOf(id);
      return student?.hasPhoto ? [student] : [];
    });
    if (withPhoto.length === 0) return undefined;
    return (
      <span className="flex shrink-0 -space-x-3">
        {withPhoto.map((student) => (
          <StudentAvatar key={student.id} student={student} size={40} />
        ))}
      </span>
    );
  };

  const inspector = (() => {
    if (!current) {
      return (
        <FolderPanel
          icon={FolderOpenIcon}
          title={t('storage.historyTitle')}
          hint={t('library.nothingSelected')}
        />
      );
    }
    switch (current.kind) {
      case 'class':
        return classLibrary ? (
          <ClassPanel
            library={classLibrary}
            onEdit={() => openEdit(current.classId)}
            onDelete={() => requestDelete(current.classId)}
          />
        ) : null;
      case 'room': {
        const room = classLibrary?.rooms.find(
          (entry) => entry.id === current.roomId,
        );
        if (!room || !classLibrary) return null;
        return (
          <RoomPanel
            key={room.id}
            room={room}
            otherRoomNames={classLibrary.rooms
              .filter((entry) => entry.id !== room.id)
              .map((entry) => entry.name)}
            planCount={
              classLibrary.plans.filter((plan) => plan.roomId === room.id)
                .length
            }
            onRename={async (name) =>
              toProblem(
                await edit(current.classId, {
                  kind: 'renameRoom',
                  roomId: room.id,
                  name,
                }),
              )
            }
            onSaveAsTemplate={() => {
              // A template's name is unique: a taken one gets a number.
              const name = uniqueName(
                room.name,
                templates.map((entry) => entry.name),
                MAX_NAME_LENGTH,
              );
              actions
                .saveTemplate(name, room.scene)
                .then((result) => {
                  if (result.success) {
                    showToast('success', TOAST_MESSAGES.SAVE_TEMPLATE_SUCCESS);
                    setTemplatesRevision((count) => count + 1);
                  } else {
                    showToast('error', TOAST_MESSAGES.SAVE_TEMPLATE_ERROR);
                  }
                })
                .catch((error: unknown) => {
                  logError(
                    'Failed to keep a room as a template',
                    { error },
                    'PlanLibrary',
                  );
                });
            }}
            onDelete={() => void requestRemoval(current)}
            deleteBlockedHint={roomRemovalHint(current)}
            renameRequest={renameRequest}
          />
        );
      }
      case 'plan': {
        const plan = classLibrary?.plans.find(
          (entry) => entry.id === current.planId,
        );
        if (!plan || !classLibrary) return null;
        return (
          <PlanPanel
            key={plan.id}
            plan={plan}
            classId={classLibrary.id}
            rooms={classLibrary.rooms}
            plans={classLibrary.plans}
            studentCount={classLibrary.students.length}
            onRename={async (name) =>
              toProblem(
                await edit(current.classId, {
                  kind: 'renamePlan',
                  planId: plan.id,
                  name,
                }),
              )
            }
            onMove={async (move: PlanMove) => {
              const outcome = await edit(
                current.classId,
                'roomId' in move
                  ? { kind: 'movePlan', planId: plan.id, roomId: move.roomId }
                  : {
                      kind: 'movePlanToNewRoom',
                      planId: plan.id,
                      name: move.newRoomName,
                    },
              );
              if (!outcome.ok) return toProblem(outcome);
              // The plan is followed into its new room.
              const latest = latestRef.current;
              const roomId =
                current.classId === latest.state.activeClass.id
                  ? latest.state.seatingHistory.find(
                      (entry) => entry.id === plan.id,
                    )?.roomId
                  : 'roomId' in move
                    ? move.roomId
                    : undefined;
              if (roomId) {
                setChosenPath([
                  path[0],
                  libraryKey({
                    kind: 'room',
                    classId: current.classId,
                    roomId,
                  }),
                  currentKey,
                ]);
              }
              return null;
            }}
            onDuplicate={() => {
              void edit(current.classId, {
                kind: 'duplicatePlan',
                planId: plan.id,
              });
            }}
            onDelete={() => void requestRemoval(current)}
            renameRequest={renameRequest}
          />
        );
      }
      case 'mix': {
        const mix = classLibrary?.mixes.find(
          (entry) => entry.id === current.mixId,
        );
        if (!mix || !classLibrary) return null;
        return (
          <MixPanel
            mix={mix}
            roomName={
              classLibrary.rooms.find((room) => room.id === mix.roomId)?.name
            }
            fits={mixFits(current)}
            onDelete={() => void requestRemoval(current)}
          />
        );
      }
      case 'mixes':
        return (
          <FolderPanel
            icon={ClockCounterClockwiseIcon}
            title={t('storage.mixHistory')}
            subtitle={classLibrary?.name}
            hint={t('library.mixesHint')}
          />
        );
      case 'neighbours':
        return classLibrary ? (
          <NeighboursPanel
            className={classLibrary.name}
            records={usageRecords}
            origins={usageOrigins}
          />
        ) : null;
      case 'neighbourStudent':
        return (
          <FolderPanel
            icon={UserIcon}
            title={studentName(current.studentId)}
            subtitle={t('storage.neighbors.tab')}
            media={photoMedia([current.studentId])}
            hint={t('library.neighbourStudentHint', {
              name: studentName(current.studentId),
            })}
          />
        );
      case 'neighbourPair':
        return (
          <NeighbourPairPanel
            studentId={current.studentId}
            neighbourId={current.neighbourId}
            studentName={studentName(current.studentId)}
            neighbourName={studentName(current.neighbourId)}
            planUsage={usageRecords.planUsage}
            origins={usageOrigins}
            onSetConfirmed={usageRecords.setUsageConfirmed}
            media={photoMedia([current.studentId, current.neighbourId])}
          />
        );
      case 'templates':
        return (
          <FolderPanel
            icon={SquaresFourIcon}
            title={t('library.templates')}
            hint={t('library.templatesHint')}
          />
        );
      case 'template': {
        const template = templates.find(
          (entry) => entry.id === current.templateId,
        );
        if (!template) return null;
        return (
          <TemplatePanel
            key={template.id}
            template={template}
            templates={templates}
            onRename={async (name) => {
              const result = await actions.renameTemplate(template.id, name);
              if (result.success) {
                setTemplatesRevision((count) => count + 1);
                return null;
              }
              return result.error === 'duplicate' ? 'taken' : null;
            }}
            onDelete={() => void requestRemoval(current)}
            renameRequest={renameRequest}
          />
        );
      }
      default:
        return null;
    }
  })();

  return (
    <AppShell
      header={<SeatingPlanHeader view="library" />}
      statusBar={
        <LibraryStatusBar
          rootLabel={t('storage.historyTitle')}
          crumbs={path.map((key) => ({
            key,
            label: built.labels.get(key) ?? '',
          }))}
          onCrumb={(index) => goUp(index)}
          onBack={goBack}
          open={{
            ...openButton,
            onOpen: () => void openNode(current),
          }}
        />
      }
    >
      <Seo
        {...metadata}
        structuredData={{
          '@type': 'WebPage',
          name: metadata.title,
          description: metadata.description,
        }}
      />
      <div className={workspaceLayerClass}>
        <SmartSidebar>
          {({ isExpanded }) => (
            <LibraryToolPanel
              density={isExpanded ? 'comfortable' : 'compact'}
              onNewClass={openCreate}
              onNewRoom={classLibrary ? () => void addRoom() : undefined}
            />
          )}
        </SmartSidebar>

        {/* The folders lie on paper on the sunken stage, as the sheet does on
            the export page; nothing floats over them. */}
        <div className={`${workspaceStageClass} flex flex-col`}>
          <div
            className={`${cardSurfaceClass} flex min-h-96 flex-1 overflow-hidden lg:min-h-0`}
          >
            <ColumnBrowser
              className="flex-1"
              columns={built.columns}
              single={layoutMode === 'phone'}
              onSelect={choose}
              onItemClick={handleItemClick}
              onOpen={(_columnIndex, key) => {
                const node = built.nodes.get(key);
                if (node && !isFolder(node)) void openNode(node);
                else if (node?.kind === 'class') void openNode(node);
              }}
              onRename={(_columnIndex, key) =>
                requestRename(built.nodes.get(key))
              }
              onDelete={(_columnIndex, key) =>
                void requestRemoval(built.nodes.get(key))
              }
            />
          </div>
        </div>

        <InspectorPortal label={t('storage.historyTitle')}>
          {inspector}
        </InspectorPortal>
      </div>
    </AppShell>
  );
}

/** An entry whose contents are the next column. */
function isFolder(node: LibraryNode) {
  return (
    node.kind === 'class' ||
    node.kind === 'templates' ||
    node.kind === 'room' ||
    node.kind === 'mixes' ||
    node.kind === 'neighbours' ||
    node.kind === 'neighbourStudent'
  );
}
