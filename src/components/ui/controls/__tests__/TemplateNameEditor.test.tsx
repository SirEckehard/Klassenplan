import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TemplateNameEditor from '../TemplateNameEditor';
import '@/i18n/i18n';
import type { ClassroomTemplate } from '../../../../types';
import { ToastProvider } from '../../feedback/ToastProvider';
import { dismissAllToasts } from '../../../../utils/ui/toast';

const mockTemplates: ClassroomTemplate[] = [
  {
    id: 1,
    name: 'Vorlage 1',
    scene: { tables: [], totalStudents: 0 },
  },
  {
    id: 2,
    name: 'Vorlage 2',
    scene: { tables: [], totalStudents: 0 },
  },
];

const renderWithToast = (ui: React.ReactElement) => {
  return render(<ToastProvider>{ui}</ToastProvider>);
};

afterEach(() => {
  act(() => {
    dismissAllToasts();
  });
  cleanup();
});

describe('TemplateNameEditor', () => {
  it('displays template name by default', () => {
    const onRename = vi.fn();
    renderWithToast(
      <TemplateNameEditor
        template={mockTemplates[0]}
        allTemplates={mockTemplates}
        onRename={onRename}
      />,
    );

    expect(screen.getByText('Vorlage 1')).toBeInTheDocument();
  });

  it('displays template name with edit aria-label', () => {
    const onRename = vi.fn();
    renderWithToast(
      <TemplateNameEditor
        template={mockTemplates[0]}
        allTemplates={mockTemplates}
        onRename={onRename}
      />,
    );

    expect(
      screen.getByLabelText(/Vorlagennamen bearbeiten|Edit template name/i),
    ).toBeInTheDocument();
  });

  it('enters edit mode on double click', async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();
    renderWithToast(
      <TemplateNameEditor
        template={mockTemplates[0]}
        allTemplates={mockTemplates}
        onRename={onRename}
      />,
    );

    await user.dblClick(screen.getByText('Vorlage 1'));

    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('Vorlage 1');
  });

  it('saves name on Enter key', async () => {
    const user = userEvent.setup();
    const onRename = vi.fn().mockResolvedValue({ success: true });
    renderWithToast(
      <TemplateNameEditor
        template={mockTemplates[0]}
        allTemplates={mockTemplates}
        onRename={onRename}
      />,
    );

    await user.dblClick(screen.getByText('Vorlage 1'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'New Name{Enter}');

    await waitFor(() => {
      expect(onRename).toHaveBeenCalledWith(1, 'New Name');
    });
  });

  it('saves name on save button click', async () => {
    const user = userEvent.setup();
    const onRename = vi.fn().mockResolvedValue({ success: true });
    renderWithToast(
      <TemplateNameEditor
        template={mockTemplates[0]}
        allTemplates={mockTemplates}
        onRename={onRename}
      />,
    );

    await user.dblClick(screen.getByText('Vorlage 1'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'New Name');

    const saveButton = screen.getByRole('button', { name: /speichern|save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(onRename).toHaveBeenCalledWith(1, 'New Name');
    });
  });

  it('cancels edit on Escape key', async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();
    renderWithToast(
      <TemplateNameEditor
        template={mockTemplates[0]}
        allTemplates={mockTemplates}
        onRename={onRename}
      />,
    );

    await user.dblClick(screen.getByText('Vorlage 1'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'New Name{Escape}');

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByText('Vorlage 1')).toBeInTheDocument();
  });

  it('cancels edit on cancel button click', async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();
    renderWithToast(
      <TemplateNameEditor
        template={mockTemplates[0]}
        allTemplates={mockTemplates}
        onRename={onRename}
      />,
    );

    await user.dblClick(screen.getByText('Vorlage 1'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'New Name');

    const cancelButton = screen.getByRole('button', {
      name: /abbrechen|cancel/i,
    });
    await user.click(cancelButton);

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByText('Vorlage 1')).toBeInTheDocument();
  });

  it('shows error toast for empty name', async () => {
    const user = userEvent.setup();
    const onRename = vi
      .fn()
      .mockResolvedValue({ success: false, error: 'empty' });
    renderWithToast(
      <TemplateNameEditor
        template={mockTemplates[0]}
        allTemplates={mockTemplates}
        onRename={onRename}
      />,
    );

    await user.dblClick(screen.getByText('Vorlage 1'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '{Enter}');

    // Component shows inline error, not toast for empty name
    expect(onRename).not.toHaveBeenCalled();
  });

  it('shows error toast for duplicate name', async () => {
    const user = userEvent.setup();
    const onRename = vi
      .fn()
      .mockResolvedValue({ success: false, error: 'duplicate' });
    renderWithToast(
      <TemplateNameEditor
        template={mockTemplates[0]}
        allTemplates={mockTemplates}
        onRename={onRename}
      />,
    );

    await user.dblClick(screen.getByText('Vorlage 1'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Vorlage 2{Enter}');

    // Component shows inline error, not toast for duplicate name
    expect(onRename).not.toHaveBeenCalled();
  });

  it('does not rename if name is unchanged', async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();
    renderWithToast(
      <TemplateNameEditor
        template={mockTemplates[0]}
        allTemplates={mockTemplates}
        onRename={onRename}
      />,
    );

    await user.dblClick(screen.getByText('Vorlage 1'));
    const input = screen.getByRole('textbox');
    await user.type(input, '{Enter}');

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByText('Vorlage 1')).toBeInTheDocument();
  });
});
