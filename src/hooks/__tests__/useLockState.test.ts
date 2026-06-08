import { renderHook, act } from '@testing-library/react';
import { expect, test } from 'vitest';
import { useLockState } from '../state/useLockState';
import type { Student, SeatingArrangement } from '../../types';

const makeStudent = (): Student => ({
  id: 's1',
  name: 'A',
  gender: 'boy',
  restless: false,
  shy: false,
  concentrationIssues: false,
  needsFrontSeat: false,
  wishPartnerId: null,
});

test('toggleLock manages lock state', () => {
  const seating: SeatingArrangement = [[makeStudent()]];
  const { result } = renderHook(() => useLockState(seating));

  act(() => {
    result.current.toggleLock('s1', 0, 0);
  });
  expect(result.current.isSeatLocked(0, 0)).toBe(true);

  act(() => {
    result.current.removeLock('s1');
  });
  expect(result.current.isSeatLocked(0, 0)).toBe(false);
});
