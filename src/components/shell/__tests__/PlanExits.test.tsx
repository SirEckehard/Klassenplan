// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import '@/i18n';
import PlanExits from '@/components/shell/PlanExits';
import { getButton } from '@/__tests__/utils';

const mocks = vi.hoisted(() => ({
  exits: {
    exportPlan: vi.fn(),
    presentPlan: vi.fn(),
    canExit: false,
  },
}));

// The exits save and navigate; what they do is `usePlanExits`' business, how
// they look and when they hold back is this component's.
vi.mock('@/hooks/plan/usePlanExits', () => ({
  usePlanExits: () => mocks.exits,
}));

beforeEach(() => {
  mocks.exits.canExit = false;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PlanExits', () => {
  it('offers exporting and presenting as two quiet buttons', async () => {
    mocks.exits.canExit = true;
    render(<PlanExits />);

    const exportButton = getButton(/^(Exportieren|Export)$/i);
    const presentButton = getButton(/^(Präsentieren|Present)$/i);
    // Blue is the layer's own action in the status bar; the exits are never it.
    expect(exportButton).toHaveClass('secondary-button');
    expect(presentButton.className).toBe(exportButton.className);

    await userEvent.click(exportButton);
    await userEvent.click(presentButton);
    expect(mocks.exits.exportPlan).toHaveBeenCalledTimes(1);
    expect(mocks.exits.presentPlan).toHaveBeenCalledTimes(1);
  });

  it('keeps the exits clickable without a plan but does not leave', async () => {
    render(<PlanExits />);

    const presentButton = getButton(/^(Präsentieren|Present)$/i);
    expect(presentButton).toHaveAttribute('aria-disabled', 'true');

    await userEvent.click(presentButton);
    expect(mocks.exits.presentPlan).not.toHaveBeenCalled();
  });
});
