// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CircleLayout } from '@/types/Circle';
import {
  createMockClassroomScene,
  createMockSavedPlan,
} from '@/__tests__/utils';
import { usePlanPersistenceHandlers } from '../usePlanPersistenceHandlers';

const setup = () => {
  const params = {
    hasPlan: true,
    circleLayout: null,
    saveSeatingPlan: vi.fn(() => true),
    loadSeatingPlan: vi.fn(),
    setPlanName: vi.fn(),
    setPlanNameError: vi.fn(),
    updateClassroomScene: vi.fn(),
    setCircleLayout: vi.fn(),
    setStep: vi.fn(),
    step: 3,
    setCurrentSeating: vi.fn(),
    setMixSettings: vi.fn(),
    markClassroomSynced: vi.fn(),
    syncSeatingSnapshot: vi.fn(),
    recordSeatingSnapshot: vi.fn(),
  };
  const { result } = renderHook(() => usePlanPersistenceHandlers(params));
  return { params, result };
};

describe('usePlanPersistenceHandlers.handleHistoryLoad', () => {
  it('takes the circle on screen away when the plan has none', () => {
    const { params, result } = setup();
    const plan = createMockSavedPlan({ scene: createMockClassroomScene(2) });
    delete plan.circleLayout;

    result.current.handleHistoryLoad(plan);

    expect(params.setCircleLayout).toHaveBeenCalledWith(null);
    expect(params.syncSeatingSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ circleLayout: null }),
    );
  });

  it("puts the plan's own circle on screen", () => {
    const { params, result } = setup();
    const circleLayout = { students: [] } as unknown as CircleLayout;
    const plan = createMockSavedPlan({
      scene: createMockClassroomScene(2),
      circleLayout,
    });

    result.current.handleHistoryLoad(plan);

    expect(params.setCircleLayout).toHaveBeenCalledWith(circleLayout);
  });
});
