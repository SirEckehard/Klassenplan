// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { createStore } from 'zustand/vanilla';
import { useStoreWithEqualityFn } from 'zustand/traditional';
import type { AlgorithmStoreSlice, StateUpdater } from './featureStores';
import { evaluateStateUpdater } from './storeUtils';
import type {
  MixSettings,
  SavedPlan,
  MixResult,
  StatisticHighlightMode,
  StatisticHighlightState,
} from '@/types';
import type { CriterionFulfillment } from '@/utils/algorithm/seatingStatistics';
import type { LatestChangelogEntry } from '@/utils';
import { LOCAL_STORAGE_KEYS } from '@/utils/data/storageKeys';
import {
  DEFAULT_MIX_WEIGHTS,
  neutralSettings,
  normalizeMixSettings,
  MIX_HISTORY_LIMIT,
  getBrowserWindow,
  getLatestChangelogEntry,
  getAppVersion,
  logDebug,
} from '@/utils';

const defaultMixSettings = normalizeMixSettings(
  {
    avoidPreviousPairs: DEFAULT_MIX_WEIGHTS.avoidPreviousPairs,
    preferGenderMix: DEFAULT_MIX_WEIGHTS.preferGenderMix,
  },
  neutralSettings,
);

function loadMixSettings(): MixSettings {
  const browserWindow = getBrowserWindow();
  if (!browserWindow) {
    return defaultMixSettings;
  }
  try {
    const stored = browserWindow.localStorage.getItem(
      LOCAL_STORAGE_KEYS.mixSettings,
    );
    if (!stored) {
      return defaultMixSettings;
    }
    return normalizeMixSettings(
      JSON.parse(stored) as MixSettings,
      neutralSettings,
    );
  } catch (error) {
    logDebug('Failed to load mix settings from localStorage', { error });
    return defaultMixSettings;
  }
}

function persistMixSettings(settings: MixSettings) {
  const browserWindow = getBrowserWindow();
  if (!browserWindow) {
    return;
  }
  try {
    browserWindow.localStorage.setItem(
      LOCAL_STORAGE_KEYS.mixSettings,
      JSON.stringify(settings),
    );
  } catch (error) {
    logDebug('Failed to persist mix settings to localStorage', { error });
  }
}

const STATISTICS_BADGE_KEY = 'spg.showStatisticsBadge';

function readStatisticsBadge(): boolean {
  const browserWindow = getBrowserWindow();
  if (!browserWindow) {
    return false;
  }
  try {
    const stored = browserWindow.localStorage.getItem(STATISTICS_BADGE_KEY);
    return stored === 'true';
  } catch (error) {
    logDebug('Failed to read statistics badge from localStorage', { error });
    return false;
  }
}

function persistStatisticsBadge(value: boolean) {
  const browserWindow = getBrowserWindow();
  if (!browserWindow) {
    return;
  }
  try {
    browserWindow.localStorage.setItem(
      STATISTICS_BADGE_KEY,
      value ? 'true' : 'false',
    );
  } catch (error) {
    logDebug('Failed to persist statistics badge to localStorage', { error });
  }
}

