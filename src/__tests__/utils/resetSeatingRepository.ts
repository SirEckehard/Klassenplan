// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { cleanup, renderHook } from '@testing-library/react';
import { useSeatingRepository } from '@/hooks/useSeatingRepository';

/**
 * Empties storage and lets the repository forget the class it has open before
 * a test that runs the real hooks. The repository is a module singleton
 * (`useSeatingRepository`), so clearing the in-memory store alone leaves it
 * holding the last test's open class.
 */
export async function resetSeatingRepository(): Promise<void> {
  const { result, unmount } = renderHook(() => useSeatingRepository());
  await result.current.clearAll();
  unmount();
}

/**
 * Takes down what a test rendered and waits for the write its persist queue
 * still had scheduled — an idle task, which outlives the unmount. Call it
 * before `vi.unstubAllGlobals()`: without the `indexedDB` stub that write
 * fails and logs while Vitest closes the file, which ends the whole run with
 * exit code 1 though every test passed.
 */
export async function unmountAndSettle(): Promise<void> {
  cleanup();
  await new Promise((resolve) => setTimeout(resolve, 250));
}
