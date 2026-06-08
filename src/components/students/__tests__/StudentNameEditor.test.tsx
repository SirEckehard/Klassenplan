// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import {
  render,
  screen,
  fireEvent,
  cleanup,
  act,
} from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@/i18n'; // Initialize i18n for tests
import StudentNameEditor from '../StudentNameEditor';
import type { Student } from '../../../types';
import { expectErrorToast } from '../../../__tests__/utils';
import { ToastProvider } from '../../ui/feedback/ToastProvider';
import { dismissAllToasts } from '../../../utils/ui/toast';

const baseStudent: Student = {
  id: '1',
  name: 'Alice',
  gender: 'girl',
  restless: false,
  shy: false,
  concentrationIssues: false,
  needsFrontSeat: false,
};

describe('StudentNameEditor', () => {
  const mockUpdateStudent = vi.fn();
  const mockSetIsEditing = vi.fn();
  const mockSetDraftName = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    act(() => {
      dismissAllToasts();
    });
    cleanup();
  });

  // Helper to render component with ToastProvider
  const renderWithToast = (
    props: React.ComponentProps<typeof StudentNameEditor>,
  ) => {
    return render(
      <ToastProvider>
        <StudentNameEditor {...props} />
      </ToastProvider>,
    );
  };

  it('renders student name in view mode', () => {
    renderWithToast({
      student: baseStudent,
      allStudents: [baseStudent],
      updateStudent: mockUpdateStudent,
      isEditing: false,
      setIsEditing: mockSetIsEditing,
      draftName: '',
      setDraftName: mockSetDraftName,
    });

    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('shows edit button in view mode', () => {
    renderWithToast({
      student: baseStudent,
      allStudents: [baseStudent],
      updateStudent: mockUpdateStudent,
      isEditing: false,
      setIsEditing: mockSetIsEditing,
      draftName: '',
      setDraftName: mockSetDraftName,
    });

    const editButton = screen.getByTitle(/Namen bearbeiten|Edit name/i);
    expect(editButton).toBeInTheDocument();
  });

  it('enters edit mode when edit button is clicked', () => {
    renderWithToast({
      student: baseStudent,
      allStudents: [baseStudent],
      updateStudent: mockUpdateStudent,
      isEditing: false,
      setIsEditing: mockSetIsEditing,
      draftName: '',
      setDraftName: mockSetDraftName,
    });

    const editButton = screen.getByTitle(/Namen bearbeiten|Edit name/i);
    fireEvent.click(editButton);

    expect(mockSetIsEditing).toHaveBeenCalledWith(true);
    expect(mockSetDraftName).toHaveBeenCalledWith('Alice');
  });

  it('enters edit mode when pressing Enter on the name display', () => {
    renderWithToast({
      student: baseStudent,
      allStudents: [baseStudent],
      updateStudent: mockUpdateStudent,
      isEditing: false,
      setIsEditing: mockSetIsEditing,
      draftName: '',
      setDraftName: mockSetDraftName,
      showEditButton: false,
    });

    const nameDisplay = screen.getByLabelText(/Namen bearbeiten|Edit name/i);
    fireEvent.keyDown(nameDisplay, { key: 'Enter', code: 'Enter' });

    expect(mockSetIsEditing).toHaveBeenCalledWith(true);
    expect(mockSetDraftName).toHaveBeenCalledWith('Alice');
  });

  it('enters edit mode when pressing Space on the name display', () => {
    renderWithToast({
      student: baseStudent,
      allStudents: [baseStudent],
      updateStudent: mockUpdateStudent,
      isEditing: false,
      setIsEditing: mockSetIsEditing,
      draftName: '',
      setDraftName: mockSetDraftName,
      showEditButton: false,
    });

    const nameDisplay = screen.getByLabelText(/Namen bearbeiten|Edit name/i);
    fireEvent.keyDown(nameDisplay, { key: ' ', code: 'Space' });

    expect(mockSetIsEditing).toHaveBeenCalledWith(true);
    expect(mockSetDraftName).toHaveBeenCalledWith('Alice');
  });

  it('renders input field in edit mode', () => {
    renderWithToast({
      student: baseStudent,
      allStudents: [baseStudent],
      updateStudent: mockUpdateStudent,
      isEditing: true,
      setIsEditing: mockSetIsEditing,
      draftName: 'Alice',
      setDraftName: mockSetDraftName,
    });

    const input = screen.getByDisplayValue('Alice');
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it('shows save and cancel buttons in edit mode', () => {
    renderWithToast({
      student: baseStudent,
      allStudents: [baseStudent],
      updateStudent: mockUpdateStudent,
      isEditing: true,
      setIsEditing: mockSetIsEditing,
      draftName: 'Alice',
      setDraftName: mockSetDraftName,
    });

    expect(screen.getByTitle(/Speichern|Save/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Abbrechen|Cancel/i)).toBeInTheDocument();
  });

  it('updates draft name on input change', () => {
    renderWithToast({
      student: baseStudent,
      allStudents: [baseStudent],
      updateStudent: mockUpdateStudent,
      isEditing: true,
      setIsEditing: mockSetIsEditing,
      draftName: 'Alice',
      setDraftName: mockSetDraftName,
    });

    const input = screen.getByDisplayValue('Alice');
    fireEvent.change(input, { target: { value: 'Alice Smith' } });

    expect(mockSetDraftName).toHaveBeenCalledWith('Alice Smith');
  });

  it('saves valid name on Enter key', () => {
    renderWithToast({
      student: baseStudent,
      allStudents: [baseStudent],
      updateStudent: mockUpdateStudent,
      isEditing: true,
      setIsEditing: mockSetIsEditing,
      draftName: 'Bob',
      setDraftName: mockSetDraftName,
    });

    const input = screen.getByDisplayValue('Bob');
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(mockUpdateStudent).toHaveBeenCalledWith('1', { name: 'Bob' });
    expect(mockSetIsEditing).toHaveBeenCalledWith(false);
    expect(mockSetDraftName).toHaveBeenCalledWith('');
  });

  it('cancels editing on Escape key', () => {
    renderWithToast({
      student: baseStudent,
      allStudents: [baseStudent],
      updateStudent: mockUpdateStudent,
      isEditing: true,
      setIsEditing: mockSetIsEditing,
      draftName: 'Bob',
      setDraftName: mockSetDraftName,
    });

    const input = screen.getByDisplayValue('Bob');
    fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });

    expect(mockUpdateStudent).not.toHaveBeenCalled();
    expect(mockSetIsEditing).toHaveBeenCalledWith(false);
    expect(mockSetDraftName).toHaveBeenCalledWith('');
  });

  it('shows error toast for empty name', async () => {
    renderWithToast({
      student: baseStudent,
      allStudents: [baseStudent],
      updateStudent: mockUpdateStudent,
      isEditing: true,
      setIsEditing: mockSetIsEditing,
      draftName: '   ',
      setDraftName: mockSetDraftName,
    });

    const saveButton = screen.getByTitle(/Speichern|Save/i);
    fireEvent.click(saveButton);

    await vi.waitFor(() => {
      expectErrorToast();
    });
    expect(mockUpdateStudent).not.toHaveBeenCalled();
  });

  it('shows error toast for duplicate name', async () => {
    const otherStudent: Student = { ...baseStudent, id: '2', name: 'Bob' };

    renderWithToast({
      student: baseStudent,
      allStudents: [baseStudent, otherStudent],
      updateStudent: mockUpdateStudent,
      isEditing: true,
      setIsEditing: mockSetIsEditing,
      draftName: 'Bob',
      setDraftName: mockSetDraftName,
    });

    const saveButton = screen.getByTitle(/Speichern|Save/i);
    fireEvent.click(saveButton);

    await vi.waitFor(() => {
      expectErrorToast();
    });
    expect(mockUpdateStudent).not.toHaveBeenCalled();
  });

  it('cancels editing on cancel button click', () => {
    renderWithToast({
      student: baseStudent,
      allStudents: [baseStudent],
      updateStudent: mockUpdateStudent,
      isEditing: true,
      setIsEditing: mockSetIsEditing,
      draftName: 'Bob',
      setDraftName: mockSetDraftName,
    });

    const cancelButton = screen.getByTitle(/Abbrechen|Cancel/i);
    fireEvent.click(cancelButton);

    expect(mockUpdateStudent).not.toHaveBeenCalled();
    expect(mockSetIsEditing).toHaveBeenCalledWith(false);
    expect(mockSetDraftName).toHaveBeenCalledWith('');
  });

  it('saves name on blur event', () => {
    renderWithToast({
      student: baseStudent,
      allStudents: [baseStudent],
      updateStudent: mockUpdateStudent,
      isEditing: true,
      setIsEditing: mockSetIsEditing,
      draftName: 'Charlie',
      setDraftName: mockSetDraftName,
    });

    const input = screen.getByDisplayValue('Charlie');
    fireEvent.blur(input);

    expect(mockUpdateStudent).toHaveBeenCalledWith('1', { name: 'Charlie' });
  });

  it('shows truncation badge for long names', () => {
    const longNameStudent: Student = {
      ...baseStudent,
      name: 'Alexander Christopher Johnson',
    };

    renderWithToast({
      student: longNameStudent,
      allStudents: [longNameStudent],
      updateStudent: mockUpdateStudent,
      isEditing: false,
      setIsEditing: mockSetIsEditing,
      draftName: '',
      setDraftName: mockSetDraftName,
    });

    // Check for truncation badge using aria-label
    const badge = screen.getByLabelText(/Gekürzter Name|Truncated name/i);
    expect(badge).toBeInTheDocument();
  });

  it('triggers edit mode on click of name', () => {
    renderWithToast({
      student: baseStudent,
      allStudents: [baseStudent],
      updateStudent: mockUpdateStudent,
      isEditing: false,
      setIsEditing: mockSetIsEditing,
      draftName: '',
      setDraftName: mockSetDraftName,
    });

    const nameSpan = screen.getByText(baseStudent.name);
    fireEvent.click(nameSpan);

    expect(mockSetIsEditing).toHaveBeenCalledWith(true);
  });

  it('prevents event bubbling on name click (stopPropagation)', () => {
    const parentClickHandler = vi.fn();
    const { container } = renderWithToast({
      student: baseStudent,
      allStudents: [baseStudent],
      updateStudent: mockUpdateStudent,
      isEditing: false,
      setIsEditing: mockSetIsEditing,
      draftName: '',
      setDraftName: mockSetDraftName,
    });

    // Wrap in parent div with click handler to test event bubbling
    const parent = container.parentElement;
    if (parent) {
      parent.addEventListener('click', parentClickHandler);
      parent.addEventListener('dblclick', parentClickHandler);
    }

    const nameSpan = screen.getByText(baseStudent.name);
    fireEvent.click(nameSpan);

    // Verify edit mode was triggered
    expect(mockSetIsEditing).toHaveBeenCalledWith(true);

    // Verify parent handler was NOT called (event was stopped)
    expect(parentClickHandler).not.toHaveBeenCalled();

    // Cleanup
    if (parent) {
      parent.removeEventListener('click', parentClickHandler);
      parent.removeEventListener('dblclick', parentClickHandler);
    }
  });

  it('shows tooltip hint for click', () => {
    renderWithToast({
      student: baseStudent,
      allStudents: [baseStudent],
      updateStudent: mockUpdateStudent,
      isEditing: false,
      setIsEditing: mockSetIsEditing,
      draftName: '',
      setDraftName: mockSetDraftName,
    });

    const nameSpan = screen.getByText(baseStudent.name);
    expect(nameSpan).toHaveAttribute(
      'title',
      expect.stringMatching(
        /Klick oder Eingabetaste zum Bearbeiten|Click or press Enter to edit/i,
      ),
    );
  });

  it('does not show edit button when showEditButton is false', () => {
    renderWithToast({
      student: baseStudent,
      allStudents: [baseStudent],
      updateStudent: mockUpdateStudent,
      isEditing: false,
      setIsEditing: mockSetIsEditing,
      draftName: '',
      setDraftName: mockSetDraftName,
      showEditButton: false,
    });

    const editButton = screen.queryByTitle(/Namen bearbeiten|Edit name/i);
    expect(editButton).not.toBeInTheDocument();
  });

  it('shows edit button by default (showEditButton default true)', () => {
    renderWithToast({
      student: baseStudent,
      allStudents: [baseStudent],
      updateStudent: mockUpdateStudent,
      isEditing: false,
      setIsEditing: mockSetIsEditing,
      draftName: '',
      setDraftName: mockSetDraftName,
    });

    const editButton = screen.getByTitle(/Namen bearbeiten|Edit name/i);
    expect(editButton).toBeInTheDocument();
  });
});