export const algorithmStore = createStore<AlgorithmStoreSlice>()((set) => ({
  step: 1,
  mixSettings: loadMixSettings(),
  seatingHistory: [],
  mixHistory: [],
  planName: '',
  planNameError: false,
  lastStatistics: null,
  showStatisticsBadge: readStatisticsBadge(),
  statisticsHighlight: null,
  showPostUpdateNotice: false,
  latestChangelogEntry: getLatestChangelogEntry(),
  currentAppVersion: getAppVersion() ?? '',
  setStep: (next: number) => {
    set((state) => (state.step === next ? state : { ...state, step: next }));
  },
  setMixSettings: (next: StateUpdater<MixSettings>) => {
    set((state) => {
      const resolved = evaluateStateUpdater(state.mixSettings, next);
      const normalized = normalizeMixSettings(resolved, neutralSettings);
      if (normalized === state.mixSettings) {
        return state;
      }
      persistMixSettings(normalized);
      return { ...state, mixSettings: normalized };
    });
  },
  setSeatingHistory: (next: StateUpdater<SavedPlan[]>) => {
    set((state) => {
      const resolved = evaluateStateUpdater(state.seatingHistory, next);
      return state.seatingHistory === resolved
        ? state
        : { ...state, seatingHistory: resolved };
    });
  },
  setMixHistory: (next: StateUpdater<MixResult[]>) => {
    set((state) => {
      const resolved = evaluateStateUpdater(state.mixHistory, next);
      return state.mixHistory === resolved
        ? state
        : { ...state, mixHistory: resolved };
    });
  },
  addMixResult: (result: MixResult) => {
    set((state) => {
      const nextHistory = [...state.mixHistory, result];
      const trimmed =
        nextHistory.length > MIX_HISTORY_LIMIT
          ? nextHistory.slice(-MIX_HISTORY_LIMIT)
          : nextHistory;
      return { ...state, mixHistory: trimmed };
    });
  },
  deleteMixResult: (id: number) => {
    set((state) => ({
      ...state,
      mixHistory: state.mixHistory.filter((item) => item.id !== id),
    }));
  },
  clearMixHistory: () => {
    set((state) => ({ ...state, mixHistory: [] }));
  },
  setPlanName: (value: StateUpdater<string>) => {
    set((state) => {
      const nextValue = evaluateStateUpdater(state.planName, value);
      return state.planName === nextValue
        ? state
        : { ...state, planName: nextValue };
    });
  },
  setPlanNameError: (value: boolean) => {
    set((state) =>
      state.planNameError === value
        ? state
        : { ...state, planNameError: value },
    );
  },
  setLastStatistics: (next: StateUpdater<CriterionFulfillment[] | null>) => {
    set((state) => {
      const resolved = evaluateStateUpdater(state.lastStatistics, next);
      return state.lastStatistics === resolved
        ? state
        : { ...state, lastStatistics: resolved };
    });
  },
  setShowStatisticsBadge: (next: StateUpdater<boolean>) => {
    set((state) => {
      const resolved = evaluateStateUpdater(state.showStatisticsBadge, next);
      if (state.showStatisticsBadge === resolved) {
        return state;
      }
      persistStatisticsBadge(resolved);
      return { ...state, showStatisticsBadge: resolved };
    });
  },
  setStatisticsHighlight: (
    next: StateUpdater<StatisticHighlightState | null>,
  ) => {
    set((state) => {
      const resolved = evaluateStateUpdater(state.statisticsHighlight, next);
      return state.statisticsHighlight === resolved
        ? state
        : { ...state, statisticsHighlight: resolved };
    });
  },
  setStatisticsHighlightMode: (mode: StatisticHighlightMode | null) => {
    set((state) => {
      if (!state.statisticsHighlight && mode === null) {
        return state;
      }
      if (!state.statisticsHighlight) {
        return state;
      }
      if (mode === null) {
        return { ...state, statisticsHighlight: null };
      }
      if (state.statisticsHighlight.mode === mode) {
        return state;
      }
      return {
        ...state,
        statisticsHighlight: { ...state.statisticsHighlight, mode },
      };
    });
  },
  clearStatisticsHighlight: () => {
    set((state) =>
      state.statisticsHighlight
        ? { ...state, statisticsHighlight: null }
        : state,
    );
  },
  setShowPostUpdateNotice: (value: boolean) => {
    set((state) =>
      state.showPostUpdateNotice === value
        ? state
        : { ...state, showPostUpdateNotice: value },
    );
  },
  acknowledgePostUpdateNotice: () => {
    set((state) =>
      state.showPostUpdateNotice
        ? { ...state, showPostUpdateNotice: false }
        : state,
    );
  },
  setLatestChangelogEntry: (entry: LatestChangelogEntry | null) => {
    set((state) =>
      state.latestChangelogEntry === entry
        ? state
        : { ...state, latestChangelogEntry: entry },
    );
  },
  setCurrentAppVersion: (version: string) => {
    set((state) =>
      state.currentAppVersion === version
        ? state
        : { ...state, currentAppVersion: version },
    );
  },
}));

export function useAlgorithmStore<T>(
  selector: (state: AlgorithmStoreSlice) => T,
  equalityFn?: (left: T, right: T) => boolean,
) {
  return useStoreWithEqualityFn(algorithmStore, selector, equalityFn);
}

export function resetAlgorithmStore(overrides?: Partial<AlgorithmStoreSlice>) {
  algorithmStore.setState({
    ...algorithmStore.getState(),
    step: overrides?.step ?? 1,
    mixSettings: overrides?.mixSettings ?? loadMixSettings(),
    seatingHistory: overrides?.seatingHistory ?? [],
    mixHistory: overrides?.mixHistory ?? [],
    planName: overrides?.planName ?? '',
    planNameError: overrides?.planNameError ?? false,
    lastStatistics: overrides?.lastStatistics ?? null,
    showStatisticsBadge:
      overrides?.showStatisticsBadge ?? readStatisticsBadge(),
    statisticsHighlight: overrides?.statisticsHighlight ?? null,
    showPostUpdateNotice: overrides?.showPostUpdateNotice ?? false,
    latestChangelogEntry:
      overrides?.latestChangelogEntry ?? getLatestChangelogEntry(),
    currentAppVersion: overrides?.currentAppVersion ?? getAppVersion() ?? '',
  });
}
