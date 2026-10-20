// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// The status bar greets on 5 October (an easter egg); a run on that day must
// not lose its status line. The hook's own test takes the real one.
// (Untyped original: the editor checks this file outside tsconfig.json, which
// excludes it, and does not resolve the `@/` alias in a type there.)
vi.mock('@/hooks/ui/useTeachersDayGreeting', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTeachersDayGreeting: () => ({ visible: false, fading: false }),
}));
