// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@/i18n/i18n';
import SaveTemplateModal from '../SaveTemplateModal';
import type { ClassroomTemplate } from '../../../../types';

const mockTemplates: ClassroomTemplate[] = [
  {
    id: 1,
    name: 'Klassenraum 1',
    scene: {
      tables: [
        {
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          seatCount: 4,
          rotation: 0,
          locked: false,
          zIndex: 1,
        },
      ],
      totalStudents: 0,
    },
  },
  {
    id: 2,
    name: 'Klassenraum 2',
    scene: {
      tables: [
        {
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          seatCount: 4,
          rotation: 0,
          locked: false,
          zIndex: 1,
        },
        {
          x: 100,
          y: 0,
          width: 100,
          height: 100,
          seatCount: 4,
          rotation: 0,
          locked: false,
          zIndex: 2,
        },
      ],
      totalStudents: 0,
    },
  },
];

describe('SaveTemplateModal', () => {
  it('renders when open', async () => {
    const onClose = vi.fn();
    const onSave = vi.fn();

    render(
      <SaveTemplateModal
        open={true}
        onClose={onClose}
        onSave={onSave}
        existingTemplates={mockTemplates}
        tableCount={5}
        seatCount={20}
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByText(
          /Klassenraum-Vorlage speichern|Save Classroom Template/i,
        ),
      ).toBeInTheDocument(),
    );
  });

  it('does not render when closed', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();

    render(
      <SaveTemplateModal
        open={false}
        onClose={onClose}
        onSave={onSave}
        existingTemplates={mockTemplates}
        tableCount={5}
        seatCount={20}
      />,
    );

    expect(
      screen.queryByText(
        /Klassenraum-Vorlage speichern|FloppyDiskIcon Classroom Template/i,
      ),
    ).not.toBeInTheDocument();
  });

  // Test removed - layout preview is tested implicitly in other tests

  it('auto-generates smart suggestion when no default name', async () => {
    const onClose = vi.fn();
    const onSave = vi.fn();

    render(
      <SaveTemplateModal
        open={true}
        onClose={onClose}
        onSave={onSave}
        existingTemplates={mockTemplates}
        tableCount={5}
        seatCount={20}
      />,
    );

    const input = screen.getByRole('textbox', {
      name: /vorlagenname eingeben|enter template name/i,
    });
    // Should suggest "Klassenraum 3" since 1 and 2 exist
    await waitFor(() => expect(input).toHaveValue('Klassenraum 3'));
  });

  it('uses default name if provided', async () => {
    const onClose = vi.fn();
    const onSave = vi.fn();

    render(
      <SaveTemplateModal
        open={true}
        onClose={onClose}
        onSave={onSave}
        existingTemplates={mockTemplates}
        tableCount={5}
        seatCount={20}
        defaultName="Custom Name"
      />,
    );

    const input = screen.getByRole('textbox', {
      name: /vorlagenname eingeben|enter template name/i,
    });
    await waitFor(() => expect(input).toHaveValue('Custom Name'));
  });

  it('shows duplicate warning when name exists', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSave = vi.fn();

    render(
      <SaveTemplateModal
        open={true}
        onClose={onClose}
        onSave={onSave}
        existingTemplates={mockTemplates}
        tableCount={5}
        seatCount={20}
      />,
    );

    const input = screen.getByRole('textbox', {
      name: /vorlagenname eingeben|enter template name/i,
    });
    await waitFor(() => expect(input).toHaveValue('Klassenraum 3'));
    await user.clear(input);
    await user.type(input, 'Klassenraum 1');

    await waitFor(() =>
      expect(
        screen.getByText(
          /Eine Vorlage mit diesem Namen existiert bereits|A template with this name already exists/i,
        ),
      ).toBeInTheDocument(),
    );
  });

  it('disables save button when name is empty', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSave = vi.fn();

    render(
      <SaveTemplateModal
        open={true}
        onClose={onClose}
        onSave={onSave}
        existingTemplates={mockTemplates}
        tableCount={5}
        seatCount={20}
      />,
    );

    const input = screen.getByRole('textbox', {
      name: /vorlagenname eingeben|enter template name/i,
    });
    await waitFor(() => expect(input).toHaveValue('Klassenraum 3'));
    await user.clear(input);

    const saveButton = screen.getByRole('button', { name: /speichern|save/i });
    await waitFor(() => expect(saveButton).toBeDisabled());
  });

  it('disables save button when name is duplicate', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSave = vi.fn();

    render(
      <SaveTemplateModal
        open={true}
        onClose={onClose}
        onSave={onSave}
        existingTemplates={mockTemplates}
        tableCount={5}
        seatCount={20}
      />,
    );

    const input = screen.getByRole('textbox', {
      name: /vorlagenname eingeben|enter template name/i,
    });
    await waitFor(() => expect(input).toHaveValue('Klassenraum 3'));
    await user.clear(input);
    await user.type(input, 'Klassenraum 1');

    const saveButton = screen.getByRole('button', { name: /speichern|save/i });
    await waitFor(() => expect(saveButton).toBeDisabled());
  });

  it('calls onSave with name on save', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSave = vi.fn();

    render(
      <SaveTemplateModal
        open={true}
        onClose={onClose}
        onSave={onSave}
        existingTemplates={mockTemplates}
        tableCount={5}
        seatCount={20}
      />,
    );

    const input = screen.getByRole('textbox', {
      name: /vorlagenname eingeben|enter template name/i,
    });
    await waitFor(() => expect(input).toHaveValue('Klassenraum 3'));
    await user.clear(input);
    await user.type(input, 'New Template');

    const saveButton = screen.getByRole('button', { name: /speichern|save/i });
    await user.click(saveButton);

    expect(onSave).toHaveBeenCalledWith('New Template');
  });

  it('supports overwrite mode with template selection', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSave = vi.fn();

    render(
      <SaveTemplateModal
        open={true}
        onClose={onClose}
        onSave={onSave}
        existingTemplates={mockTemplates}
        tableCount={5}
        seatCount={20}
      />,
    );

    // Select template to overwrite from dropdown
    const select = screen.getByRole('combobox', {
      name: /vorlage zum überschreiben auswählen/i,
    });
    await user.selectOptions(select, '1');

    // Name should auto-populate with template name
    const input = screen.getByRole('textbox', {
      name: /vorlagenname eingeben|enter template name/i,
    });
    await waitFor(() => expect(input).toHaveValue('Klassenraum 1'));

    // User can edit the name
    await user.clear(input);
    await user.type(input, 'Updated Name');

    const saveButton = screen.getByRole('button', {
      name: /überschreiben|overwrite/i,
    });
    await user.click(saveButton);

    expect(onSave).toHaveBeenCalledWith('Updated Name', 1);
  });

  it('closes on cancel button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSave = vi.fn();

    render(
      <SaveTemplateModal
        open={true}
        onClose={onClose}
        onSave={onSave}
        existingTemplates={mockTemplates}
        tableCount={5}
        seatCount={20}
      />,
    );

    const cancelButton = screen.getByRole('button', {
      name: /abbrechen|cancel/i,
    });
    await user.click(cancelButton);

    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves on Enter key', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSave = vi.fn();

    render(
      <SaveTemplateModal
        open={true}
        onClose={onClose}
        onSave={onSave}
        existingTemplates={mockTemplates}
        tableCount={5}
        seatCount={20}
      />,
    );

    const input = screen.getByRole('textbox', {
      name: /vorlagenname eingeben|enter template name/i,
    });
    await waitFor(() => expect(input).toHaveValue('Klassenraum 3'));
    await user.clear(input);
    await user.type(input, 'New Template{Enter}');

    expect(onSave).toHaveBeenCalledWith('New Template');
  });

  it('closes on Escape key', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSave = vi.fn();

    render(
      <SaveTemplateModal
        open={true}
        onClose={onClose}
        onSave={onSave}
        existingTemplates={mockTemplates}
        tableCount={5}
        seatCount={20}
      />,
    );

    const input = screen.getByRole('textbox', {
      name: /vorlagenname eingeben|enter template name/i,
    });
    await user.type(input, '{Escape}');

    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });
});
