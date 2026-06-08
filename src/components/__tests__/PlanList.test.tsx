// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import '@/i18n/i18n';
import type { ComponentProps } from 'react';
import { render, screen, within, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, afterEach } from 'vitest';
import PlanList from '../../components/SeatingPlanGenerator/PlanList';
import { ToastProvider } from '../../components/ui/feedback/ToastProvider';
import {
  createMockClassroomScene,
  createMockSavedPlan,
  createMockStudent,
  getButton,
  getDialog,
} from '../../__tests__/utils';
import { dismissAllToasts } from '../../utils/ui/toast';

const plan = createMockSavedPlan({
  name: 'Plan A',
  date: '2024-01-01',
  seating: [
    [createMockStudent(), null],
    [createMockStudent(), createMockStudent()],
  ],
  scene: createMockClassroomScene(2),
});

const renderPlanList = (
  overrides: Partial<ComponentProps<typeof PlanList>> = {},
) => {
  const props: ComponentProps<typeof PlanList> = {
    items: [plan],
    onLoad: vi.fn(),
    onDelete: vi.fn(),
    onRename: vi.fn().mockReturnValue(true),
    ...overrides,
  };

  const result = render(
    <ToastProvider>
      <PlanList {...props} />
    </ToastProvider>,
  );

  return {
    ...result,
    props,
  };
};

afterEach(() => {
  act(() => {
    dismissAllToasts();
  });
  cleanup();
});

describe('PlanList', () => {
  it('ruft Load- und Delete-Handler auf', async () => {
    const user = userEvent.setup();
    const onLoad = vi.fn();
    const onDelete = vi.fn();
    renderPlanList({ onLoad, onDelete });

    const loadButton = getButton(
      /Sitzplan Plan A laden|Load seating plan Plan A/i,
    );
    await user.click(loadButton);
    expect(onLoad).toHaveBeenCalledWith(plan);

    const deleteButton = getButton(
      /Sitzplan Plan A löschen|Delete seating plan Plan A/i,
    );
    await user.click(deleteButton);

    const dialog = getDialog(/Sitzplan löschen|Delete Seating Plan/i);
    const confirmButton = within(dialog).getByRole('button', {
      name: /Löschen|Delete/i,
    });
    await user.click(confirmButton);
    expect(onDelete).toHaveBeenCalledWith(plan);
  });

  it('verwendet onRename für Umbenennungen', async () => {
    const user = userEvent.setup();
    const onRename = vi.fn().mockReturnValue(true);
    renderPlanList({ onRename });

    const renameButton = getButton(/Namen bearbeiten|Edit name/i);
    await user.click(renameButton);

    const nameInput = screen.getByDisplayValue('Plan A');
    await user.clear(nameInput);
    await user.type(nameInput, 'Plan B{enter}');

    expect(onRename).toHaveBeenCalledWith(plan.id, 'Plan B');
  });
});
