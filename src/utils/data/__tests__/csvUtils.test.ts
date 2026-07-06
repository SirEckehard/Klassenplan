// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import Papa from 'papaparse';
import type { Duplex } from 'stream';
import { beforeEach, describe, expect, test, it, vi } from 'vitest';
import type { Student } from '@/types';
import {
  detectNameColumns,
  needsNameColumnSelection,
  parseCsvFlexible,
  parseCsvRecords,
  resetCsvWorkerStateForTests,
} from '@/utils/data/csvUtils';
import { MAX_STUDENT_NAME_LENGTH, MAX_STUDENTS } from '@/utils';

const createCsvFile = (content: string, filename = 'test.csv'): File => {
  const blob = new Blob([content], { type: 'text/csv' });
  return new File([blob], filename, { type: 'text/csv' });
};

describe('csvUtils', () => {
  beforeEach(() => {
    resetCsvWorkerStateForTests();
  });

  describe('parseCsvFlexible', () => {
    test('maps gender labels to normalized values', async () => {
      const csv =
        'Name,Geschlecht,Besondere Bedürfnisse\nAlice,Mädchen,Brille\nBob,Junge,\n';
      const file = createCsvFile(csv);
      const students = await parseCsvFlexible(file);

      expect(students).toHaveLength(2);
      expect(students[0].name).toBe('Alice');
      expect(students[0].gender).toBe('girl');
      expect(students[0].needsFrontSeat).toBe(true);
      expect(students[1].gender).toBe('boy');
      expect(students[1].needsFrontSeat).toBe(false);
    });

    test('maps English male/female and diverse labels', async () => {
      const csv =
        'name,gender\nCharlie,female\nDave,male\nSam,divers\nTaylor,nonbinary\n';
      const file = createCsvFile(csv, 'gender.csv');
      const students = await parseCsvFlexible(file);

      expect(students).toHaveLength(4);
      expect(students[0].gender).toBe('girl');
      expect(students[1].gender).toBe('boy');
      expect(students[2].gender).toBe('diverse');
      expect(students[3].gender).toBe('diverse');
    });

    test('parses uppercase headers', async () => {
      const csv =
        'NAME,GESCHLECHT,BESONDERE BEDÜRFNISSE\nEva,Mädchen,Rollstuhl\n';
      const file = createCsvFile(csv, 'uppercase.csv');
      const students = await parseCsvFlexible(file);

      expect(students).toHaveLength(1);
      expect(students[0].name).toBe('Eva');
      expect(students[0].gender).toBe('girl');
      expect(students[0].needsFrontSeat).toBe(false);
    });

    test('handles alternative special needs header', async () => {
      const csv = 'name,geschlecht,special needs\nFinn,junge,Brille\n';
      const file = createCsvFile(csv, 'needs.csv');
      const students = await parseCsvFlexible(file);

      expect(students).toHaveLength(1);
      expect(students[0].needsFrontSeat).toBe(true);
    });

    test('parses dedicated boolean columns', async () => {
      const csv =
        'name,geschlecht,unruhig,schüchtern,ablenkbarkeit,hör- und sehschwäche\nAlice,mädchen,ja,ja,ja,ja\nBob,junge,,,,\n';
      const file = createCsvFile(csv, 'bool.csv');
      const students = await parseCsvFlexible(file);

      expect(students).toHaveLength(2);
      expect(students[0]).toMatchObject({
        restless: true,
        shy: true,
        concentrationIssues: true,
        needsFrontSeat: true,
      });
      expect(students[1]).toMatchObject({
        restless: false,
        shy: false,
        concentrationIssues: false,
        needsFrontSeat: false,
      });
    });

    test('parses textual height categories', async () => {
      const csv =
        'Name,Körpergröße\nAnna,klein\nBen,Mittelgroß\nCarl,groß\nDana,small\n';
      const file = createCsvFile(csv, 'height-text.csv');
      const students = await parseCsvFlexible(file);

      expect(students.map((student: Student) => student.height)).toEqual([
        'small',
        'medium',
        'tall',
        'small',
      ]);
    });

    test('interprets numeric height values', async () => {
      const csv = 'Name,Groesse\nAnna,145\nBen,165cm\nCarl,"1,82"\n';
      const file = createCsvFile(csv, 'height-numeric.csv');
      const students = await parseCsvFlexible(file);

      expect(students[0].height).toBe('small');
      expect(students[1].height).toBe('medium');
      expect(students[2].height).toBe('tall');
    });

    test('supports legacy concentration column name', async () => {
      const csv =
        'name,geschlecht,unruhig,schüchtern,konzentration\nAlice,mädchen,ja,,ja\n';
      const file = createCsvFile(csv, 'legacy.csv');
      const [student] = await parseCsvFlexible(file);

      expect(student.concentrationIssues).toBe(true);
    });

    test('leaves gender undefined when missing or unknown', async () => {
      const csv = 'name,geschlecht\nAlice,\nBob,?\n';
      const file = createCsvFile(csv, 'missing-gender.csv');
      const students = await parseCsvFlexible(file);

      expect(students.map((student: Student) => student.gender)).toEqual([
        undefined,
        undefined,
      ]);
    });

    test('rejects malformed CSV files', async () => {
      const parseSpy = vi.spyOn(Papa, 'parse').mockImplementation(((
        file: Papa.LocalFile,
        opts?: Papa.ParseLocalConfig<unknown, Papa.LocalFile>,
      ) => {
        opts?.error?.(new Error('bad csv'), file);
        return {} as Duplex;
      }) as unknown as typeof Papa.parse);
      const file = createCsvFile('bad', 'bad.csv');

      await expect(parseCsvFlexible(file)).rejects.toThrow('bad csv');
      parseSpy.mockRestore();
    });

    it('handles performance columns correctly', async () => {
      const csvContent = `Name,Leistungsstark,Leistungsschwach
Max Mustermann,ja,
Anna Schmidt,,ja
Peter Müller,ja,ja
Lisa Weber,,
Tom Fischer,1,
Sarah Klein,,1`;

      const file = createCsvFile(csvContent, 'performance-columns.csv');
      const students = await parseCsvFlexible(file);

      expect(students).toHaveLength(6);
      expect(students[0].performanceStrong).toBe(true);
      expect(students[0].performanceWeak).toBe(false);
      expect(students[1].performanceStrong).toBe(false);
      expect(students[1].performanceWeak).toBe(true);
      expect(students[2].performanceStrong).toBe(false);
      expect(students[2].performanceWeak).toBe(false);
      expect(students[4].performanceStrong).toBe(true);
      expect(students[5].performanceWeak).toBe(true);
    });

    it('handles performance flags in special needs column', async () => {
      const csvContent = `Name,Besondere Bedürfnisse
Max Mustermann,leistungsstark
Anna Schmidt,leistungsschwach
Peter Müller,"leistungsstark, leistungsschwach"
Lisa Weber,unruhig`;

      const file = createCsvFile(csvContent, 'performance-needs.csv');
      const students = await parseCsvFlexible(file);

      expect(students).toHaveLength(4);
      expect(students[0].performanceStrong).toBe(true);
      expect(students[0].performanceWeak).toBe(false);
      expect(students[1].performanceStrong).toBe(false);
      expect(students[1].performanceWeak).toBe(true);
      expect(students[2].performanceStrong).toBe(false);
      expect(students[2].performanceWeak).toBe(false);
      expect(students[3].restless).toBe(true);
    });

    it('prioritizes dedicated columns over special needs column', async () => {
      const csvContent = `Name,Leistungsstark,Besondere Bedürfnisse
Max Mustermann,ja,leistungsschwach
Anna Schmidt,,leistungsstark`;

      const file = createCsvFile(csvContent, 'performance-priority.csv');
      const students = await parseCsvFlexible(file);

      expect(students).toHaveLength(2);
      expect(students[0].performanceStrong).toBe(false);
      expect(students[0].performanceWeak).toBe(false);
      expect(students[1].performanceStrong).toBe(true);
      expect(students[1].performanceWeak).toBe(false);
    });

    it('sanitizes imported names and strips dangerous markup', async () => {
      const csvContent = `Name
<script>alert("x")</script><b> Anna </b>
<img src="x" onerror="alert(1)">
`;
      const file = createCsvFile(csvContent, 'sanitized-names.csv');
      const students = await parseCsvFlexible(file);

      expect(students).toHaveLength(1);
      expect(students[0].name).toBe('Anna');
    });

    it('limits imported name length to avoid oversized values', async () => {
      const longName = `${'A'.repeat(MAX_STUDENT_NAME_LENGTH)}EXTRA`;
      const csvContent = `Name
${longName}
`;
      const file = createCsvFile(csvContent, 'long-name.csv');
      const students = await parseCsvFlexible(file);

      expect(students).toHaveLength(1);
      expect(students[0].name).toHaveLength(MAX_STUDENT_NAME_LENGTH);
      expect(students[0].name.endsWith('EXTRA')).toBe(false);
    });

    it('rejects CSV files that exceed MAX_STUDENTS rows', async () => {
      const studentRows = Array.from(
        { length: MAX_STUDENTS + 1 },
        (_, index) => `Student ${index + 1}`,
      ).join('\n');
      const csvContent = `Name
${studentRows}
`;
      const file = createCsvFile(csvContent, 'too-many.csv');

      await expect(parseCsvFlexible(file)).rejects.toThrow(
        'toast:student.maxReached',
      );
    });

    it('passes parsing options through to inline parser', async () => {
      const parseResult = {
        data: [],
        errors: [],
        meta: {
          fields: ['name'],
          linebreak: '\n',
          delimiter: ',',
          truncated: false,
          aborted: false,
          cursor: 0,
        },
      } satisfies Papa.ParseResult<Record<string, unknown>>;

      const controller = new AbortController();
      const papaSpy = vi.spyOn(Papa, 'parse').mockImplementation(((
        file: Papa.LocalFile,
        config?: Papa.ParseLocalConfig<Record<string, unknown>, Papa.LocalFile>,
      ) => {
        config?.complete?.(parseResult, file);
        return {} as Duplex;
      }) as unknown as typeof Papa.parse);

      const options = {
        useWorker: false,
        previewRows: 3,
        signal: controller.signal,
        timeoutMs: 1500,
      };

      try {
        const file = createCsvFile('name\nPreview\n', 'options.csv');
        await parseCsvFlexible(file, undefined, options);

        expect(papaSpy).toHaveBeenCalledWith(
          expect.any(File),
          expect.objectContaining({ preview: options.previewRows }),
        );
      } finally {
        papaSpy.mockRestore();
      }
    });

    it('returns students when parsing via worker succeeds', async () => {
      const originalWorker = globalThis.Worker;
      const originalCreateObjectUrl = URL.createObjectURL;
      const originalRevokeObjectUrl = URL.revokeObjectURL;
      const mockResult = {
        data: [{ name: 'Worker Anna' }],
        errors: [],
        meta: {
          fields: ['name'],
          linebreak: '\n',
          delimiter: ',',
          truncated: false,
          aborted: false,
          cursor: 0,
        },
      } satisfies Papa.ParseResult<Record<string, unknown>>;

      class SuccessfulMockWorker {
        private messageHandler?: (event: MessageEvent) => void;
        private errorHandler?: (event: ErrorEvent) => void;

        constructor() {}

        addEventListener(
          type: string,
          handler: EventListenerOrEventListenerObject,
        ): void {
          if (type === 'message') {
            this.messageHandler = handler as (event: MessageEvent) => void;
          }
          if (type === 'error') {
            this.errorHandler = handler as (event: ErrorEvent) => void;
          }
        }

        removeEventListener(): void {
          this.messageHandler = undefined;
          this.errorHandler = undefined;
        }

        postMessage(data: unknown): void {
          if (
            typeof data === 'object' &&
            data &&
            'type' in data &&
            (data as { type: string }).type === 'parse'
          ) {
            queueMicrotask(() => {
              this.messageHandler?.({
                data: { type: 'complete', payload: mockResult },
              } as MessageEvent);
            });
          }
        }

        terminate(): void {
          this.messageHandler = undefined;
          this.errorHandler = undefined;
        }
      }

      (globalThis as typeof globalThis & { Worker: typeof Worker }).Worker =
        SuccessfulMockWorker as unknown as typeof Worker;

      URL.createObjectURL = URL.createObjectURL ?? (() => 'blob:mock-url');
      URL.revokeObjectURL = URL.revokeObjectURL ?? (() => {});

      const papaSpy = vi.spyOn(Papa, 'parse');

      try {
        const file = createCsvFile('name\nWorker Anna\n', 'worker.csv');
        const students = await parseCsvFlexible(file, undefined, {
          useWorker: true,
        });

        expect(students).toHaveLength(1);
        expect(students[0].name).toBe('Worker Anna');
        expect(papaSpy).not.toHaveBeenCalled();
      } finally {
        papaSpy.mockRestore();
        (globalThis as typeof globalThis & { Worker?: typeof Worker }).Worker =
          originalWorker;
        URL.createObjectURL = originalCreateObjectUrl;
        URL.revokeObjectURL = originalRevokeObjectUrl;
      }
    });

    it('falls back to inline parsing when worker fails', async () => {
      const originalWorker = globalThis.Worker;
      const originalCreateObjectUrl = URL.createObjectURL;
      const originalRevokeObjectUrl = URL.revokeObjectURL;
      URL.createObjectURL = URL.createObjectURL ?? (() => 'blob:mock-url');
      URL.revokeObjectURL = URL.revokeObjectURL ?? (() => {});

      class FailingMockWorker {
        private errorHandler?: (event: ErrorEvent) => void;

        constructor() {}

        addEventListener(
          type: string,
          handler: EventListenerOrEventListenerObject,
        ): void {
          if (type === 'error') {
            this.errorHandler = handler as (event: ErrorEvent) => void;
          }
        }

        removeEventListener(): void {
          this.errorHandler = undefined;
        }

        postMessage(): void {
          queueMicrotask(() => {
            this.errorHandler?.(
              new ErrorEvent('error', { message: 'Worker blew up' }),
            );
          });
        }

        terminate(): void {
          this.errorHandler = undefined;
        }
      }

      (globalThis as typeof globalThis & { Worker: typeof Worker }).Worker =
        FailingMockWorker as unknown as typeof Worker;

      const papaSpy = vi.spyOn(Papa, 'parse').mockImplementation(((
        file: Papa.LocalFile,
        config?: Papa.ParseLocalConfig<unknown, Papa.LocalFile>,
      ) => {
        config?.complete?.(
          {
            data: [{ name: 'Inline' }],
            errors: [],
            meta: {
              fields: ['name'],
              linebreak: '\n',
              delimiter: ',',
              truncated: false,
              aborted: false,
              cursor: 0,
            },
          } as Papa.ParseResult<Record<string, unknown>>,
          file,
        );
        return {} as Duplex;
      }) as unknown as typeof Papa.parse);

      try {
        const file = createCsvFile('ignored', 'fallback.csv');
        const students = await parseCsvFlexible(file, undefined, {
          useWorker: true,
        });

        expect(students).toHaveLength(1);
        expect(papaSpy).toHaveBeenCalled();
      } finally {
        (globalThis as typeof globalThis & { Worker?: typeof Worker }).Worker =
          originalWorker;
        URL.createObjectURL = originalCreateObjectUrl;
        URL.revokeObjectURL = originalRevokeObjectUrl;
        papaSpy.mockRestore();
      }
    });

    it('aborts worker parsing when signal is triggered', async () => {
      const originalWorker = globalThis.Worker;
      const originalCreateObjectUrl = URL.createObjectURL;
      const originalRevokeObjectUrl = URL.revokeObjectURL;
      URL.createObjectURL = URL.createObjectURL ?? (() => 'blob:mock-url');
      URL.revokeObjectURL = URL.revokeObjectURL ?? (() => {});

      const postedMessages: Array<unknown> = [];
      let terminated = false;

      class AbortableWorker {
        addEventListener(): void {}
        removeEventListener(): void {}
        postMessage(data: unknown): void {
          postedMessages.push(data);
        }
        terminate(): void {
          terminated = true;
        }
      }

      (globalThis as typeof globalThis & { Worker: typeof Worker }).Worker =
        AbortableWorker as unknown as typeof Worker;

      const controller = new AbortController();
      const parsePromise = parseCsvRecords(
        createCsvFile('Name\nAbort\n', 'abort.csv'),
        { useWorker: true, signal: controller.signal },
      );
      const rejection = expect(parsePromise).rejects.toMatchObject({
        name: 'AbortError',
      });

      controller.abort();

      try {
        await rejection;
        expect(
          postedMessages.some(
            (message) =>
              typeof message === 'object' &&
              message !== null &&
              'type' in message &&
              (message as { type?: string }).type === 'cancel',
          ),
        ).toBe(true);
        expect(terminated).toBe(true);
      } finally {
        (globalThis as typeof globalThis & { Worker?: typeof Worker }).Worker =
          originalWorker;
        URL.createObjectURL = originalCreateObjectUrl;
        URL.revokeObjectURL = originalRevokeObjectUrl;
      }
    });

    it('times out worker parsing and forwards options to the worker', async () => {
      const originalWorker = globalThis.Worker;
      const originalCreateObjectUrl = URL.createObjectURL;
      const originalRevokeObjectUrl = URL.revokeObjectURL;
      URL.createObjectURL = URL.createObjectURL ?? (() => 'blob:mock-url');
      URL.revokeObjectURL = URL.revokeObjectURL ?? (() => {});

      const postedMessages: Array<unknown> = [];
      let terminated = false;

      class HangingWorker {
        addEventListener(): void {}
        removeEventListener(): void {}
        postMessage(data: unknown): void {
          postedMessages.push(data);
        }
        terminate(): void {
          terminated = true;
        }
      }

      (globalThis as typeof globalThis & { Worker: typeof Worker }).Worker =
        HangingWorker as unknown as typeof Worker;

      const file = createCsvFile('Name\nTimeout\n', 'timeout.csv');

      vi.useFakeTimers();

      try {
        const parsePromise = parseCsvRecords(file, {
          useWorker: true,
          previewRows: 2,
          timeoutMs: 25,
        });

        const rejection = expect(parsePromise).rejects.toMatchObject({
          name: 'TimeoutError',
        });

        await vi.advanceTimersByTimeAsync(30);

        await rejection;

        expect(postedMessages[0]).toMatchObject({
          type: 'parse',
          payload: expect.objectContaining({ previewRows: 2 }),
        });
        expect(
          postedMessages.some(
            (message) =>
              typeof message === 'object' &&
              message !== null &&
              'type' in message &&
              (message as { type?: string }).type === 'cancel',
          ),
        ).toBe(true);
        expect(terminated).toBe(true);
      } finally {
        vi.useRealTimers();
        (globalThis as typeof globalThis & { Worker?: typeof Worker }).Worker =
          originalWorker;
        URL.createObjectURL = originalCreateObjectUrl;
        URL.revokeObjectURL = originalRevokeObjectUrl;
      }
    });

    it('disables worker after repeated failures to avoid double parsing', async () => {
      const originalWorker = globalThis.Worker;
      const originalCreateObjectUrl = URL.createObjectURL;
      const originalRevokeObjectUrl = URL.revokeObjectURL;
      URL.createObjectURL = URL.createObjectURL ?? (() => 'blob:mock-url');
      URL.revokeObjectURL = URL.revokeObjectURL ?? (() => {});

      let workerConstructCount = 0;

      class AlwaysFailingWorker {
        private errorHandler?: (event: ErrorEvent) => void;

        constructor() {
          workerConstructCount += 1;
        }

        addEventListener(
          type: string,
          handler: EventListenerOrEventListenerObject,
        ): void {
          if (type === 'error') {
            this.errorHandler = handler as (event: ErrorEvent) => void;
          }
        }

        removeEventListener(): void {
          this.errorHandler = undefined;
        }

        postMessage(): void {
          queueMicrotask(() => {
            this.errorHandler?.(
              new ErrorEvent('error', { message: 'Worker failure' }),
            );
          });
        }

        terminate(): void {
          this.errorHandler = undefined;
        }
      }

      (globalThis as typeof globalThis & { Worker: typeof Worker }).Worker =
        AlwaysFailingWorker as unknown as typeof Worker;

      const papaSpy = vi.spyOn(Papa, 'parse').mockImplementation(((
        file: Papa.LocalFile,
        config?: Papa.ParseLocalConfig<unknown, Papa.LocalFile>,
      ) => {
        config?.complete?.(
          {
            data: [{ name: 'Inline Fallback' }],
            errors: [],
            meta: {
              fields: ['name'],
              linebreak: '\n',
              delimiter: ',',
              truncated: false,
              aborted: false,
              cursor: 0,
            },
          } as Papa.ParseResult<Record<string, unknown>>,
          file,
        );
        return {} as Duplex;
      }) as unknown as typeof Papa.parse);

      try {
        const file = createCsvFile('name\nfail\n', 'disable.csv');

        await parseCsvFlexible(file, undefined, { useWorker: true });
        await parseCsvFlexible(file, undefined, { useWorker: true });
        const countAfterSecondAttempt = workerConstructCount;
        await parseCsvFlexible(file, undefined, { useWorker: true });

        expect(workerConstructCount).toBe(countAfterSecondAttempt);
        expect(papaSpy).toHaveBeenCalledTimes(3);
      } finally {
        (globalThis as typeof globalThis & { Worker?: typeof Worker }).Worker =
          originalWorker;
        URL.createObjectURL = originalCreateObjectUrl;
        URL.revokeObjectURL = originalRevokeObjectUrl;
        papaSpy.mockRestore();
      }
    });
  });

  describe('detectNameColumns', () => {
    test('detects vorname column', () => {
      const headers = ['vorname', 'geschlecht'];
      const result = detectNameColumns(headers);
      expect(result).toEqual({
        hasFirstName: true,
        hasLastName: false,
        hasFullName: false,
        firstNameKey: 'vorname',
        lastNameKey: undefined,
        fullNameKey: undefined,
      });
    });

    test('detects nachname column', () => {
      const headers = ['nachname', 'geschlecht'];
      const result = detectNameColumns(headers);
      expect(result).toEqual({
        hasFirstName: false,
        hasLastName: true,
        hasFullName: false,
        firstNameKey: undefined,
        lastNameKey: 'nachname',
        fullNameKey: undefined,
      });
    });

    test('detects first and last name columns', () => {
      const headers = ['vorname', 'nachname', 'geschlecht'];
      const result = detectNameColumns(headers);
      expect(result).toEqual({
        hasFirstName: true,
        hasLastName: true,
        hasFullName: false,
        firstNameKey: 'vorname',
        lastNameKey: 'nachname',
        fullNameKey: undefined,
      });
    });

    test('detects full name column', () => {
      const headers = ['name', 'geschlecht'];
      const result = detectNameColumns(headers);
      expect(result).toEqual({
        hasFirstName: false,
        hasLastName: false,
        hasFullName: true,
        firstNameKey: undefined,
        lastNameKey: undefined,
        fullNameKey: 'name',
      });
    });

    test('returns null when no name columns present', () => {
      const headers = ['geschlecht', 'klasse'];
      const result = detectNameColumns(headers);

      expect(result).toBeNull();
    });
  });

  describe('needsNameColumnSelection', () => {
    test('returns false for null info', () => {
      expect(needsNameColumnSelection(null)).toBe(false);
    });

    test('returns false when only one column type present', () => {
      expect(
        needsNameColumnSelection({
          hasFirstName: true,
          hasLastName: false,
          hasFullName: false,
          firstNameKey: 'vorname',
          lastNameKey: undefined,
          fullNameKey: undefined,
        }),
      ).toBe(false);
    });

    test('returns true when multiple column types present', () => {
      expect(
        needsNameColumnSelection({
          hasFirstName: true,
          hasLastName: true,
          hasFullName: false,
          firstNameKey: 'vorname',
          lastNameKey: 'nachname',
          fullNameKey: undefined,
        }),
      ).toBe(true);
    });

    test('returns true when full name and first name exist', () => {
      expect(
        needsNameColumnSelection({
          hasFirstName: true,
          hasLastName: false,
          hasFullName: true,
          firstNameKey: 'vorname',
          lastNameKey: undefined,
          fullNameKey: 'name',
        }),
      ).toBe(true);
    });
  });
});
