// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { vi } from 'vitest';

/**
 * Create a complete localStorage mock
 */
const createMockLocalStorage = () => {
  const store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
    length: 0,
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
};

/**
 * Setup localStorage mock for tests
 */
export const setupLocalStorageMock = () => {
  const mockLocalStorage = createMockLocalStorage();
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });
  return mockLocalStorage;
};
