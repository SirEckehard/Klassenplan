import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as downloads from '../downloads';
import * as logger from '../logger';
import * as browserEnv from '../browserEnvironment';

type WindowWithSavePicker = Omit<Window, 'showSaveFilePicker'> & {
  showSaveFilePicker?: Window['showSaveFilePicker'];
};

type UrlWithBlobApi = Omit<typeof URL, 'createObjectURL' | 'revokeObjectURL'> & {
  createObjectURL?: (blob: Blob | MediaSource) => string;
  revokeObjectURL?: (url: string) => void;
};

const browserWindow = window as WindowWithSavePicker;
const urlWithBlobApi = URL as UrlWithBlobApi;

const originalShowSaveFilePicker = browserWindow.showSaveFilePicker;
const originalCreateObjectURL = urlWithBlobApi.createObjectURL;
const originalRevokeObjectURL = urlWithBlobApi.revokeObjectURL;

let createUrlSpy: ReturnType<
  typeof vi.fn<(blob: Blob | MediaSource) => string>
>;
let revokeUrlSpy: ReturnType<typeof vi.fn<(url: string) => void>>;

describe('downloads utilities', () => {
  beforeEach(() => {
    createUrlSpy = vi
      .fn<(blob: Blob | MediaSource) => string>()
      .mockReturnValue('blob:test-url');
    revokeUrlSpy = vi.fn<(url: string) => void>();
    urlWithBlobApi.createObjectURL = createUrlSpy;
    urlWithBlobApi.revokeObjectURL = revokeUrlSpy;
  });

  afterEach(() => {
    if (originalShowSaveFilePicker) {
      browserWindow.showSaveFilePicker = originalShowSaveFilePicker;
    } else {
      delete browserWindow.showSaveFilePicker;
    }
    if (originalCreateObjectURL) {
      urlWithBlobApi.createObjectURL = originalCreateObjectURL;
    } else {
      delete urlWithBlobApi.createObjectURL;
    }
    if (originalRevokeObjectURL) {
      urlWithBlobApi.revokeObjectURL = originalRevokeObjectURL;
    } else {
      delete urlWithBlobApi.revokeObjectURL;
    }
    vi.restoreAllMocks();
  });

  describe('downloadBlob', () => {
    it('uses showSaveFilePicker when available', async () => {
      const writable = { write: vi.fn(), close: vi.fn() };
      const createWritable = vi.fn().mockResolvedValue(writable);
      const pickerSpy = vi
        .fn<NonNullable<WindowWithSavePicker['showSaveFilePicker']>>()
        .mockResolvedValue({ createWritable } as unknown as FileSystemFileHandle);
      browserWindow.showSaveFilePicker = pickerSpy;

      await downloads.downloadBlob('payload', 'data.txt', 'text/plain');

      expect(pickerSpy).toHaveBeenCalledWith({
        suggestedName: 'data.txt',
        types: [
          {
            description: 'TXT File',
            accept: { 'text/plain': ['.txt'] },
          },
        ],
      });
      expect(createWritable).toHaveBeenCalledTimes(1);
      expect(writable.write).toHaveBeenCalledWith(expect.any(Blob));
      expect(writable.close).toHaveBeenCalled();
    });

    it('falls back to anchor click when picker is unavailable', async () => {
      delete browserWindow.showSaveFilePicker;

      const clickSpy = vi.fn();
      const originalCreateElement = document.createElement.bind(document);
      const createElementSpy = vi
        .spyOn(document, 'createElement')
        .mockImplementation((tagName: string) => {
          const element = originalCreateElement(tagName);
          if (tagName === 'a') {
            (element as HTMLAnchorElement).click = clickSpy;
          }
          return element;
        });

      await downloads.downloadBlob('payload', 'fallback.txt', 'text/plain');

      expect(createElementSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(createUrlSpy).toHaveBeenCalled();
      expect(revokeUrlSpy).toHaveBeenCalledWith('blob:test-url');

      createElementSpy.mockRestore();
    });

    it('resolves when the picker is cancelled by the user', async () => {
      const pickerSpy = vi
        .fn<NonNullable<WindowWithSavePicker['showSaveFilePicker']>>()
        .mockRejectedValue(new DOMException('Aborted', 'AbortError'));
      browserWindow.showSaveFilePicker = pickerSpy;
      const createElementSpy = vi.spyOn(document, 'createElement');

      await expect(
        downloads.downloadBlob('payload', 'cancel.txt', 'text/plain'),
      ).resolves.toBeUndefined();

      expect(createElementSpy).not.toHaveBeenCalledWith('a');
      createElementSpy.mockRestore();
    });

    it('logs and rethrows when the DOM is unavailable', async () => {
      delete browserWindow.showSaveFilePicker;
      vi.spyOn(browserEnv, 'getBrowserDocument').mockReturnValue(
        undefined as unknown as Document,
      );
      const logSpy = vi
        .spyOn(logger, 'logError')
        .mockImplementation(() => undefined);

      await expect(
        downloads.downloadBlob('payload', 'broken.txt', 'text/plain'),
      ).rejects.toThrow('Document unavailable');

      expect(logSpy).toHaveBeenCalledWith(
        'downloadBlob failed',
        expect.objectContaining({ filename: 'broken.txt' }),
        'downloadBlob',
      );
    });
  });

  describe('downloadJson', () => {
    it('stringifies data and delegates to file picker with JSON payload', async () => {
      const captured: Blob[] = [];
      const writable = {
        write: vi.fn().mockImplementation(async (blob: Blob) => {
          captured.push(blob);
        }),
        close: vi.fn().mockResolvedValue(undefined),
      };
      const createWritable = vi.fn().mockResolvedValue(writable);
      browserWindow.showSaveFilePicker = vi
        .fn<NonNullable<WindowWithSavePicker['showSaveFilePicker']>>()
        .mockResolvedValue({ createWritable } as unknown as FileSystemFileHandle);

      await downloads.downloadJson({ foo: 'bar' }, 'data.json');

      expect(createWritable).toHaveBeenCalled();
      expect(writable.write).toHaveBeenCalled();
      expect(captured).toHaveLength(1);
      const [writtenBlob] = captured as [Blob];
      expect(writtenBlob).toBeInstanceOf(Blob);
      expect(writtenBlob.type).toBe('application/json');
      expect(writtenBlob.size).toBe(JSON.stringify({ foo: 'bar' }).length);
    });

    it('logs serialization errors', async () => {
      const logSpy = vi
        .spyOn(logger, 'logError')
        .mockImplementation(() => undefined);
      const circular: Record<string, unknown> = {};
      circular.self = circular;

      await expect(
        downloads.downloadJson(circular, 'broken.json'),
      ).rejects.toBeInstanceOf(TypeError);

      expect(logSpy).toHaveBeenCalledWith(
        'downloadJson serialization failed',
        expect.objectContaining({ filename: 'broken.json' }),
        'downloadJson',
      );
    });
  });
});
