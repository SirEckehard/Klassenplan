// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { MixSettings } from '@/types';
import { SCALAR_MIX_SETTING_KEYS, logDebug, logInfo } from '@/utils';

export type AutoMixTriggerEvent =
  | 'wizard-auto-mix'
  | 'manual-mix'
  | 'step-entered'
  | 'mix-settings-change'
  | 'ci-import';

interface BaseTriggerOptions {
  enabled?: boolean;
  requireIntelligentMix?: boolean;
  throttleMs?: number;
}

interface StepTriggerOptions extends BaseTriggerOptions {
  targetStep?: number;
}

type AutoMixTriggerConfig = {
  'wizard-auto-mix': BaseTriggerOptions;
  'manual-mix': BaseTriggerOptions;
  'step-entered': StepTriggerOptions;
  'mix-settings-change': BaseTriggerOptions;
  'ci-import': BaseTriggerOptions;
};

export type AutoMixTriggerOverrides = Partial<AutoMixTriggerConfig>;

export interface AutoMixTriggerPayload {
  source?: string;
  reason?: string;
  step?: number;
  fromStep?: number;
  toStep?: number;
  changedKeys?: string[];
}

export type AutoMixTriggerHandler = (
  event: AutoMixTriggerEvent,
  payload?: AutoMixTriggerPayload,
) => boolean;

interface UseAutoMixTriggersOptions {
  requestRefine: () => void;
  mixSettings: MixSettings;
  step: number;
  intelligentMix: boolean;
  enabled?: boolean;
  loggerContext?: string;
  triggers?: AutoMixTriggerOverrides;
}

const DEFAULT_TRIGGER_CONFIG: AutoMixTriggerConfig = {
  'wizard-auto-mix': { enabled: true, requireIntelligentMix: true },
  'manual-mix': { enabled: true, requireIntelligentMix: true },
  'step-entered': {
    enabled: false,
    requireIntelligentMix: true,
    targetStep: 3,
  },
  'mix-settings-change': {
    enabled: false,
    requireIntelligentMix: true,
    throttleMs: 1000,
  },
  'ci-import': { enabled: false, requireIntelligentMix: false },
};

export function useAutoMixTriggerController({
  requestRefine,
  mixSettings,
  step,
  intelligentMix,
  enabled = true,
  loggerContext = 'useAutoMixTriggers',
  triggers,
}: UseAutoMixTriggersOptions): AutoMixTriggerHandler {
  const mergedConfig = useMemo<AutoMixTriggerConfig>(
    () => ({
      'wizard-auto-mix': {
        ...DEFAULT_TRIGGER_CONFIG['wizard-auto-mix'],
        ...(triggers?.['wizard-auto-mix'] ?? {}),
      },
      'manual-mix': {
        ...DEFAULT_TRIGGER_CONFIG['manual-mix'],
        ...(triggers?.['manual-mix'] ?? {}),
      },
      'step-entered': {
        ...DEFAULT_TRIGGER_CONFIG['step-entered'],
        ...(triggers?.['step-entered'] ?? {}),
      },
      'mix-settings-change': {
        ...DEFAULT_TRIGGER_CONFIG['mix-settings-change'],
        ...(triggers?.['mix-settings-change'] ?? {}),
      },
      'ci-import': {
        ...DEFAULT_TRIGGER_CONFIG['ci-import'],
        ...(triggers?.['ci-import'] ?? {}),
      },
    }),
    [triggers],
  );

  const lastTriggerRef = useRef<Record<AutoMixTriggerEvent, number>>(
    {} as Record<AutoMixTriggerEvent, number>,
  );
  const previousStepRef = useRef(step);
  const previousMixSettingsRef = useRef(mixSettings);

  const trigger = useCallback<AutoMixTriggerHandler>(
    (event, payload) => {
      if (!enabled) {
        return false;
      }

      const options = mergedConfig[event];
      if (!options?.enabled) {
        logDebug(
          'Auto mix trigger skipped (disabled)',
          { event },
          loggerContext,
        );
        return false;
      }

      if (options.requireIntelligentMix !== false && !intelligentMix) {
        logDebug(
          'Auto mix trigger skipped (intelligent mix inactive)',
          { event },
          loggerContext,
        );
        return false;
      }

      const throttleMs = options.throttleMs ?? 0;
      if (throttleMs > 0) {
        const now = Date.now();
        const last = lastTriggerRef.current[event] ?? 0;
        if (now - last < throttleMs) {
          logDebug(
            'Auto mix trigger throttled',
            { event, remainingMs: throttleMs - (now - last) },
            loggerContext,
          );
          return false;
        }
        lastTriggerRef.current[event] = now;
      }

      logInfo(
        'Auto mix trigger scheduled refinement',
        { event, payload },
        loggerContext,
      );
      requestRefine();
      return true;
    },
    [enabled, intelligentMix, loggerContext, mergedConfig, requestRefine],
  );

  useEffect(() => {
    if (!enabled) {
      previousStepRef.current = step;
      return;
    }

    const options = mergedConfig['step-entered'];
    if (!options.enabled) {
      previousStepRef.current = step;
      return;
    }

    const fromStep = previousStepRef.current;
    if (
      fromStep !== step &&
      step ===
        (options.targetStep ??
          DEFAULT_TRIGGER_CONFIG['step-entered'].targetStep ??
          3)
    ) {
      trigger('step-entered', { fromStep, toStep: step });
    }
    previousStepRef.current = step;
  }, [enabled, mergedConfig, step, trigger]);

  useEffect(() => {
    if (!enabled) {
      previousMixSettingsRef.current = mixSettings;
      return;
    }

    const options = mergedConfig['mix-settings-change'];
    if (!options.enabled) {
      previousMixSettingsRef.current = mixSettings;
      return;
    }

    const previous = previousMixSettingsRef.current;
    const changedKeys = SCALAR_MIX_SETTING_KEYS.filter(
      (key) => previous?.[key] !== mixSettings[key],
    );
    if (changedKeys.length > 0) {
      trigger('mix-settings-change', { changedKeys });
    }
    previousMixSettingsRef.current = mixSettings;
  }, [enabled, mergedConfig, mixSettings, trigger]);

  return trigger;
}

export const useAutoMixTriggers = useAutoMixTriggerController;
