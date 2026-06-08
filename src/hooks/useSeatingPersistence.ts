/**
 * @internal
 * Internal hook used by useSeatingGenerator. Do not import directly.
 * Use SeatingPlanGeneratorProvider context hooks instead.
 */
import { startTransition, useCallback, useEffect, useRef } from 'react';
import { set as idbSet } from 'idb-keyval';
import {
  DEFAULT_ACTIVE_CLASS,
  type ActiveClassState,
  type ClassCollectionState,
  type ClassroomScene,
  type ClassroomTemplate,
  type ClassRecord,
  type LockedPositions,
  type MixSettings,
  type SavedPlan,
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
} from '@/utils';
import { RepositoryErrorType, type ActiveClassSnapshot } from '@/repositories';
import type { SeatingState } from './useSeatingState';
import { DB_KEYS } from '@/utils/data/storageKeys';
import { APP_DATA_VERSION } from '@/utils/data/indexedDb';
import type {
  SaveTemplateResult,
  SaveTemplateError,
} from './useTemplateStorage';
import {
  exportAllAsJson as exportAllAsJsonUtil,
  importAllFromJson as importAllFromJsonUtil,
  clearAllData as clearAllDataUtil,
} from '@/utils/data/dataBackup';
import { useSeatingRepository } from './useSeatingRepository';
import { useDownloadFile } from './useDownloadFile';
import { summarizeClass } from '@/utils/data/classCollection';
import {
  usePersistErrorHandling,
  usePersistQueue,
  useClassDataPersistence,
  type LoadedSnapshot,
} from './persistence';

export const exportStudentsToCsv = (students: Student[]): string => {
  const header =
    'Name,Geschlecht,Körpergröße,Unruhig,Schüchtern,Ablenkbarkeit,Vordere Plätze,Fensterplatz,Türnähe,Wunschpartner,Distanzwunsch,Leistungsstark,Leistungsschwach\n';
  const escapeCsvCell = (value: unknown) => {
    const str = String(value ?? '');
    const trimmed = str.trimStart();
    const originalFirst = str.charAt(0);
    const trimmedFirst = trimmed.charAt(0);
    // Prefix dangerous spreadsheet formula indicators to prevent CSV injection.
    const dangerousLeading =
      (trimmedFirst !== '' && ['=', '+', '-', '@'].includes(trimmedFirst)) ||
      ['\t', '\r', '\n'].includes(originalFirst);
    const sanitized = dangerousLeading ? `'${str}` : str;
    return sanitized.includes(',') ||
      sanitized.includes('"') ||
      sanitized.includes('\n')
      ? `"${sanitized.replace(/"/g, '""')}"`
      : sanitized;
  };
  const heightLabels = {
    small: 'Klein',
    medium: 'Mittel',
    tall: 'Groß',
  } as const;
  const studentNameMap = students.reduce<Record<string, string>>((acc, s) => {
    acc[s.id] = s.name;
    return acc;
  }, {});
  const rows = students.map((s) => {
    const gender =
      s.gender === 'boy'
        ? 'Junge'
        : s.gender === 'girl'
          ? 'Mädchen'
          : s.gender === 'diverse'
            ? 'Divers'
            : '';
    const heightLabel = s.height ? (heightLabels[s.height] ?? '') : '';
    const wishPartnerName =
      s.wishPartnerId && studentNameMap[s.wishPartnerId]
        ? studentNameMap[s.wishPartnerId]
        : '';
    const avoidPartnerName =
      s.avoidPartnerId && studentNameMap[s.avoidPartnerId]
        ? studentNameMap[s.avoidPartnerId]
        : '';
    const cells = [
      s.name,
      gender,
      heightLabel,
      s.restless ? 'ja' : '',
      s.shy ? 'ja' : '',
      s.concentrationIssues ? 'ja' : '',
      s.needsFrontSeat ? 'ja' : '',
      s.prefersWindow ? 'ja' : '',
      s.prefersDoor ? 'ja' : '',
      wishPartnerName,
      avoidPartnerName,
      s.performanceStrong ? 'ja' : '',
      s.performanceWeak ? 'ja' : '',
    ];
    return cells.map((value) => escapeCsvCell(value)).join(',');
  });
  return header + rows.join('\n');
};

export type LoadOptions = {
  replaceStudents?: boolean;
};

function generateUniquePlanId(history: SavedPlan[]): string {
  const existingIds = new Set(history.map((plan) => plan.id));
  let candidate = generateId();

  while (existingIds.has(candidate)) {
    candidate = generateId();
  }

  return candidate;
}

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

      startTransition(() => {
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
    ): boolean => {
      const trimmed = name.trim();
      if (!trimmed || currentSeating.length === 0) return false;

      const exists = seatingHistory.some(
        (p) => p.name === trimmed && p.id !== activePlanId,
      );
      if (exists) return false;

      const active =
        activePlanId !== null
          ? seatingHistory.find((p) => p.id === activePlanId)
          : null;
      const isUpdate = active?.name === trimmed;
      const planId =
        isUpdate && activePlanId !== null
          ? activePlanId
          : generateUniquePlanId(seatingHistory);

      const base: SavedPlan = {
        id: planId,
        name: trimmed,
        date: new Date().toLocaleDateString('de-DE'),
        seating: currentSeating,
        scene,
        locks: lockedPositions,
        ...(circleLayoutArg && { circleLayout: circleLayoutArg }),
      };

      setSeatingHistory((prev) => {
        if (isUpdate && activePlanId !== null) {
          return prev.map((p) => (p.id === activePlanId ? { ...base } : p));
        }
        return [...prev, base];
      });

      setActivePlanId(base.id);
      setPlanName(trimmed);
      return true;
    },
    [
      currentSeating,
      lockedPositions,
      seatingHistory,
      activePlanId,
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
        const next: LockedPositions = {};
        const seatCounts = plan.seating.map((t) => t.length);
        const tableCount = seatCounts.length;
        if (plan.locks) {
          for (const [sid, pos] of Object.entries(plan.locks)) {
            if (!ids.has(sid)) continue;
            if (pos.table < 0 || pos.table >= tableCount) continue;
            const seats = seatCounts[pos.table] ?? 0;
            if (pos.seat < 0 || pos.seat >= seats) continue;
            next[sid] = { table: pos.table, seat: pos.seat };
          }
        }
        setLockedPositions(next);
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
    },
    [activePlanId, setSeatingHistory, setActivePlanId, setPlanName],
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
          return;
        }
        await reloadCurrentClassData();
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

      await importAllFromJsonUtil(
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
          getStudents: () => students,
          getLockedPositions: () => lockedPositions,
        },
        opts,
      );
    },
    [
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
      students,
      lockedPositions,
    ],
  );

  const clearAllData = useCallback(async () => {
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
      { setCurrentSeating, setActivePlanId, setLockedPositions },
      { skipIndexedDBClear: true }, // repository.clearAll() already handled storage
    );
    setClassSummaries([]);
    setActiveClass(DEFAULT_ACTIVE_CLASS);
  }, [
    repository,
    setActivePlanId,
    setActiveClass,
    setClassSummaries,
    setCurrentSeating,
    setLockedPositions,
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
        await downloadCsvFile(csv, 'students.csv');
      } catch (e) {
        errorHandlers.exportError(
          e as Error,
          'CSV-Export fehlgeschlagen. Bitte versuchen Sie es erneut.',
        );
      }
    })();
  }, [students, downloadCsvFile]);

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
    prepareClassSwitch: queue.prepareClassSwitch,
  };
}
