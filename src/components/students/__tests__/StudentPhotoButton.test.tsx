// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { expect, test, vi, beforeEach } from 'vitest';
import '@/i18n'; // Initialize i18n for tests
import StudentPhotoButton from '../StudentPhotoButton';
import { getButton, createMockStudent } from '@/__tests__/utils';
import { LOCAL_STORAGE_KEYS } from '@/utils/data/storageKeys';

const mockBitmap = () =>
  ({ width: 160, height: 160, close: vi.fn() }) as unknown as ImageBitmap;

const { getStudentPhotoMock, loadImageBitmapFromBlobMock } = vi.hoisted(() => ({
  getStudentPhotoMock: vi.fn(),
  loadImageBitmapFromBlobMock: vi.fn(),
}));

vi.mock('@/hooks/student/useStudentPhoto', () => ({
  useStudentPhoto: (id: string, hasPhoto?: boolean) =>
    hasPhoto
      ? { objectUrl: 'blob:mock-photo', dataUrl: 'data:,', loading: false }
      : { objectUrl: undefined, dataUrl: undefined, loading: false },
  getStudentPhoto: getStudentPhotoMock,
  saveStudentPhoto: vi.fn(),
  removeStudentPhoto: vi.fn(),
}));

vi.mock('@/utils/image/processStudentPhoto', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@/utils/image/processStudentPhoto')
  >()),
  loadImageBitmapFromBlob: loadImageBitmapFromBlobMock,
  loadImageBitmapFromFile: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  // Skip the one-time consent dialog so clicks reach the picker directly.
  localStorage.setItem(LOCAL_STORAGE_KEYS.photoConsentConfirmed, 'true');
  getStudentPhotoMock.mockResolvedValue(
    new Blob([new Uint8Array([1])], { type: 'image/jpeg' }),
  );
  loadImageBitmapFromBlobMock.mockImplementation(async () => mockBitmap());
});

const renderButton = (hasPhoto: boolean) => {
  const student = createMockStudent({ name: 'Alice', hasPhoto });
  return render(
    <StudentPhotoButton student={student} updateStudent={vi.fn()} />,
  );
};

test('opens the file picker when no photo exists yet', () => {
  const inputClick = vi
    .spyOn(HTMLInputElement.prototype, 'click')
    .mockImplementation(() => {});
  renderButton(false);

  fireEvent.click(getButton(/Foto hinzufügen|Add photo/i));

  expect(inputClick).toHaveBeenCalledOnce();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('opens the crop editor for an existing photo instead of the picker', async () => {
  const inputClick = vi
    .spyOn(HTMLInputElement.prototype, 'click')
    .mockImplementation(() => {});
  renderButton(true);

  fireEvent.click(getButton(/Foto ändern|Change photo/i));

  const dialog = await screen.findByRole('dialog');
  expect(dialog).toHaveAccessibleName(/Foto zuschneiden|Crop photo/i);
  expect(getStudentPhotoMock).toHaveBeenCalledOnce();
  expect(loadImageBitmapFromBlobMock).toHaveBeenCalledOnce();
  expect(inputClick).not.toHaveBeenCalled();
});

test('the "replace image" button in the editor opens the file picker', async () => {
  const inputClick = vi
    .spyOn(HTMLInputElement.prototype, 'click')
    .mockImplementation(() => {});
  renderButton(true);

  fireEvent.click(getButton(/Foto ändern|Change photo/i));
  await screen.findByRole('dialog');

  fireEvent.click(getButton(/Bild ersetzen|Replace image/i));

  expect(inputClick).toHaveBeenCalledOnce();
});

test('falls back to the file picker when the stored photo is missing', async () => {
  getStudentPhotoMock.mockResolvedValue(undefined);
  const inputClick = vi
    .spyOn(HTMLInputElement.prototype, 'click')
    .mockImplementation(() => {});
  renderButton(true);

  fireEvent.click(getButton(/Foto ändern|Change photo/i));

  await waitFor(() => expect(inputClick).toHaveBeenCalledOnce());
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
