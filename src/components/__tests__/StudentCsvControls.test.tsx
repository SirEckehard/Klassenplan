import '@testing-library/jest-dom/vitest';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StudentCsvControls from '../StudentCsvControls';
import type { Student } from '../../types';
import type { NameColumnMode } from '@/utils/data/csvUtils';
import { createMockCsvFile } from '../../__tests__/utils';

describe('StudentCsvControls', () => {
  it('handles CSV upload and calls onImport with file', async () => {
    const mockOnImport = vi
      .fn<(file: File) => Promise<Student[]>>()
      .mockResolvedValue([]);
    const { container } = render(
      <StudentCsvControls onImport={mockOnImport} />,
    );

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(input).toBeInTheDocument();

    const file = createMockCsvFile('name,geschlecht\nMax,Junge\n');
    await fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockOnImport).toHaveBeenCalledWith(file, undefined);
    });
  });

  it('allows selecting combined name columns before import', async () => {
    const mockOnImport = vi
      .fn<(file: File, mode?: NameColumnMode) => Promise<Student[]>>()
      .mockResolvedValue([]);
    const { container } = render(
      <StudentCsvControls onImport={mockOnImport} />,
    );

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(input).toBeInTheDocument();

    const file = createMockCsvFile('vorname,nachname\nMax,Muster\n');
    await fireEvent.change(input, { target: { files: [file] } });

    await screen.findByRole('heading', {
      name: /Namens-Spalten auswählen/i,
    });

    fireEvent.click(
      screen.getByRole('radio', { name: /Vorname \+ Nachname/i }),
    );
    fireEvent.click(screen.getByRole('button', { name: /Importieren/i }));

    await waitFor(() => {
      expect(mockOnImport).toHaveBeenCalledWith(file, 'fullName');
    });
  });
});
