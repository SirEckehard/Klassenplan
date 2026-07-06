// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { logError } from './logger';
import { getBrowserDocument, getBrowserWindow } from './browserEnvironment';
import { confirmDownload } from './ui/downloadConfirmation';

const DEFAULT_MIME_TYPE = 'application/octet-stream';
const DEFAULT_LOG_CONTEXT = 'downloadBlob';

export type DownloadBlobSource = Blob | BlobPart | BlobPart[];

export interface DownloadBlobOptions {
  logContext?: string;
  filePickerTypes?: FilePickerAcceptType[];
}

function ensureBlob(data: DownloadBlobSource, mimeType: string): Blob {
  if (data instanceof Blob) {
    return data.type === mimeType ? data : data.slice(0, data.size, mimeType);
  }

  const parts = Array.isArray(data) ? data : [data];
  return new Blob(parts, { type: mimeType });
}

function getFilenameExtension(filename: string): string | undefined {
  const index = filename.lastIndexOf('.');
  if (index <= 0 || index === filename.length - 1) {
    return undefined;
  }
  return filename.slice(index);
}

function buildDefaultPickerTypes(
  filename: string,
  mimeType: string,
): FilePickerAcceptType[] | undefined {
  const extension = getFilenameExtension(filename);
  if (!extension) {
    return undefined;
  }
  return [
    {
      description: `${extension.replace('.', '').toUpperCase()} File`,
      accept: {
        [mimeType]: [extension],
      },
    },
  ];
}

async function writeWithPicker(
  blob: Blob,
  filename: string,
  mimeType: string,
  options?: DownloadBlobOptions,
): Promise<'handled' | 'fallback' | 'cancelled'> {
  const browserWindow = getBrowserWindow();
  if (
    !browserWindow ||
    typeof browserWindow.showSaveFilePicker !== 'function'
  ) {
    return 'fallback';
  }

  try {
    const fileHandle = await browserWindow.showSaveFilePicker({
      suggestedName: filename,
      types:
        options?.filePickerTypes ?? buildDefaultPickerTypes(filename, mimeType),
    });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return 'handled';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'cancelled';
    }
    logError(
      'showSaveFilePicker failed',
      { error, filename },
      options?.logContext ?? DEFAULT_LOG_CONTEXT,
    );
    return 'fallback';
  }
}

function anchorDownload(blob: Blob, filename: string): void {
  const documentRef = getBrowserDocument();
  if (!documentRef || !documentRef.body) {
    throw new Error('Document unavailable for download.');
  }

  let anchor: HTMLAnchorElement | null = null;
  let objectUrl: string | undefined;

  try {
    objectUrl = URL.createObjectURL(blob);
    anchor = documentRef.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.style.display = 'none';
    documentRef.body.appendChild(anchor);
    anchor.click();
  } finally {
    if (anchor && anchor.parentNode) {
      anchor.parentNode.removeChild(anchor);
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

export async function downloadBlob(
  data: DownloadBlobSource,
  filename: string,
  mimeType: string = DEFAULT_MIME_TYPE,
  options?: DownloadBlobOptions,
): Promise<void> {
  const logContext = options?.logContext ?? DEFAULT_LOG_CONTEXT;

  // Ask the user before any file leaves the app (silently declined = no-op).
  const confirmed = await confirmDownload(filename);
  if (!confirmed) {
    return;
  }

  try {
    const blob = ensureBlob(data, mimeType);
    const pickerResult = await writeWithPicker(blob, filename, mimeType, {
      ...options,
      logContext,
    });

    if (pickerResult === 'handled' || pickerResult === 'cancelled') {
      return;
    }

    anchorDownload(blob, filename);
  } catch (error) {
    logError('downloadBlob failed', { error, filename }, logContext);
    throw error;
  }
}

interface DownloadJsonOptions extends DownloadBlobOptions {
  pretty?: boolean;
}

export async function downloadJson<T>(
  data: T,
  filename: string,
  options?: DownloadJsonOptions,
): Promise<void> {
  const logContext = options?.logContext ?? 'downloadJson';
  const spacing = options?.pretty ? 2 : undefined;
  let payload: string;
  try {
    payload = JSON.stringify(data, null, spacing);
  } catch (error) {
    logError(
      'downloadJson serialization failed',
      { error, filename },
      logContext,
    );
    throw error;
  }

  await downloadBlob(payload, filename, 'application/json', {
    ...options,
    logContext,
    filePickerTypes:
      options?.filePickerTypes ??
      buildDefaultPickerTypes(filename, 'application/json'),
  });
}
