import { useCallback, useEffect, useMemo } from 'react';
import { getAppVersion, getLatestChangelogEntry, logInfo } from '@/utils';
import { LOCAL_STORAGE_KEYS } from '@/utils/data/storageKeys';
import usePersistentState from '../usePersistentState';
import { useAlgorithmStore } from '@/stores/algorithmStore';
import { shallow } from 'zustand/shallow';

export function usePostUpdateNotice() {
  const computedAppVersion = useMemo(() => getAppVersion() ?? '', []);
  const computedChangelogEntry = useMemo(() => getLatestChangelogEntry(), []);
  const [
    currentAppVersion,
    latestChangelogEntry,
    showPostUpdateNotice,
    setCurrentAppVersion,
    setLatestChangelogEntry,
    setShowPostUpdateNotice,
    acknowledgeFromStore,
  ] = useAlgorithmStore(
    (state) => [
      state.currentAppVersion,
      state.latestChangelogEntry,
      state.showPostUpdateNotice,
      state.setCurrentAppVersion,
      state.setLatestChangelogEntry,
      state.setShowPostUpdateNotice,
      state.acknowledgePostUpdateNotice,
    ],
    shallow,
  );
  const [lastSeenVersion, setLastSeenVersion] = usePersistentState<string>(
    LOCAL_STORAGE_KEYS.lastSeenVersion,
    '',
  );

  useEffect(() => {
    if (currentAppVersion !== computedAppVersion) {
      setCurrentAppVersion(computedAppVersion);
    }
  }, [computedAppVersion, currentAppVersion, setCurrentAppVersion]);

  useEffect(() => {
    if (latestChangelogEntry !== computedChangelogEntry) {
      setLatestChangelogEntry(computedChangelogEntry);
    }
  }, [computedChangelogEntry, latestChangelogEntry, setLatestChangelogEntry]);

  useEffect(() => {
    if (!computedAppVersion) {
      return;
    }

    if (!lastSeenVersion) {
      setLastSeenVersion(computedAppVersion);
      return;
    }

    if (lastSeenVersion !== computedAppVersion) {
      setShowPostUpdateNotice(true);
    }
  }, [
    computedAppVersion,
    lastSeenVersion,
    setLastSeenVersion,
    setShowPostUpdateNotice,
  ]);

  useEffect(() => {
    if (showPostUpdateNotice) {
      logInfo(
        'Post update notice displayed',
        { version: currentAppVersion },
        'useSeatingGenerator',
      );
    }
  }, [showPostUpdateNotice, currentAppVersion]);

  const acknowledgePostUpdateNotice = useCallback(() => {
    logInfo(
      'Post update notice acknowledged',
      { version: currentAppVersion },
      'useSeatingGenerator',
    );
    setLastSeenVersion(currentAppVersion);
    acknowledgeFromStore();
  }, [acknowledgeFromStore, currentAppVersion, setLastSeenVersion]);

  return {
    currentAppVersion,
    latestChangelogEntry,
    showPostUpdateNotice,
    acknowledgePostUpdateNotice,
  } as const;
}
