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
    expect(presentButton).toHaveClass('secondary-button');
    // Presenting closes the bar, exporting comes before it.
    expect(exportButton.compareDocumentPosition(presentButton)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );

    await userEvent.click(exportButton);
    await userEvent.click(presentButton);
    expect(mocks.exits.exportPlan).toHaveBeenCalledTimes(1);
    expect(mocks.exits.presentPlan).toHaveBeenCalledTimes(1);
  });

  // A phone's bar has room for one exit: exporting stays, presenting moves to
  // the foot of the tool sheet.
  it('keeps exporting on a phone and leaves presenting to tablets and up', () => {
    render(<PlanExits />);

    const exportButton = getButton(/^(Exportieren|Export)$/i);
    const presentButton = getButton(/^(Präsentieren|Present)$/i);
    expect(exportButton).not.toHaveClass('hidden');
    expect(presentButton).toHaveClass('hidden', 'md:inline-flex');
  });

  // The words belong to a desktop and a whiteboard; the names stay on the
  // buttons at every width.
  it('shows the words only where a desktop or a whiteboard has room', () => {
    render(<PlanExits />);

    for (const name of [
      /^(Exportieren|Export)$/i,
      /^(Präsentieren|Present)$/i,
    ]) {
      const word = getButton(name).querySelector('span');
      expect(word).toHaveClass('hidden', 'lg:pointer-fine:inline', 'xl:inline');
    }
  });

  it('keeps the exits clickable without a plan but does not leave', async () => {
    render(<PlanExits />);

    const presentButton = getButton(/^(Präsentieren|Present)$/i);
    expect(presentButton).toHaveAttribute('aria-disabled', 'true');

    await userEvent.click(presentButton);
    expect(mocks.exits.presentPlan).not.toHaveBeenCalled();
  });
});
