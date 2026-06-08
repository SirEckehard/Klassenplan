import React from 'react';
import type {
  ClassroomScene,
  ClassroomTable,
  ClassroomFeature,
  SeatingArrangement,
} from '@/types';

export interface SceneManagerHook {
  sceneTables: ClassroomTable[];
  setSceneTables: React.Dispatch<React.SetStateAction<ClassroomTable[]>>;
  sceneFeatures: ClassroomFeature[];
  setSceneFeatures: React.Dispatch<React.SetStateAction<ClassroomFeature[]>>;
  commitScene: () => void;
  updateSceneTables: (
    updateFn: (tables: ClassroomTable[]) => ClassroomTable[],
  ) => void;
  runSceneTransaction: (
    mutator: (state: SceneTransactionState) => SceneTransactionResult | void,
    options?: SceneTransactionOptions,
  ) => SceneTransactionResult;
}

export interface SceneTransactionState {
  scene: ClassroomScene;
  tables: ClassroomTable[];
  features: ClassroomFeature[];
  seating: SeatingArrangement;
}

export interface SceneTransactionResult {
  scene?: ClassroomScene;
  tables?: ClassroomTable[];
  features?: ClassroomFeature[];
  seating?: SeatingArrangement;
}

export interface SceneTransactionOptions {
  skipSceneUpdate?: boolean;
  skipSeatingUpdate?: boolean;
}

export type SceneTransactionRunner = (
  mutator: (state: SceneTransactionState) => SceneTransactionResult | void,
  options?: SceneTransactionOptions,
) => SceneTransactionResult;

export interface UseSceneManagerParams {
  classroomScene: ClassroomScene;
  currentSeating: SeatingArrangement;
  updateClassroomScene: (next: React.SetStateAction<ClassroomScene>) => void;
  setCurrentSeating: React.Dispatch<React.SetStateAction<SeatingArrangement>>;
}

/**
 * Custom hook for managing scene tables state and synchronization
 * Provides centralized scene table management with commit functionality
 */
export function useSceneManager({
  classroomScene,
  currentSeating,
  updateClassroomScene,
  setCurrentSeating,
}: UseSceneManagerParams): SceneManagerHook {
  const [sceneTables, setSceneTables] = React.useState<ClassroomTable[]>(() => [
    ...(classroomScene.tables || []),
  ]);
  const [sceneFeatures, setSceneFeatures] = React.useState<ClassroomFeature[]>(
    () => [...(classroomScene.features || [])],
  );

  const sceneTablesRef = React.useRef<ClassroomTable[]>(sceneTables);
  const sceneFeaturesRef = React.useRef<ClassroomFeature[]>(sceneFeatures);
  const classroomSceneRef = React.useRef<ClassroomScene>(classroomScene);
  const seatingRef = React.useRef<SeatingArrangement>(currentSeating);

  React.useEffect(() => {
    sceneTablesRef.current = sceneTables;
  }, [sceneTables]);

  React.useEffect(() => {
    sceneFeaturesRef.current = sceneFeatures;
  }, [sceneFeatures]);

  React.useEffect(() => {
    seatingRef.current = currentSeating;
  }, [currentSeating]);

  /* eslint-disable react-hooks/set-state-in-effect -- refs and state must stay in sync; setState is the intended mechanism here */
  React.useEffect(() => {
    classroomSceneRef.current = classroomScene;
    const tables = [...(classroomScene.tables || [])];
    const features = [...(classroomScene.features || [])];
    sceneTablesRef.current = tables;
    sceneFeaturesRef.current = features;
    setSceneTables(tables);
    setSceneFeatures(features);
  }, [classroomScene]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const commitScene = React.useCallback(() => {
    const nextScene = {
      ...classroomSceneRef.current,
      tables: sceneTablesRef.current.map((table) => ({ ...table })),
      features: sceneFeaturesRef.current.map((feature) => ({ ...feature })),
    };
    classroomSceneRef.current = nextScene;
    updateClassroomScene(nextScene);
  }, [updateClassroomScene]);

  const updateSceneTables = React.useCallback(
    (updateFn: (tables: ClassroomTable[]) => ClassroomTable[]) => {
      setSceneTables((prev) => {
        const next = updateFn(prev);
        sceneTablesRef.current = next;
        return next;
      });
    },
    [],
  );

  const runSceneTransaction = React.useCallback(
    (
      mutator: (state: SceneTransactionState) => SceneTransactionResult | void,
      options?: SceneTransactionOptions,
    ) => {
      const baseState: SceneTransactionState = {
        scene: classroomSceneRef.current,
        tables: sceneTablesRef.current,
        features: sceneFeaturesRef.current,
        seating: seatingRef.current,
      };

      const result = mutator(baseState) ?? {};
      const nextTables = result.tables ?? baseState.tables;
      const nextFeatures = result.features ?? baseState.features;
      const nextSeating = result.seating ?? baseState.seating;
      const nextScene =
        result.scene ??
        ({
          ...baseState.scene,
          tables: nextTables,
          features: nextFeatures,
        } as ClassroomScene);

      const tablesForState = nextTables.map((table) => ({ ...table }));
      const featuresForState = nextFeatures.map((feature) => ({ ...feature }));
      const seatingForState = nextSeating.map((row) => [...row]);

      sceneTablesRef.current = tablesForState;
      setSceneTables(tablesForState);
      sceneFeaturesRef.current = featuresForState;
      setSceneFeatures(featuresForState);

      classroomSceneRef.current = nextScene;
      if (!options?.skipSceneUpdate) {
        updateClassroomScene(nextScene);
      }

      seatingRef.current = seatingForState;
      if (!options?.skipSeatingUpdate) {
        setCurrentSeating(seatingForState);
      }

      return {
        scene: nextScene,
        tables: tablesForState,
        features: featuresForState,
        seating: seatingForState,
      };
    },
    [setCurrentSeating, updateClassroomScene],
  );

  return {
    sceneTables,
    setSceneTables,
    sceneFeatures,
    setSceneFeatures,
    commitScene,
    updateSceneTables,
    runSceneTransaction,
  };
}
