import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useStudentRowState } from '../useStudentRowState';

describe('useStudentRowState', () => {
  it('initializes with default values', () => {
    const { result } = renderHook(() => useStudentRowState());

    // Name editing state
    expect(result.current.isEditing).toBe(false);
    expect(result.current.draftName).toBe('');

    // Dropdown visibility state
    expect(result.current.showPartnerDropdown).toBe(false);
    expect(result.current.showAvoidDropdown).toBe(false);
    expect(result.current.showGenderDropdown).toBe(false);

    // Refs should be defined
    expect(result.current.dropdownRef.current).toBeNull();
    expect(result.current.avoidDropdownRef.current).toBeNull();
    expect(result.current.genderDropdownRef.current).toBeNull();
  });

  it('updates name editing state correctly', () => {
    const { result } = renderHook(() => useStudentRowState());

    act(() => {
      result.current.setIsEditing(true);
      result.current.setDraftName('Alice');
    });

    expect(result.current.isEditing).toBe(true);
    expect(result.current.draftName).toBe('Alice');
  });

  it('toggles partner dropdown independently', () => {
    const { result } = renderHook(() => useStudentRowState());

    act(() => {
      result.current.setShowPartnerDropdown(true);
    });

    expect(result.current.showPartnerDropdown).toBe(true);
    expect(result.current.showAvoidDropdown).toBe(false);
    expect(result.current.showGenderDropdown).toBe(false);
  });

  it('toggles avoid dropdown independently', () => {
    const { result } = renderHook(() => useStudentRowState());

    act(() => {
      result.current.setShowAvoidDropdown(true);
    });

    expect(result.current.showPartnerDropdown).toBe(false);
    expect(result.current.showAvoidDropdown).toBe(true);
    expect(result.current.showGenderDropdown).toBe(false);
  });

  it('toggles gender dropdown independently', () => {
    const { result } = renderHook(() => useStudentRowState());

    act(() => {
      result.current.setShowGenderDropdown(true);
    });

    expect(result.current.showPartnerDropdown).toBe(false);
    expect(result.current.showAvoidDropdown).toBe(false);
    expect(result.current.showGenderDropdown).toBe(true);
  });

  it('maintains stable ref objects', () => {
    const { result, rerender } = renderHook(() => useStudentRowState());

    const initialDropdownRef = result.current.dropdownRef;
    const initialAvoidRef = result.current.avoidDropdownRef;
    const initialGenderRef = result.current.genderDropdownRef;

    // Trigger a re-render by updating state
    act(() => {
      result.current.setIsEditing(true);
    });

    rerender();

    // Refs should remain the same object
    expect(result.current.dropdownRef).toBe(initialDropdownRef);
    expect(result.current.avoidDropdownRef).toBe(initialAvoidRef);
    expect(result.current.genderDropdownRef).toBe(initialGenderRef);
  });

  it('resets name editing state', () => {
    const { result } = renderHook(() => useStudentRowState());

    act(() => {
      result.current.setIsEditing(true);
      result.current.setDraftName('Alice');
    });

    act(() => {
      result.current.setIsEditing(false);
      result.current.setDraftName('');
    });

    expect(result.current.isEditing).toBe(false);
    expect(result.current.draftName).toBe('');
  });
});
