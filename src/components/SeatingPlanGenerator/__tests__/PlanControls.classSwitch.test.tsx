// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The room and plan views keep their undo history in refs. Opening another
 * class must give them a fresh start, or an undo there writes the room and the
 * plan of the class left behind into the class now open.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockSeatingGenerator } from '@/__tests__/utils';
import PlanControls from '../PlanControls';

const { mounts, generator } = vi.hoisted(() => ({
  mounts: { count: 0 },
  generator: { current: null as unknown },
}));

vi.mock('@/contexts/SeatingPlanContext', () => ({
  useSeatingPlanState: () => (generator.current as { state: unknown }).state,
  useSeatingPlanActions: () =>
    (generator.current as { actions: unknown }).actions,
}));

vi.mock('@/components/SeatingPlanGenerator/EnhancedSeatingPlanView', () => ({
  default: function EnhancedSeatingPlanViewStub({ step }: { step: number }) {
    React.useEffect(() => {
      mounts.count += 1;
    }, []);
    return <div data-testid="layer-view">{step}</div>;
  },
}));

vi.mock('@/utils/performance/generatorPrefetch', () => ({
  prefetchGeneratorSteps: vi.fn(),
}));

const openClass = (id: string, step: number) => {
  const mock = createMockSeatingGenerator();
  generator.current = {
    ...mock,
    state: { ...mock.state, step, activeClass: { id, name: id } },
  };
};

describe('PlanControls across a class switch', () => {
  beforeEach(() => {
    mounts.count = 0;
  });

  it.each([2, 3])(
    'mounts the view of layer %i afresh for another class',
    async (step) => {
      openClass('class-a', step);
      const { rerender } = render(<PlanControls />);
      await screen.findByTestId('layer-view');
      expect(mounts.count).toBe(1);

      openClass('class-b', step);
      rerender(<PlanControls />);
      await screen.findByTestId('layer-view');

      expect(mounts.count).toBe(2);
    },
  );

  it('keeps the view mounted while the class stays', async () => {
    openClass('class-a', 2);
    const { rerender } = render(<PlanControls />);
    await screen.findByTestId('layer-view');

    openClass('class-a', 2);
    rerender(<PlanControls />);
    await screen.findByTestId('layer-view');

    expect(mounts.count).toBe(1);
  });
});
