// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import type { SavedPlan } from '@/types';
import { resolvePlanSlot, upsertPlan } from '../planNormalization';
import { createMockClassroomScene } from '@/__tests__/utils';

const createPlan = (overrides: Partial<SavedPlan> = {}): SavedPlan => ({
  id: 'plan-1',
  name: 'Plan A',
  date: '31.7.2026',
  seating: [],
  scene: createMockClassroomScene(),
  ...overrides,
});

describe('resolvePlanSlot', () => {
  it('appends a new plan when nothing matches', () => {
    const slot = resolvePlanSlot({
      history: [],
      activePlanId: null,
      name: 'Plan A',
      autoSave: false,
    });

    expect(slot).not.toBeNull();
    expect(slot?.planId).toEqual(expect.any(String));
  });

  it('updates the active plan when the name is unchanged', () => {
    const existing = createPlan();

    const slot = resolvePlanSlot({
      history: [existing],
      activePlanId: existing.id,
      name: 'Plan A',
      autoSave: false,
    });

    expect(slot).toEqual({ planId: existing.id });
  });

  it('rejects a name that another plan already uses', () => {
    const other = createPlan({ id: 'plan-2', name: 'Plan B' });

    const slot = resolvePlanSlot({
      history: [createPlan(), other],
      activePlanId: 'plan-1',
      name: 'Plan B',
      autoSave: false,
    });

    expect(slot).toBeNull();
  });

  it('recycles the existing auto-save slot instead of appending', () => {
    const autoSaved = createPlan({
      id: 'auto-1',
      name: 'Plan 30.7.2026, 10:00:00',
      autoSaved: true,
    });

    const slot = resolvePlanSlot({
      history: [createPlan({ id: 'named-1', name: 'Meine 5b' }), autoSaved],
      activePlanId: null,
      name: 'Plan 31.7.2026, 18:00:00',
      autoSave: true,
    });

    expect(slot).toEqual({ planId: 'auto-1' });
  });

  it('leaves auto-saved entries alone on an explicit save', () => {
    const autoSaved = createPlan({
      id: 'auto-1',
      name: 'Plan 30.7.2026, 10:00:00',
      autoSaved: true,
    });

    const slot = resolvePlanSlot({
      history: [autoSaved],
      activePlanId: null,
      name: 'Meine 5b',
      autoSave: false,
    });

    expect(slot?.planId).not.toBe('auto-1');
  });

  it('does not treat the recycled auto-save as a name collision', () => {
    const autoSaved = createPlan({
      id: 'auto-1',
      name: 'Plan 31.7.2026, 18:00:00',
      autoSaved: true,
    });

    const slot = resolvePlanSlot({
      history: [autoSaved],
      activePlanId: null,
      name: 'Plan 31.7.2026, 18:00:00',
      autoSave: true,
    });

    expect(slot).toEqual({ planId: 'auto-1' });
  });
});

describe('upsertPlan', () => {
  it('appends unknown plans', () => {
    const plan = createPlan();
    expect(upsertPlan([], plan)).toEqual([plan]);
  });

  it('replaces a plan with the same id in place', () => {
    const first = createPlan({ id: 'a', name: 'A' });
    const second = createPlan({ id: 'b', name: 'B' });
    const updated = createPlan({ id: 'a', name: 'A updated' });

    // Position is preserved — the list must not reorder on every save.
    expect(upsertPlan([first, second], updated)).toEqual([updated, second]);
  });
});
