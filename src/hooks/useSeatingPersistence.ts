// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * @internal
 * Internal hook used by useSeatingGenerator. Do not import directly.
 * Use SeatingPlanGeneratorProvider context hooks instead.
 */
import { useCallback, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { writeValue as idbSet } from '@/repositories/idbClient';
import {
  DEFAULT_ACTIVE_CLASS,
  type ActiveClassState,
  type ClassCollectionState,
  type ClassroomScene,
  type ClassroomTemplate,
  type ClassRecord,
  type MixSettings,
  type SaveTemplateError,
  type SaveTemplateResult,
  type SavedPlan,
  type SaveSeatingPlanOptions,
  type Student,
} from '@/types';
import type { CircleLayout, CircleExportData } from '@/types/Circle';
import {
  DEFAULT_CLASSROOM_SCENE,
  DEFAULT_MIX_WEIGHTS,
  errorHandlers,
  logError,
  logWarn,
  generateId,
  showToast,
  TOAST_MESSAGES,
  stableStringify,
  neutralSettings,
  normalizeMixSettings,
  toIsoDate,
  uniqueName,
  MAX_NAME_LENGTH,
} from '@/utils';
import { RepositoryErrorType, type ActiveClassSnapshot } from '@/repositories';
import type { SeatingState } from './useSeatingState';
import { DB_KEYS } from '@/utils/data/storageKeys';
import { APP_DATA_VERSION } from '@/utils/data/indexedDb';
import { resolvePlanSlot, upsertPlan } from '@/utils/data/planNormalization';
import { fittingLocks } from '@/utils/data/classRooms';
import {
  buildStudentsCsvFilename,
  exportStudentsToCsv,
} from '@/utils/csv/csvExport';
import { useSeatingRepository } from './useSeatingRepository';
import { useDownloadFile } from './useDownloadFile';
import { summarizeClass } from '@/utils/data/classCollection';
import { sweepOrphanPhotos } from '@/repositories/studentPhotoStore';
import { sweepOrphanNameGameStats } from '@/repositories/nameGameStatsStore';
import {
  backfillPlanUsage,
  recordPlanUsage,
  sweepOrphanPlanUsage,
} from '@/repositories/planUsageStore';
import {
  usePersistErrorHandling,
  usePersistQueue,
  useClassDataPersistence,
  type LoadedSnapshot,
} from './persistence';

// Backup export and import and the full data wipe run only on request. Loading
// their module then keeps it — and the backup validators it imports — out of
// the initial bundle. Each caller loads it before touching any data, so a
// failed load cannot leave a wipe or an import half done.
const loadDataBackup = () => import('@/services/backup/dataBackup');

export type LoadOptions = {
  replaceStudents?: boolean;
};

/**
 * Persist seating data to IndexedDB and provide load/save utilities.
 * @param state Shared seating state
 */

const DEFAULT_CLASS_MIX_SETTINGS = normalizeMixSettings(
  {
    avoidPreviousPairs: DEFAULT_MIX_WEIGHTS.avoidPreviousPairs,
    preferGenderMix: DEFAULT_MIX_WEIGHTS.preferGenderMix,
  },
  neutralSettings,
);

export function useSeatingPersistence(state: SeatingState) {
  const {
    studentState: { students, setStudents, acknowledgeStudentUpdates },
    historyState: {
      seatingHistory,
      mixHistory,
      setSeatingHistory,
      setMixHistory,
    },
    planState: {
      currentSeating,
      setCurrentSeating,
      activePlanId,
      setActivePlanId,
      setPlanName,
    },
    algorithmState: {
      lockedPositions,
      mixSettings,
      setLockedPositions,
      setMixSettings,
    },
    sceneState: {
      classroomScene,
      circleLayout,
      setClassroomScene,
      setCircleLayout,
    },
    roomState: { rooms, setRooms, activeRoomId, setActiveRoomId },
    classState: { activeClass, setClassSummaries, setActiveClass },
  } = state;

  const hasActiveClass = Boolean(activeClass.id);

  const repository = useSeatingRepository();

  // Shared refs for persistence control
  const isRestoringRef = useRef(false);
  const activeClassIdRef = useRef<string | null>(activeClass.id);

  // Sync activeClassIdRef when activeClass changes (in effect, not during render)
  useEffect(() => {
    activeClassIdRef.current = activeClass.id;
  }, [activeClass.id]);

  // Use extracted error handling hook
  const errorHandling = usePersistErrorHandling(hasActiveClass);

  // Use extracted queue management hook
  const queue = usePersistQueue(
    repository,
    errorHandling,
    activeClassIdRef,
    isRestoringRef,
  );

  const mapActiveClass = useCallback(
    (record?: ClassRecord | null): ActiveClassState => {
      if (!record) {
        return DEFAULT_ACTIVE_CLASS;
      }
      return {
        id: record.id,
        name: record.name,
        label: record.label,
        notes: record.notes,
        lastUsedAt: record.lastUsedAt,
      };
    },
    [],
  );

  const applyClassCollection = useCallback(
    (collection: ClassCollectionState | null) => {
      if (!collection) {
        setClassSummaries([]);
        setActiveClass(DEFAULT_ACTIVE_CLASS);
        return;
      }

      setClassSummaries(
        collection.classes.map((entry) => summarizeClass(entry)),
      );
      const activeRecord =
        collection.classes.find(
          (entry) => entry.id === collection.activeClassId,
        ) ?? collection.classes[0];
      setActiveClass(mapActiveClass(activeRecord));

      // Remove photos, name-game stats and plan usage records whose student or
      // class no longer exists (e.g. after a class was deleted).
      // Fire-and-forget; failures are handled internally.
      const knownStudentIds = new Set<string>();
      // Per class, ids and names alike: pair keys written before students
      // carried ids fall back to the name.
      const studentIdsByClass = new Map<string, Set<string>>();
      for (const entry of collection.classes) {
        const perClass = new Set<string>();
        for (const student of entry.students ?? []) {
          knownStudentIds.add(student.id);
          perClass.add(student.id);
          if (student.name) perClass.add(student.name);
        }
        studentIdsByClass.set(entry.id, perClass);
      }
      void sweepOrphanPhotos(knownStudentIds);
      void sweepOrphanNameGameStats(knownStudentIds);
      void sweepOrphanPlanUsage(studentIdsByClass);
    },
    [mapActiveClass, setActiveClass, setClassSummaries],
  );

  const fetchPersistedState = useCallback(async (): Promise<LoadedSnapshot> => {
    const [classCollectionResult, activeClassSnapshotResult] =
      await Promise.all([
        repository.loadClassCollection(),
        repository.loadActiveClassSnapshot(),
      ]);

    await idbSet(DB_KEYS.version, APP_DATA_VERSION);

    return {
      classCollectionResult,
      activeClassSnapshotResult,
    };
  }, [repository]);

  const applyPersistedState = useCallback(
    (snapshot: LoadedSnapshot) => {
      const { classCollectionResult, activeClassSnapshotResult } = snapshot;

      const nextActiveClassId =
        classCollectionResult.success &&
        classCollectionResult.data?.activeClassId
          ? classCollectionResult.data.activeClassId
          : classCollectionResult.success &&
              (classCollectionResult.data as ClassCollectionState)?.classes
                ?.length > 0
            ? ((classCollectionResult.data as ClassCollectionState).classes[0]
                ?.id ?? null)
            : null;

      isRestoringRef.current = true;
      if (nextActiveClassId) {
        activeClassIdRef.current = nextActiveClassId;
      }

      // Seed the plan usage record from plans saved before the signals existed.
      // It runs here, where the class id and the plans come from the same load,
      // so it can never seed another class's bucket.
      if (nextActiveClassId && activeClassSnapshotResult.success) {
        const snapshotPlans =
          (activeClassSnapshotResult.data as ActiveClassSnapshot)
            .seatingHistory ?? [];
        if (snapshotPlans.length > 0) {
          backfillPlanUsage(nextActiveClassId, snapshotPlans).catch((error) => {
            logError(
              'Failed to backfill plan usage',
              { error },
              'useSeatingPersistence',
            );
          });
        }
      }

      if (!classCollectionResult.success) {
        logError(
          'Failed to load class collection',
          { error: classCollectionResult.error },
          'useSeatingPersistence',
        );
      }

      if (!activeClassSnapshotResult.success) {
        const isValidationError =
          (
            activeClassSnapshotResult as {
              error?: { type?: string; message?: string };
            }
          ).error?.type === RepositoryErrorType.VALIDATION_ERROR &&
          (activeClassSnapshotResult as { error?: { message?: string } }).error
            ?.message === 'No active class selected';
        const logger = isValidationError ? logWarn : logError;
        logger(
          'Failed to load active class snapshot from repository',
          { error: (activeClassSnapshotResult as { error?: unknown }).error },
          'useSeatingPersistence',
        );
      }

      // CRITICAL: Increment persist versions to invalidate any queued jobs
      // This prevents old jobs from overwriting the new data we're about to load
      queue.incrementAllVersions();

      // One synchronous render for the whole class. Students, plans and room
      // live in Zustand stores, which React renders right away even inside a
      // transition, while seating, locks and the class id are React state. A
      // transition split the two: the effect that syncs the seating to the new
      // students dispatched behind the pending update, React rebased it into a
      // fresh array on every render, and effects watching the seating kept the
      // loop going — the tab froze and the class id never arrived.
      // Only ever called after an await, so never during a render or an effect.
      flushSync(() => {
        const applyMixSettings = (next: MixSettings | null) => {
          const resolved = next ?? DEFAULT_CLASS_MIX_SETTINGS;
          setMixSettings((prev) => {
            if (stableStringify(prev) === stableStringify(resolved)) {
              return prev;
            }
            return resolved;
          });
        };

        const applyClassroomScene = (next: ClassroomScene | null) => {
          const resolved = next ?? DEFAULT_CLASSROOM_SCENE;
          setClassroomScene((prev) => {
            if (stableStringify(prev) === stableStringify(resolved)) {
              return prev;
            }
            return resolved;
          });
        };

        // IMPORTANT: Set class data BEFORE updating activeClass.
        // If we update activeClass first, the queuePersist effects will trigger
        // with the new classId but old data, causing cross-contamination.
        if (activeClassSnapshotResult.success) {
          const data = activeClassSnapshotResult.data as ActiveClassSnapshot;
          const {
            students: snapshotStudents = [],
            seatingHistory: snapshotSeatingHistory = [],
            mixHistory: snapshotMixHistory = [],
            currentSeating: snapshotCurrentSeating = [],
            lockedPositions: snapshotLockedPositions = {},
            mixSettings: snapshotMixSettings = null,
            classroomScene: snapshotClassroomScene = null,
            circleLayout: snapshotCircleLayout = null,
            activePlanId: snapshotActivePlanId = null,
            rooms: snapshotRooms = [],
            activeRoomId: snapshotActiveRoomId = null,
          } = data;

          // Only update state if content actually changed to prevent infinite loops
          // caused by effect dependencies triggering redundant saves/reloads.
          setStudents((prev) => {
            if (stableStringify(prev) === stableStringify(snapshotStudents))
              return prev;
            return snapshotStudents;
          });

          setSeatingHistory((prev) => {
            if (
              stableStringify(prev) === stableStringify(snapshotSeatingHistory)
            )
              return prev;
            return snapshotSeatingHistory;
          });

          setMixHistory((prev) => {
            if (stableStringify(prev) === stableStringify(snapshotMixHistory))
              return prev;
            return snapshotMixHistory;
          });

          setCurrentSeating((prev) => {
            if (
              stableStringify(prev) === stableStringify(snapshotCurrentSeating)
            )
              return prev;
            return snapshotCurrentSeating;
          });

          setLockedPositions((prev) => {
            if (
              stableStringify(prev) === stableStringify(snapshotLockedPositions)
            )
              return prev;
            return snapshotLockedPositions;
          });

          applyMixSettings(snapshotMixSettings);
          applyClassroomScene(snapshotClassroomScene);

          setCircleLayout((prev) => {
            const next = snapshotCircleLayout ?? null;
            if (stableStringify(prev) === stableStringify(next)) return prev;
            return next;
          });

          setActivePlanId((prev) => {
            const next = snapshotActivePlanId ?? null;
            if (prev === next) return prev;
            return next;
          });

          setRooms((prev) => {
            if (stableStringify(prev) === stableStringify(snapshotRooms))
              return prev;
            return snapshotRooms;
          });

          setActiveRoomId((prev) => {
            const next = snapshotActiveRoomId ?? null;
            if (prev === next) return prev;
            return next;
          });

          const nextPlanName =
            snapshotActivePlanId !== null
              ? (snapshotSeatingHistory.find(
                  (plan) => plan.id === snapshotActivePlanId,
                )?.name ?? '')
              : '';
          setPlanName((prev) => {
            if (prev === nextPlanName) return prev;
            return nextPlanName;
          });
        } else {
          // Fallback to safe empty state when no active class snapshot is available
          setStudents([]);
          setSeatingHistory([]);
          setMixHistory([]);
          setCurrentSeating([]);
          setLockedPositions({});
          applyMixSettings(null);
          applyClassroomScene(null);
          setCircleLayout(null);
          setActivePlanId(null);
          setRooms([]);
          setActiveRoomId(null);
          setPlanName('');
        }

        // Update activeClass and classSummaries AFTER setting all class data.
        // This ensures queuePersist effects triggered by activeClass change
        // will have the correct new data already in the stores.
        if (classCollectionResult.success) {
          applyClassCollection(
            classCollectionResult.data as ClassCollectionState,
          );
        }

        acknowledgeStudentUpdates();
      });

      // Deactivate restore gate after the first post-render tick so queuePersist
      // effects don't write during hydration and only resume after state is stable.
      setTimeout(() => {
        if (nextActiveClassId) {
          activeClassIdRef.current = nextActiveClassId;
        }
        isRestoringRef.current = false;
      }, 0);
    },
    [
      applyClassCollection,
      acknowledgeStudentUpdates,
      setStudents,
      setSeatingHistory,
      setMixHistory,
      setLockedPositions,
      setMixSettings,
      setClassroomScene,
      setCurrentSeating,
      setCircleLayout,
      setActivePlanId,
      setRooms,
      setActiveRoomId,
      setPlanName,
      queue,
    ],
  );

  // Load persisted data on mount using Repository Pattern
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snapshot = await fetchPersistedState();
        if (cancelled) return;
        applyPersistedState(snapshot);
      } catch (e) {
        logError(
          'Repository load failed',
          { error: e },
          'useSeatingPersistence',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyPersistedState, fetchPersistedState]);

  // Use extracted class data persistence hook for auto-persist effects
  const { reloadCurrentClassData } = useClassDataPersistence(
    {
      students,
      seatingHistory,
      mixHistory,
      currentSeating,
      lockedPositions,
      mixSettings,
      classroomScene,
      circleLayout,
      activePlanId,
      rooms,
      activeRoomId,
      activeClassId: activeClass.id,
      hasActiveClass,
    },
    queue,
    fetchPersistedState,
    applyPersistedState,
    isRestoringRef,
  );

  const saveSeatingPlan = useCallback(
    (
      name: string,
      scene: ClassroomScene,
      circleLayoutArg?: CircleLayout | null,
      options?: SaveSeatingPlanOptions,
    ): boolean => {
      const trimmed = name.trim();
      if (!trimmed || currentSeating.length === 0) return false;

      // A silent auto-save recycles the previous one so leaving step 3
      // repeatedly cannot bury the real plans under timestamped entries.
      const autoSave = options?.autoSave === true;
      const slot = resolvePlanSlot({
        history: seatingHistory,
        activePlanId,
        name: trimmed,
        autoSave,
        rename: options?.rename === true,
        roomId: activeRoomId,
      });
      if (!slot) return false;

      const base: SavedPlan = {
        id: slot.planId,
        name: trimmed,
        // The room the plan was made in (decision 0024). Without an open room
        // — never once a class is read — the next read places it.
        ...(activeRoomId && { roomId: activeRoomId }),
        // ISO 8601, formatted for display via `formatStoredDate`. Plans saved
        // before this change hold a German display string and keep rendering
        // as-is — see the legacy branch in `formatStoredDate`.
        date: toIsoDate(),
        seating: currentSeating,
        scene,
        locks: lockedPositions,
        ...(circleLayoutArg && { circleLayout: circleLayoutArg }),
        // Omitted on explicit saves, which promotes an auto-save entry to a
        // regular plan.
        ...(autoSave && { autoSaved: true as const }),
      };

      setSeatingHistory((prev) => upsertPlan(prev, base));

      // Naming a plan is a deliberate act — unlike the silent auto-save that
      // fires whenever step 3 is left — so it counts as a usage signal.
      if (!autoSave) {
        recordPlanUsage(activeClass.id, currentSeating, 'saved').catch(
          (error) => {
            logError(
              'Failed to record plan usage signal',
              { error, source: 'saved' },
              'useSeatingPersistence',
            );
          },
        );
      }

      setActivePlanId(base.id);
      setPlanName(trimmed);
      return true;
    },
    [
      currentSeating,
      lockedPositions,
      seatingHistory,
      activePlanId,
      activeRoomId,
      activeClass.id,
      setSeatingHistory,
      setActivePlanId,
      setPlanName,
    ],
  );

  const loadSeatingPlan = useCallback(
    (plan: SavedPlan, options?: LoadOptions) => {
      if (!plan || !plan.seating) return;
      setCurrentSeating(plan.seating);

      if (options?.replaceStudents) {
        const loaded: Student[] = [];
        plan.seating.forEach((table) =>
          table.forEach((s) => {
            if (s) loaded.push({ ...s, id: generateId() });
          }),
        );
        if (loaded.length > 0) setStudents(loaded);
        setLockedPositions({});
      } else {
        const ids = new Set(students.map((s) => s.id));
        setLockedPositions(fittingLocks(plan.locks ?? {}, plan.seating, ids));
      }
      setPlanName(plan.name);
      setActivePlanId(plan.id);
    },
    [
      students,
      setCurrentSeating,
      setStudents,
      setLockedPositions,
      setPlanName,
      setActivePlanId,
    ],
  );

  const deleteSeatingPlan = useCallback(
    (id: string) => {
      setSeatingHistory((prev) => prev.filter((p) => p.id !== id));
      if (activePlanId === id) {
        setActivePlanId(null);
        setPlanName('');
      }
      // A room left with this plan open keeps its state, without the plan.
      setRooms((prev) =>
        prev.some((room) => room.parked?.activePlanId === id)
          ? prev.map((room) =>
              room.parked?.activePlanId === id
                ? { ...room, parked: { ...room.parked, activePlanId: null } }
                : room,
            )
          : prev,
      );
    },
    [activePlanId, setSeatingHistory, setActivePlanId, setPlanName, setRooms],
  );

  // Replacing the room as a whole — a template loaded, the room set up anew —
  // makes what is on screen a different plan, often the same class in another
  // room (a lab, a gym). Let go of the open one, name and all, so no save, the
  // one before export and present included, writes the new room over it: a
  // save then starts a new entry, and a name that stayed would be refused as
  // taken. An undo of the room brings the room back but not this link; the
  // next save starts a new plan rather than updating the old one, which loses
  // nothing.
  const releaseOpenPlan = useCallback(() => {
    if (activePlanId === null) return;
    setActivePlanId(null);
    setPlanName('');
  }, [activePlanId, setActivePlanId, setPlanName]);

  // A copy of a saved plan beside it, under a free name ("September (2)"),
  // dated today; the open plan stays the one that was open.
  const duplicateSeatingPlan = useCallback(
    (id: string): SavedPlan | null => {
      const plan = seatingHistory.find((entry) => entry.id === id);
      if (!plan) return null;
      const copy: SavedPlan = {
        ...plan,
        id: generateId(),
        name: uniqueName(
          plan.name,
          seatingHistory.map((entry) => entry.name),
          MAX_NAME_LENGTH,
        ),
        date: toIsoDate(),
      };
      delete copy.autoSaved;
      setSeatingHistory((prev) => [...prev, copy]);
      return copy;
    },
    [seatingHistory, setSeatingHistory],
  );

  const renameSeatingPlan = useCallback(
    (id: string, name: string): boolean => {
      const trimmed = (name ?? '').trim();
      if (!trimmed) return false;
      const exists = seatingHistory.some(
        (p) => p.name === trimmed && p.id !== id,
      );
      if (exists) return false;
      setSeatingHistory((prev) =>
        prev.map((p) => (p.id === id ? { ...p, name: trimmed } : p)),
      );
      if (activePlanId === id) setPlanName(trimmed);
      return true;
    },
    [seatingHistory, activePlanId, setSeatingHistory, setPlanName],
  );

  const exportAllAsJson = useCallback(async () => {
    const { exportAllAsJson: exportAllAsJsonUtil } = await loadDataBackup();
    // Load circle data and templates from storage using repository
    let currentCircleLayout: CircleLayout | null = null;
    let circleLayouts: CircleExportData[] = [];
    let templates: ClassroomTemplate[] = [];
    let classCollection: ClassCollectionState | null = null;

    const [
      circleLayoutResult,
      circleLayoutsResult,
      templatesResult,
      classCollectionResult,
    ] = await Promise.all([
      repository.loadCurrentCircleLayout(),
      repository.loadCircleLayouts(),
      repository.loadTemplates(),
      repository.loadClassCollection(),
    ]);

    if (circleLayoutResult.success) {
      currentCircleLayout = circleLayoutResult.data;
    } else {
      logError(
        'Failed to load circle layout for export',
        { error: circleLayoutResult.error },
        'useSeatingPersistence',
      );
    }

    if (circleLayoutsResult.success) {
      circleLayouts = circleLayoutsResult.data;
    } else {
      logError(
        'Failed to load circle layouts for export',
        { error: circleLayoutsResult.error },
        'useSeatingPersistence',
      );
    }

    if (templatesResult.success) {
      templates = templatesResult.data;
    } else {
      logError(
        'Failed to load templates for export',
        { error: templatesResult.error },
        'useSeatingPersistence',
      );
    }

    if (classCollectionResult.success) {
      classCollection = classCollectionResult.data;
    } else {
      logError(
        'Failed to load class collection for export',
        { error: classCollectionResult.error },
        'useSeatingPersistence',
      );
    }

    // Create loadTemplate function for exportAllAsJsonUtil
    const loadTemplate = async () => templates;

    return exportAllAsJsonUtil(
      {
        students,
        seatingHistory,
        classroomScene,
        mixHistory,
        mixSettings,
        lockedPositions,
        circleLayouts,
        currentCircleLayout,
        classCollection,
      },
      loadTemplate,
    );
  }, [
    repository,
    students,
    seatingHistory,
    mixHistory,
    classroomScene,
    mixSettings,
    lockedPositions,
  ]);

  const importAllFromJson = useCallback(
    async (json: string, opts?: { merge?: boolean }) => {
      const { importAllFromJson: importAllFromJsonUtil } =
        await loadDataBackup();

      // Create setter for circle layout using repository
      const persistCircleLayout = async (layout: CircleLayout | null) => {
        const result = await repository.saveCurrentCircleLayout(layout);
        if (!result.success) {
          logError(
            'Failed to save circle layout during import',
            { error: result.error },
            'useSeatingPersistence',
          );
        }
      };

      // Throws when the collection cannot be saved: the import then reports
      // a failure instead of a success that did not happen.
      const persistClassCollection = async (
        collection: ClassCollectionState,
      ) => {
        const result = await repository.saveClassCollection(collection);
        if (!result.success) {
          logError(
            'Failed to save class collection during import',
            { error: result.error },
            'useSeatingPersistence',
          );
          throw new Error(result.error.message);
        }
        await reloadCurrentClassData();
      };

      // A merge builds on what is stored, so whatever the open class still
      // has queued is written first.
      const loadStoredClassCollection = async () => {
        await queue.flushPersistQueue();
        const result = await repository.loadClassCollection();
        return result.success ? result.data : null;
      };

      const loadStoredTemplates = async () => {
        const result = await repository.loadTemplates();
        return result.success ? result.data : null;
      };

      const persistCircleLayouts = async (layouts: CircleExportData[]) => {
        const layoutsResult = await repository.saveCircleLayouts(layouts);
        if (!layoutsResult.success) {
          logError(
            'Failed to import circle layouts',
            { error: layoutsResult.error },
            'useSeatingPersistence',
          );
          showToast('error', TOAST_MESSAGES.IMPORT_ERROR);
        }
      };

      const persistTemplates = async (templates: ClassroomTemplate[]) => {
        const result = await repository.saveTemplates(templates);
        if (!result.success) {
          logError(
            'Failed to save templates during import',
            { error: result.error },
            'useSeatingPersistence',
          );
        }
      };

      return importAllFromJsonUtil(
        json,
        {
          setStudents,
          setSeatingHistory,
          setMixHistory,
          setLockedPositions,
          setMixSettings,
          setClassroomScene,
          setCircleLayout: persistCircleLayout,
          setCircleLayouts: persistCircleLayouts,
          setCurrentSeating,
          setPlanName,
          setActivePlanId,
          setClassCollection: persistClassCollection,
          setTemplates: persistTemplates,
          loadClassCollection: loadStoredClassCollection,
          loadTemplates: loadStoredTemplates,
        },
        opts,
      );
    },
    [
      queue,
      repository,
      setStudents,
      setSeatingHistory,
      setMixHistory,
      setLockedPositions,
      setMixSettings,
      setClassroomScene,
      setCurrentSeating,
      setPlanName,
      setActivePlanId,
      reloadCurrentClassData,
    ],
  );

  const clearAllData = useCallback(async () => {
    const { clearAllData: clearAllDataUtil } = await loadDataBackup();
    const clearResult = await repository.clearAll();
    if (!clearResult.success) {
      logError(
        'Failed to clear stored data from repository',
        { error: clearResult.error },
        'useSeatingPersistence',
      );
      throw new Error(clearResult.error.message);
    }

    await clearAllDataUtil(
      {
        setCurrentSeating,
        setActivePlanId,
        setLockedPositions,
        setRooms,
        setActiveRoomId,
      },
      // repository.clearAll() already removed the DB_KEYS; the helper still
      // wipes the separate photo database.
      { skipIndexedDBClear: true },
    );
    setClassSummaries([]);
    setActiveClass(DEFAULT_ACTIVE_CLASS);
  }, [
    repository,
    setActivePlanId,
    setActiveClass,
    setActiveRoomId,
    setClassSummaries,
    setCurrentSeating,
    setLockedPositions,
    setRooms,
  ]);

  const downloadCsvFile = useDownloadFile({
    defaultMimeType: 'text/csv;charset=utf-8',
    logContext: 'useSeatingPersistence.downloadStudentsCsv',
    filePickerTypes: [
      {
        description: 'CSV',
        accept: { 'text/csv': ['.csv'] },
      },
    ],
  });

  const downloadStudentsCsv = useCallback(() => {
    void (async () => {
      try {
        const csv = exportStudentsToCsv(students);
        await downloadCsvFile(csv, buildStudentsCsvFilename(activeClass.name));
      } catch (e) {
        errorHandlers.exportError(e as Error, 'toast:csv.exportError');
      }
    })();
  }, [students, downloadCsvFile, activeClass.name]);

  // Template operations using repository (compatibility wrappers)
  const saveTemplate = useCallback(
    async (
      name: string,
      scene: ClassroomScene,
    ): Promise<SaveTemplateResult> => {
      const trimmed = name.trim();
      if (!trimmed) {
        return { success: false, error: 'empty' as SaveTemplateError };
      }

      // Check for duplicates
      const templatesResult = await repository.loadTemplates();
      if (!templatesResult.success) {
        logError(
          'Failed to load templates before saving',
          { error: templatesResult.error },
          'useSeatingPersistence',
        );
        return { success: false, error: 'storage' as SaveTemplateError };
      }

      const exists = templatesResult.data.some((t) => t.name === trimmed);
      if (exists) {
        return { success: false, error: 'duplicate' as SaveTemplateError };
      }

      // Save new template
      const template: ClassroomTemplate = {
        id: Date.now(),
        name: trimmed,
        scene,
      };

      const result = await repository.saveTemplate(template);
      if (result.success) {
        return { success: true };
      }

      if (result.error.type === RepositoryErrorType.DUPLICATE_KEY) {
        return { success: false, error: 'duplicate' as SaveTemplateError };
      }

      logError(
        'Failed to save template via repository',
        { error: result.error },
        'useSeatingPersistence',
      );
      return { success: false, error: 'storage' as SaveTemplateError };
    },
    [repository],
  );

  const updateTemplate = useCallback(
    async (id: number, scene: ClassroomScene): Promise<boolean> => {
      const result = await repository.updateTemplate(id, scene);
      if (!result.success) {
        logError(
          'Failed to update template via repository',
          { error: result.error, templateId: id },
          'useSeatingPersistence',
        );
      }
      return result.success;
    },
    [repository],
  );

  const loadTemplate = useCallback(async (): Promise<ClassroomTemplate[]> => {
    const result = await repository.loadTemplates();
    if (!result.success) {
      logError(
        'Failed to load templates via repository',
        { error: result.error },
        'useSeatingPersistence',
      );
      return [];
    }

    return result.data;
  }, [repository]);

  const deleteTemplate = useCallback(
    async (id: number): Promise<void> => {
      const result = await repository.deleteTemplate(id);
      if (!result.success) {
        logError(
          'Failed to delete template via repository',
          { error: result.error, templateId: id },
          'useSeatingPersistence',
        );
      }
    },
    [repository],
  );

  const renameTemplate = useCallback(
    async (
      id: number,
      newName: string,
    ): Promise<{
      success: boolean;
      error?: 'empty' | 'duplicate' | 'storage';
    }> => {
      const trimmed = newName.trim();
      if (!trimmed) {
        return { success: false, error: 'empty' };
      }

      // Check for duplicates (excluding current template)
      const templatesResult = await repository.loadTemplates();
      if (!templatesResult.success) {
        logError(
          'Failed to load templates before rename',
          { error: templatesResult.error },
          'useSeatingPersistence',
        );
        return { success: false, error: 'storage' };
      }

      const exists = templatesResult.data.some(
        (t) => t.id !== id && t.name === trimmed,
      );
      if (exists) {
        return { success: false, error: 'duplicate' };
      }

      const result = await repository.renameTemplate(id, trimmed);
      if (result.success) {
        return { success: true };
      }

      if (result.error.type === RepositoryErrorType.DUPLICATE_KEY) {
        return { success: false, error: 'duplicate' };
      }

      logError(
        'Failed to rename template via repository',
        { error: result.error, templateId: id },
        'useSeatingPersistence',
      );
      return { success: false, error: 'storage' };
    },
    [repository],
  );

  return {
    saveSeatingPlan,
    loadSeatingPlan,
    deleteSeatingPlan,
    releaseOpenPlan,
    duplicateSeatingPlan,
    renameSeatingPlan,
    saveTemplate,
    updateTemplate,
    loadTemplate,
    deleteTemplate,
    renameTemplate,
    exportAllAsJson,
    importAllFromJson,
    clearAllData,
    downloadStudentsCsv,
    reloadCurrentClassData,
  };
}
