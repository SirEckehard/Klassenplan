import { useCallback } from 'react';
import { downloadBlob } from '@/utils';
import type { DownloadBlobSource } from '@/utils';

interface UseDownloadFileOptions {
  defaultMimeType?: string;
  logContext?: string;
  filePickerTypes?: FilePickerAcceptType[];
}

type DownloadHandler = (
  data: DownloadBlobSource,
  filename: string,
  mimeType?: string,
) => Promise<void>;

export function useDownloadFile(
  options?: UseDownloadFileOptions,
): DownloadHandler {
  const defaultMimeType = options?.defaultMimeType;
  const logContext = options?.logContext;
  const filePickerTypes = options?.filePickerTypes;

  return useCallback(
    async (data, filename, mimeType) => {
      await downloadBlob(data, filename, mimeType ?? defaultMimeType, {
        logContext,
        filePickerTypes,
      });
    },
    [defaultMimeType, logContext, filePickerTypes],
  );
}
