// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { renderHook } from '@testing-library/react';
import { useSeatingRepository } from '@/hooks/useSeatingRepository';

/**
 * Empties storage and the repository's cached class collection before a test
 * that runs the real hooks. The repository is a module singleton
 * (`useSeatingRepository`), so clearing the in-memory store alone leaves the
 * last test's classes in its cache, and the next test opens them.
 */
export async function resetSeatingRepository(): Promise<void> {
  const { result, unmount } = renderHook(() => useSeatingRepository());
  await result.current.clearAll();
  unmount();
}
