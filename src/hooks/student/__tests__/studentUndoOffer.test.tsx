// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Student } from '@/types';
import { createMockStudent } from '@/__tests__/utils';
import '@/i18n';
import * as toast from '@/utils/ui/toast';
import {
  offerStudentUndo,
  useStudentUndoOfferHost,
  withdrawStudentUndoOffer,
} from '../studentUndoOffer';

vi.mock('@/utils/ui/toast', () => ({
  showToast: vi.fn(() => 'student-undo-offer'),
  dismissToast: vi.fn(),
}));

const afterDeletion: Student[] = [createMockStudent({ id: 'a' })];

function host() {
  const undo = vi.fn();
  const view = renderHook(
    ({ students }: { students: Student[] }) =>
      useStudentUndoOfferHost(students, () => afterDeletion, undo),
    { initialProps: { students: afterDeletion } },
  );
  return { undo, ...view };
}

const offered = () => vi.mocked(toast.showToast).mock.lastCall?.[2];

beforeEach(() => {
  withdrawStudentUndoOffer();
  vi.clearAllMocks();
});

describe('studentUndoOffer', () => {
  it('offers the undo on a card, for eight seconds', () => {
    const { undo } = host();
    offerStudentUndo('Ida Nowak deleted');

    expect(toast.showToast).toHaveBeenCalledWith(
      'info',
      'Ida Nowak deleted',
      expect.objectContaining({ duration: 8000 }),
    );
    offered()?.action?.onClick();
    expect(undo).toHaveBeenCalledTimes(1);
  });

  it('stays while the list is as the deletion left it', () => {
    const { rerender } = host();
    offerStudentUndo('Ida Nowak deleted');
    rerender({ students: afterDeletion });
    expect(toast.dismissToast).not.toHaveBeenCalled();
  });

  // The undo takes back the latest step, which would no longer be this one.
  it('goes when the list changes again, or another class opens', () => {
    const { rerender } = host();
    offerStudentUndo('Ida Nowak deleted');
    rerender({ students: [...afterDeletion] });
    expect(toast.dismissToast).toHaveBeenCalledTimes(1);
  });

  it('goes when asked, once', () => {
    host();
    offerStudentUndo('Ida Nowak deleted');
    withdrawStudentUndoOffer();
    withdrawStudentUndoOffer();
    expect(toast.dismissToast).toHaveBeenCalledTimes(1);
  });

  it('offers no undo where no class list is connected', () => {
    offerStudentUndo('Ida Nowak deleted');
    expect(offered()).toBeUndefined();
  });
});
