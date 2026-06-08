import { createStore } from 'zustand/vanilla';
import { useStoreWithEqualityFn } from 'zustand/traditional';
import deepEqual from 'fast-deep-equal';
import {
  DEFAULT_CLASSROOM_SCENE,
  getBrowserLocalStorage,
  getBrowserWindow,
  logDebug,
} from '@/utils';
import { countSeats } from '@/utils/math/scene';
import { LOCAL_STORAGE_KEYS } from '@/utils/data/storageKeys';
import type {
  LayoutStore,
  LayoutStoreSlice,
  LayoutStoreState,
  StateUpdater,
} from './featureStores';
import { createFeatureStoreLogger } from './featureStores';
import { evaluateStateUpdater } from './storeUtils';
import type { CircleLayout, CircleGenerationStatus } from '@/types/Circle';

export const createLayoutStore = (
  initialState?: Partial<LayoutStoreState>,
): LayoutStore => {
  const logger = createFeatureStoreLogger('layoutStore');
  const initialScene = initialState?.classroomScene ?? DEFAULT_CLASSROOM_SCENE;
  const initialSeatingMode = initialState?.seatingMode ?? readSeatingMode();
  const baseState: LayoutStoreState = {
    classroomScene: initialScene,
    seatCount: countSeats(initialScene),
    classroomEdited: initialState?.classroomEdited ?? false,
    seatingMode: initialSeatingMode,
    circleLayout: initialState?.circleLayout ?? null,
    circleGenerationInProgress:
      initialState?.circleGenerationInProgress ?? false,
    circleGenerationStatus: initialState?.circleGenerationStatus ?? null,
  };

  return createStore<LayoutStoreSlice>()((set, get) => ({
    ...baseState,
    setClassroomScene: (next) => {
      const current = get().classroomScene;
      const updated = evaluateStateUpdater(current, next);
      if (deepEqual(updated, current)) {
        return;
      }
      set((state) => ({
        ...state,
        classroomScene: updated,
        seatCount: countSeats(updated),
        classroomEdited: true,
      }));
      logger.debug('Classroom scene updated');
    },
    resetClassroomScene: () => {
      set({
        classroomScene: DEFAULT_CLASSROOM_SCENE,
        seatCount: countSeats(DEFAULT_CLASSROOM_SCENE),
        classroomEdited: false,
      });
      logger.debug('Classroom scene reset to default');
    },
    setClassroomEdited: (edited: boolean) => {
      if (get().classroomEdited === edited) {
        return;
      }
      set((state) => ({
        ...state,
        classroomEdited: edited,
      }));
      logger.debug('Classroom edited flag changed', { edited });
    },
    setSeatingMode: (mode: 'table' | 'circle') => {
      if (get().seatingMode === mode) {
        return;
      }
      set((state) => ({
        ...state,
        seatingMode: mode,
      }));
      persistSeatingMode(mode);
      logger.debug('Seating mode updated', { mode });
    },
    setCircleLayout: (next: StateUpdater<CircleLayout | null>) => {
      const current = get().circleLayout;
      const updated = evaluateStateUpdater(current, next);
      if (Object.is(updated, current) || deepEqual(updated, current)) {
        return;
      }
      set((state) => ({
        ...state,
        circleLayout: updated,
      }));
      logger.debug('Circle layout updated');
    },
    setCircleGenerationInProgress: (value: boolean) => {
      if (get().circleGenerationInProgress === value) {
        return;
      }
      set((state) => ({
        ...state,
        circleGenerationInProgress: value,
      }));
      logger.debug('Circle generation progress updated', { value });
    },
    setCircleGenerationStatus: (
      next: StateUpdater<CircleGenerationStatus | null>,
    ) => {
      const current = get().circleGenerationStatus;
      const updated = evaluateStateUpdater(current, next);
      if (Object.is(updated, current)) {
        return;
      }
      set((state) => ({
        ...state,
        circleGenerationStatus: updated,
      }));
      logger.debug('Circle generation status updated');
    },
  }));
};

export const layoutStore = createLayoutStore();

export function useLayoutStore<T>(
  selector: (state: LayoutStoreSlice) => T,
  equalityFn?: (left: T, right: T) => boolean,
) {
  return useStoreWithEqualityFn(layoutStore, selector, equalityFn);
}

export function resetLayoutStore(state?: Partial<LayoutStoreState>) {
  layoutStore.setState({
    ...layoutStore.getState(),
    classroomScene: state?.classroomScene ?? DEFAULT_CLASSROOM_SCENE,
    seatCount: countSeats(state?.classroomScene ?? DEFAULT_CLASSROOM_SCENE),
    classroomEdited: state?.classroomEdited ?? false,
    seatingMode: state?.seatingMode ?? readSeatingMode(),
    circleLayout: state?.circleLayout ?? null,
    circleGenerationInProgress: state?.circleGenerationInProgress ?? false,
    circleGenerationStatus: state?.circleGenerationStatus ?? null,
  });
}

function readSeatingMode(): 'table' | 'circle' {
  const storage = getBrowserLocalStorage();
  if (!storage) {
    return 'table';
  }
  try {
    const stored = storage.getItem(LOCAL_STORAGE_KEYS.seatingMode);
    return stored === 'circle' ? 'circle' : 'table';
  } catch (error) {
    logDebug('Failed to read seating mode from localStorage', { error });
    return 'table';
  }
}

function persistSeatingMode(mode: 'table' | 'circle') {
  const browserWindow = getBrowserWindow();
  if (!browserWindow) {
    return;
  }
  try {
    browserWindow.localStorage.setItem(LOCAL_STORAGE_KEYS.seatingMode, mode);
  } catch (error) {
    logDebug('Failed to persist seating mode to localStorage', { error });
  }
}
