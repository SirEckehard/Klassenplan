import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useContextMenuIntegration } from '../useContextMenuIntegration';

// Add vitest-dom matchers
import '@testing-library/jest-dom/vitest';

// Mock the SeatingPlanContextMenus hook
vi.mock('@/components/SeatingPlanGenerator/SeatingPlanContextMenus', () => ({
  useSeatingPlanContextMenus: vi.fn(() => ({
    registerTableContextMenuSetter: vi.fn(),
    registerCanvasContextMenuSetter: vi.fn(),
    closeTableContextMenu: vi.fn(),
    closeCanvasContextMenu: vi.fn(),
    openTableContextMenu: vi.fn(),
    openCanvasContextMenu: vi.fn(),
  })),
}));

describe('useContextMenuIntegration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns correct interface functions', () => {
    const { result } = renderHook(() => useContextMenuIntegration());

    expect(result.current).toHaveProperty('registerTableContextMenuSetter');
    expect(result.current).toHaveProperty('registerCanvasContextMenuSetter');
    expect(result.current).toHaveProperty('closeTableContextMenu');
    expect(result.current).toHaveProperty('closeCanvasContextMenu');
    expect(result.current).toHaveProperty('openTableContextMenu');
    expect(result.current).toHaveProperty('openCanvasContextMenu');

    expect(typeof result.current.registerTableContextMenuSetter).toBe(
      'function',
    );
    expect(typeof result.current.registerCanvasContextMenuSetter).toBe(
      'function',
    );
    expect(typeof result.current.closeTableContextMenu).toBe('function');
    expect(typeof result.current.closeCanvasContextMenu).toBe('function');
    expect(typeof result.current.openTableContextMenu).toBe('function');
    expect(typeof result.current.openCanvasContextMenu).toBe('function');
  });

  it('returns functions from underlying hook', () => {
    const { result } = renderHook(() => useContextMenuIntegration());

    // The hook should return functions (we can't test stability since they're mocked)
    expect(typeof result.current.registerTableContextMenuSetter).toBe(
      'function',
    );
    expect(typeof result.current.registerCanvasContextMenuSetter).toBe(
      'function',
    );
    expect(typeof result.current.closeTableContextMenu).toBe('function');
    expect(typeof result.current.closeCanvasContextMenu).toBe('function');
    expect(typeof result.current.openTableContextMenu).toBe('function');
    expect(typeof result.current.openCanvasContextMenu).toBe('function');
  });
});
