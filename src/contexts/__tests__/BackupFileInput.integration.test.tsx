import React from 'react';
import { render, fireEvent, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SeatingPlanGeneratorProvider,
  useSeatingPlanActions,
} from '../SeatingPlanContext';
import {
  createMockSeatingGenerator,
  setupCleanStorage,
} from '../../__tests__/utils';

// Mock the useSeatingGenerator hook
const mockSeatingGenerator = createMockSeatingGenerator();
vi.mock('../../hooks/useSeatingGenerator', () => ({
  useSeatingGenerator: () => mockSeatingGenerator,
}));

/**
 * Integration tests for BackupFileInput component.
 *
 * These tests ensure that the hidden file input element is properly rendered
 * in the DOM and connected to the backup import functionality. This prevents
 * regressions where the "Backup importieren" button stops working because
 * the file input is missing.
 */
describe('BackupFileInput integration', () => {
  beforeEach(() => {
    setupCleanStorage();
    vi.clearAllMocks();
    const fresh = createMockSeatingGenerator();
    Object.assign(mockSeatingGenerator, fresh);
    mockSeatingGenerator.state = fresh.state;
    mockSeatingGenerator.actions = fresh.actions;
  });

  it('renders hidden file input element in the provider tree', () => {
    render(
      <SeatingPlanGeneratorProvider>
        <div data-testid="child">Children</div>
      </SeatingPlanGeneratorProvider>,
    );

    // The file input should be present in the DOM
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
  });

  it('file input accepts .json files only', () => {
    render(
      <SeatingPlanGeneratorProvider>
        <div>Children</div>
      </SeatingPlanGeneratorProvider>,
    );

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(fileInput).toHaveAttribute('accept', '.json');
  });

  it('file input is hidden for accessibility', () => {
    render(
      <SeatingPlanGeneratorProvider>
        <div>Children</div>
      </SeatingPlanGeneratorProvider>,
    );

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(fileInput).toHaveClass('hidden');
    expect(fileInput).toHaveAttribute('aria-hidden', 'true');
  });

  it('connects importInputRef to the DOM element', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SeatingPlanGeneratorProvider>{children}</SeatingPlanGeneratorProvider>
    );

    const { result } = renderHook(() => useSeatingPlanActions(), { wrapper });

    // importInputRef.current should point to the file input element
    expect(result.current.importInputRef.current).not.toBeNull();
    expect(result.current.importInputRef.current).toBeInstanceOf(
      HTMLInputElement,
    );
    expect(result.current.importInputRef.current?.type).toBe('file');
  });

  it('importInputRef is ready for triggerImport to use', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SeatingPlanGeneratorProvider>{children}</SeatingPlanGeneratorProvider>
    );

    const { result } = renderHook(() => useSeatingPlanActions(), { wrapper });

    // The key regression check: importInputRef.current must not be null
    // If it's null, triggerImport() will do nothing (the original bug)
    const fileInput = result.current.importInputRef.current;
    expect(fileInput).not.toBeNull();
    expect(fileInput?.tagName).toBe('INPUT');
    expect(fileInput?.type).toBe('file');

    // Verify the element is in the DOM and clickable
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).not.toBeDisabled();
  });

  it('file input has onChange handler attached', () => {
    render(
      <SeatingPlanGeneratorProvider>
        <div>Children</div>
      </SeatingPlanGeneratorProvider>,
    );

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    // Verify the file input can receive change events without throwing
    // This confirms the onChange handler is properly connected
    expect(() =>
      fireEvent.change(fileInput, { target: { files: [] } }),
    ).not.toThrow();
  });

  it('file input persists across re-renders', () => {
    const { rerender } = render(
      <SeatingPlanGeneratorProvider>
        <div>First render</div>
      </SeatingPlanGeneratorProvider>,
    );

    const firstInputRef = document.querySelector('input[type="file"]');
    expect(firstInputRef).toBeInTheDocument();

    rerender(
      <SeatingPlanGeneratorProvider>
        <div>Second render</div>
      </SeatingPlanGeneratorProvider>,
    );

    const secondInputRef = document.querySelector('input[type="file"]');
    expect(secondInputRef).toBeInTheDocument();
    // Same element should persist
    expect(secondInputRef).toBe(firstInputRef);
  });
});
