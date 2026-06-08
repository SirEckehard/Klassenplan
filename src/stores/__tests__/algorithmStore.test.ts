import { describe, it, expect, beforeEach, vi } from 'vitest';
import { algorithmStore, resetAlgorithmStore } from '../algorithmStore';
import { neutralSettings, MIX_HISTORY_LIMIT } from '@/utils';
import { LOCAL_STORAGE_KEYS } from '@/utils/data/storageKeys';
import type { MixResult, StatisticHighlightState } from '@/types';
import { setupLocalStorageMock } from '@/__tests__/utils/mockHandlers';

const makeMixResult = (id: number): MixResult =>
  ({
    id,
    timestamp: id,
    label: `mix-${id}`,
    seating: [],
    students: [],
    settings: neutralSettings,
  }) as unknown as MixResult;

describe('algorithmStore', () => {
  beforeEach(() => {
    setupLocalStorageMock();
    resetAlgorithmStore();
  });

  describe('setStep', () => {
    it('updates the current step on a new value (happy path)', () => {
      algorithmStore.getState().setStep(3);
      expect(algorithmStore.getState().step).toBe(3);
    });

    it('returns the same state reference when value is unchanged (idempotent)', () => {
      algorithmStore.getState().setStep(2);
      const before = algorithmStore.getState();
      algorithmStore.getState().setStep(2);
      const after = algorithmStore.getState();
      expect(after).toBe(before);
    });
  });

  describe('setMixSettings', () => {
    it('persists normalized settings to localStorage on change', () => {
      const setItemSpy = vi.spyOn(window.localStorage, 'setItem');

      algorithmStore.getState().setMixSettings({
        ...neutralSettings,
        preferGenderMix: 7,
      });

      const persisted = setItemSpy.mock.calls.find(
        ([key]) => key === LOCAL_STORAGE_KEYS.mixSettings,
      );
      expect(persisted).toBeDefined();
      expect(JSON.parse(persisted![1] as string).preferGenderMix).toBe(7);
    });

    it('falls back to defaults when localStorage holds invalid JSON (failure path)', () => {
      // Corrupt the persisted JSON; resetAlgorithmStore re-runs loadMixSettings,
      // which must catch the parse error and return defaults instead of throwing.
      window.localStorage.setItem(
        LOCAL_STORAGE_KEYS.mixSettings,
        '{not valid json',
      );

      expect(() => resetAlgorithmStore()).not.toThrow();
      expect(algorithmStore.getState().mixSettings).toBeDefined();
      // Default mixSettings carry sane numeric weights — check one to confirm shape.
      expect(
        typeof algorithmStore.getState().mixSettings.avoidPreviousPairs,
      ).toBe('number');
    });
  });

  describe('addMixResult', () => {
    it('appends a new result to history (happy path)', () => {
      algorithmStore.getState().addMixResult(makeMixResult(1));
      algorithmStore.getState().addMixResult(makeMixResult(2));

      expect(algorithmStore.getState().mixHistory).toHaveLength(2);
      expect(algorithmStore.getState().mixHistory.map((r) => r.id)).toEqual([
        1, 2,
      ]);
    });

    it('trims history to MIX_HISTORY_LIMIT when oversized (edge case)', () => {
      for (let i = 0; i < MIX_HISTORY_LIMIT + 5; i++) {
        algorithmStore.getState().addMixResult(makeMixResult(i));
      }

      const history = algorithmStore.getState().mixHistory;
      expect(history).toHaveLength(MIX_HISTORY_LIMIT);
      // Oldest retained is the (added - LIMIT)th = 5
      expect(history[0]!.id).toBe(5);
      expect(history[history.length - 1]!.id).toBe(MIX_HISTORY_LIMIT + 4);
    });
  });

  describe('deleteMixResult', () => {
    it('removes a result by id', () => {
      algorithmStore.getState().addMixResult(makeMixResult(1));
      algorithmStore.getState().addMixResult(makeMixResult(2));
      algorithmStore.getState().addMixResult(makeMixResult(3));

      algorithmStore.getState().deleteMixResult(2);

      expect(algorithmStore.getState().mixHistory.map((r) => r.id)).toEqual([
        1, 3,
      ]);
    });

    it('is a no-op when id is not present (does not throw)', () => {
      algorithmStore.getState().addMixResult(makeMixResult(1));
      const before = algorithmStore.getState().mixHistory;

      algorithmStore.getState().deleteMixResult(999);

      const after = algorithmStore.getState().mixHistory;
      expect(after).toHaveLength(before.length);
      expect(after[0]!.id).toBe(1);
    });
  });

  describe('setShowStatisticsBadge', () => {
    it('persists boolean to localStorage on change', () => {
      const setItemSpy = vi.spyOn(window.localStorage, 'setItem');

      algorithmStore.getState().setShowStatisticsBadge(true);

      expect(algorithmStore.getState().showStatisticsBadge).toBe(true);
      expect(setItemSpy).toHaveBeenCalledWith(
        'spg.showStatisticsBadge',
        'true',
      );
    });

    it('survives localStorage.setItem throwing (failure path)', () => {
      vi.spyOn(window.localStorage, 'setItem').mockImplementationOnce(() => {
        throw new Error('quota exceeded');
      });

      expect(() =>
        algorithmStore.getState().setShowStatisticsBadge(true),
      ).not.toThrow();
      expect(algorithmStore.getState().showStatisticsBadge).toBe(true);
    });
  });

  describe('setStatisticsHighlight & setStatisticsHighlightMode', () => {
    const baseHighlight: StatisticHighlightState = {
      key: 'preferGenderMix',
      mode: 'hover',
      entries: [],
    };

    it('sets a highlight then changes the mode (happy path)', () => {
      algorithmStore.getState().setStatisticsHighlight(baseHighlight);
      expect(algorithmStore.getState().statisticsHighlight?.key).toBe(
        'preferGenderMix',
      );

      algorithmStore.getState().setStatisticsHighlightMode('persistent');
      expect(algorithmStore.getState().statisticsHighlight?.mode).toBe(
        'persistent',
      );
    });

    it('does nothing when changing mode while no highlight is active (no-op edge)', () => {
      const before = algorithmStore.getState();
      algorithmStore.getState().setStatisticsHighlightMode('persistent');
      expect(algorithmStore.getState()).toBe(before);
    });

    it('clears the highlight via clearStatisticsHighlight', () => {
      algorithmStore.getState().setStatisticsHighlight(baseHighlight);
      expect(algorithmStore.getState().statisticsHighlight).not.toBeNull();

      algorithmStore.getState().clearStatisticsHighlight();
      expect(algorithmStore.getState().statisticsHighlight).toBeNull();
    });
  });

  describe('acknowledgePostUpdateNotice', () => {
    it('clears the flag when set (happy path)', () => {
      algorithmStore.getState().setShowPostUpdateNotice(true);
      algorithmStore.getState().acknowledgePostUpdateNotice();
      expect(algorithmStore.getState().showPostUpdateNotice).toBe(false);
    });

    it('is a no-op when flag is already false', () => {
      const before = algorithmStore.getState();
      algorithmStore.getState().acknowledgePostUpdateNotice();
      expect(algorithmStore.getState()).toBe(before);
    });
  });

  describe('resetAlgorithmStore', () => {
    it('restores defaults', () => {
      algorithmStore.getState().setStep(5);
      algorithmStore.getState().setPlanName('Eine Klasse');
      algorithmStore.getState().addMixResult(makeMixResult(1));

      resetAlgorithmStore();

      expect(algorithmStore.getState().step).toBe(1);
      expect(algorithmStore.getState().planName).toBe('');
      expect(algorithmStore.getState().mixHistory).toEqual([]);
    });
  });
});
