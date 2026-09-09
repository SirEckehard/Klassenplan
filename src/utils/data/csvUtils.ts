// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import Papa from 'papaparse';
import type {
  HeightCategory,
  LanguageSkillLevel,
  SocialRole,
  Student,
} from '@/types';
import {
  generateId,
  logDebug,
  logError,
  logWarn,
  MAX_STUDENT_NAME_LENGTH,
  MAX_STUDENTS,
} from '@/utils';
import {
  normalizeCsvHeader,
  normalizeHeaderKey,
} from '@/utils/data/csvNormalization';
import {
  CsvImportError,
  diagnoseTooManyRows,
  formatColumnList,
} from '@/utils/csv/csvImportDiagnostics';
import {
  CLASS_VARIANTS,
  COLUMN_ALIASES,
  FIRST_NAME_VARIANTS,
  FULL_NAME_VARIANTS,
  HEIGHT_KEY_PATTERNS,
  LANGUAGE_SKILL_KEY_PATTERNS,
  LAST_NAME_VARIANTS,
  SOCIAL_ROLE_KEY_PATTERNS,
  type CsvAliasColumn,
} from '@/utils/csv/csvColumnVocabulary';
import { sniffCsvEncoding, type CsvEncoding } from '@/utils/csv/csvEncoding';
import { stripCsvPreamble } from '@/utils/csv/csvPreamble';
import {
  applyCsvPreset,
  detectCsvPreset,
} from '@/utils/csv/csvPresetDetection';
import type { CsvPreset } from '@/utils/csv/csvPresets';
import type {
  CsvParseResult,
  NameColumnInfo,
  NameColumnMode,
} from '@/utils/csv/csvTypes';

export { hasRecognizedCsvHeaders } from '@/utils/csv/csvColumnVocabulary';
export type {
  CsvImportSelection,
  CsvParseResult,
  NameColumnInfo,
  NameColumnMode,
} from '@/utils/csv/csvTypes';
type NavigatorWithUAData = Navigator & {
  userAgentData?: { brands?: Array<{ brand: string; version: string }> };
};

const CSV_WORKER_MIN_CHROME_VERSION = 125;
// Only enable workers for larger files to avoid overhead for tiny CSVs (~40KB ≈ 400-600 rows)
const CSV_WORKER_SIZE_THRESHOLD_BYTES = 40_000;
const CSV_WORKER_CONTEXT = 'csvWorker';
const CSV_WORKER_TIMEOUT_MS = 12_000;
const CSV_WORKER_FAILURE_DISABLE_THRESHOLD = 2;
const CSV_PARSING_CONTEXT = 'csvUtils';

let cachedWorkerSupport: boolean | null = null;
let workerFailureCount = 0;
let workerPermanentlyDisabled = false;

const getTimeoutError = (): Error => {
  const error = new Error('CSV worker timed out');
  error.name = 'TimeoutError';
  return error;
};

const getAbortError = (): Error => {
  try {
    return new DOMException('Parsing aborted', 'AbortError');
  } catch {
    return Object.assign(new Error('Parsing aborted'), { name: 'AbortError' });
  }
};

const getChromeMajorVersion = (): number | null => {
  if (typeof navigator === 'undefined') return null;

  const uaData = (navigator as NavigatorWithUAData).userAgentData;

  const brandVersion =
    uaData?.brands?.find((brand) => /Chrom(e|ium)/i.test(brand.brand))
      ?.version ?? null;
  if (brandVersion) {
    const parsed = Number.parseInt(brandVersion.split('.')[0] ?? '', 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  const ua = navigator.userAgent || '';
  const match = ua.match(/Chrom(e|ium)\/(\d+)/i);
  if (match?.[2]) {
    const parsed = Number.parseInt(match[2], 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const isAbortOrTimeoutError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const maybeError = error as { name?: string };
  return maybeError.name === 'AbortError' || maybeError.name === 'TimeoutError';
};

const resetWorkerFailureState = (): void => {
  if (!workerPermanentlyDisabled) {
    workerFailureCount = 0;
  }
};

const markWorkerFailure = (error: unknown): void => {
  if (workerPermanentlyDisabled) return;

  workerFailureCount += 1;
  if (workerFailureCount >= CSV_WORKER_FAILURE_DISABLE_THRESHOLD) {
    workerPermanentlyDisabled = true;
    logWarn(
      'CSV worker permanently disabled after repeated failures',
      { failureCount: workerFailureCount, error },
      CSV_WORKER_CONTEXT,
    );
  }
};

const isCsvWorkerEnabled = (): boolean => {
  if (workerPermanentlyDisabled) {
    logDebug(
      'CSV worker disabled after repeated failures',
      { failureCount: workerFailureCount },
      CSV_WORKER_CONTEXT,
    );
    return false;
  }
  return true;
};

export const resetCsvWorkerStateForTests = (): void => {
  if (process.env.NODE_ENV !== 'test') return;
  cachedWorkerSupport = null;
  workerFailureCount = 0;
  workerPermanentlyDisabled = false;
};

const hasModuleWorkerSupport = (): boolean => {
  if (cachedWorkerSupport !== null) {
    return cachedWorkerSupport;
  }

  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    cachedWorkerSupport = false;
    return cachedWorkerSupport;
  }

  const chromeVersion = getChromeMajorVersion();
  if (chromeVersion && chromeVersion < CSV_WORKER_MIN_CHROME_VERSION) {
    logDebug(
      'CSV worker disabled for Chrome version guard',
      { chromeVersion },
      CSV_WORKER_CONTEXT,
    );
    cachedWorkerSupport = false;
    return cachedWorkerSupport;
  }

  try {
    const blob = new Blob(['self.onmessage = () => {};'], {
      type: 'application/javascript',
    });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url, {
      type: 'module',
      name: 'csv-worker-probe',
    });
    worker.terminate();
    URL.revokeObjectURL(url);
    cachedWorkerSupport = true;
  } catch (error) {
    logWarn(
      'CSV worker probe failed, falling back to main thread',
      { error },
      CSV_WORKER_CONTEXT,
    );
    cachedWorkerSupport = false;
  }

  return cachedWorkerSupport;
};

export const shouldUseCsvWorker = (file?: File): boolean => {
  if (!isCsvWorkerEnabled()) {
    return false;
  }
  if (!file) return false;
  if (file.size < CSV_WORKER_SIZE_THRESHOLD_BYTES) {
    return false;
  }
  return hasModuleWorkerSupport();
};

const parseWithWorker = (
  file: File,
  options: {
    previewRows?: number;
    signal?: AbortSignal;
    timeoutMs?: number;
    encoding?: CsvEncoding;
  },
): Promise<CsvParseResult> =>
  new Promise((resolve, reject) => {
    try {
      const worker = new Worker(
        new URL('../../workers/csvParser.worker.ts', import.meta.url),
        {
          type: 'module',
          name: 'csv-parser',
        },
      );

      const timeoutId = setTimeout(() => {
        worker.terminate();
        reject(getTimeoutError());
      }, options.timeoutMs ?? CSV_WORKER_TIMEOUT_MS);

      const cleanup = (): void => {
        clearTimeout(timeoutId);
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        if (options.signal) {
          options.signal.removeEventListener('abort', handleAbort);
        }
        worker.terminate();
      };

      const handleMessage = (event: MessageEvent): void => {
        const data = event.data as
          | { type: 'complete'; payload: CsvParseResult }
          | { type: 'error'; payload?: { message?: string } };

        if (data?.type === 'complete') {
          cleanup();
          resolve(data.payload);
          return;
        }

        if (data?.type === 'error') {
          cleanup();
          reject(new Error(data.payload?.message ?? 'CSV worker error'));
        }
      };

      const handleError = (event: ErrorEvent): void => {
        cleanup();
        reject(event.error ?? new Error(event.message ?? 'CSV worker failed'));
      };

      const handleAbort = (): void => {
        // `cleanup` terminates the worker, which stops the parse immediately —
        // a cancel message would never be processed before termination.
        cleanup();
        reject(getAbortError());
      };

      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);
      if (options.signal) {
        if (options.signal.aborted) {
          handleAbort();
          return;
        }
        options.signal.addEventListener('abort', handleAbort);
      }

      worker.postMessage({
        type: 'parse',
        payload: {
          file,
          previewRows: options.previewRows,
          encoding: options.encoding,
        },
      });
    } catch (error) {
      reject(
        error instanceof Error
          ? error
          : new Error('CSV worker could not be started'),
      );
    }
  });

const parseInline = (
  file: File,
  options: {
    previewRows?: number;
    signal?: AbortSignal;
    encoding?: CsvEncoding;
  },
): Promise<CsvParseResult> =>
  new Promise((resolve, reject) => {
    let aborted = false;

    const abortParsing = (): void => {
      const abortFn = (Papa as unknown as { abort?: () => void }).abort;
      if (typeof abortFn === 'function') {
        abortFn();
      }
    };

    const cleanup = (): void => {
      if (options.signal) {
        options.signal.removeEventListener('abort', handleAbort);
      }
    };

    const handleAbort = (): void => {
      aborted = true;
      abortParsing();
      cleanup();
      reject(getAbortError());
    };

    Papa.parse<Record<string, unknown>, File>(file, {
      worker: false,
      header: true,
      skipEmptyLines: true,
      preview: options.previewRows,
      encoding: options.encoding,
      transformHeader: normalizeCsvHeader,
      beforeFirstChunk: stripCsvPreamble,
      complete: (result) => {
        cleanup();
        if (!aborted) {
          resolve(result);
        }
      },
      error: (error) => {
        cleanup();
        reject(error);
      },
    });

    if (options.signal) {
      if (options.signal.aborted) {
        handleAbort();
        return;
      }
      options.signal.addEventListener('abort', handleAbort);
    }
  });

type ParseCsvOptions = {
  useWorker?: boolean;
  previewRows?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Skips the sniffing step when the caller already determined the encoding. */
  encoding?: CsvEncoding;
};

export const parseCsvRecords = async (
  file: File,
  options: ParseCsvOptions = {},
): Promise<CsvParseResult> => {
  const requestedWorker = options.useWorker ?? shouldUseCsvWorker(file);
  const encoding = options.encoding ?? (await sniffCsvEncoding(file));
  const preferWorker = requestedWorker && isCsvWorkerEnabled();

  if (preferWorker) {
    if (!hasModuleWorkerSupport()) {
      logDebug(
        'CSV worker skipped because runtime does not support module workers',
        undefined,
        CSV_WORKER_CONTEXT,
      );
    } else {
      try {
        const result = await parseWithWorker(file, {
          previewRows: options.previewRows,
          signal: options.signal,
          timeoutMs: options.timeoutMs,
          encoding,
        });
        resetWorkerFailureState();
        return result;
      } catch (error) {
        if (isAbortOrTimeoutError(error)) {
          throw error;
        }
        markWorkerFailure(error);
        logWarn(
          'CSV worker parsing failed, falling back to main thread',
          { error },
          CSV_WORKER_CONTEXT,
        );
      }
    }
  }

  return parseInline(file, {
    previewRows: options.previewRows,
    signal: options.signal,
    encoding,
  });
};

/**
 * Map arbitrary gender labels to standardized values.
 * @param value Raw gender cell value
 * @returns Normalized gender string
 */
const mapToGender = (
  value: unknown,
): 'boy' | 'girl' | 'diverse' | undefined => {
  const v = String(value ?? '')
    .trim()
    .toLowerCase();
  if (['mädchen', 'girl', 'female', 'w', 'weiblich', 'f', 'frau'].includes(v))
    return 'girl';
  if (['junge', 'boy', 'male', 'm', 'männlich', 'mann'].includes(v))
    return 'boy';
  if (['divers', 'diverse', 'd', 'non-binary', 'nonbinary', 'nb'].includes(v))
    return 'diverse';
  if (v.startsWith('w')) return 'girl';
  return undefined;
};

// eslint-disable-next-line no-control-regex -- We intentionally strip ASCII control characters from imported names
const CONTROL_CHAR_PATTERN = /[\x00-\x1F\x7F]/g;
const SCRIPT_TAG_PATTERN = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
const STYLE_TAG_PATTERN = /<style\b[^>]*>[\s\S]*?<\/style>/gi;
const GENERIC_TAG_PATTERN = /<\/?[^>]+>/g;
const MULTIPLE_WHITESPACE_PATTERN = /\s+/g;

/**
 * Sanitize free-text student names imported via CSV.
 * Removes script/style blocks, plain HTML tags, control characters
 * and trims excessive whitespace to reduce XSS/CSV injection risk.
 */
const sanitizeStudentName = (value: unknown): string => {
  const raw = String(value ?? '');
  const normalized = raw
    .normalize('NFKC')
    .replace(SCRIPT_TAG_PATTERN, ' ')
    .replace(STYLE_TAG_PATTERN, ' ')
    .replace(GENERIC_TAG_PATTERN, ' ')
    .replace(CONTROL_CHAR_PATTERN, ' ')
    .replace(MULTIPLE_WHITESPACE_PATTERN, ' ')
    .trim();

  if (!normalized) {
    return '';
  }

  return normalized.slice(0, MAX_STUDENT_NAME_LENGTH);
};

/** First header matching one of the variants, compared accent-insensitively. */
const findHeader = (
  headers: readonly string[],
  variants: readonly string[],
): string | undefined =>
  headers.find((header) => variants.includes(normalizeHeaderKey(header)));

/**
 * Detect available name columns in CSV headers
 * @param headers Normalized CSV headers (lowercase)
 * @returns Information about detected name columns
 */
export function detectNameColumns(headers: string[]): NameColumnInfo | null {
  const firstNameKey = findHeader(headers, FIRST_NAME_VARIANTS);
  let lastNameKey = findHeader(headers, LAST_NAME_VARIANTS);
  let fullNameKey = findHeader(headers, FULL_NAME_VARIANTS);

  // A bare "Name" sitting next to a "Vorname" is the surname, not the whole
  // name — that is how WebUntis and most German school exports label their
  // columns. Reading it as a full name imported the class as a list of
  // surnames, and left "Vorname + Nachname" unreachable in the dialog.
  if (fullNameKey && firstNameKey && !lastNameKey) {
    lastNameKey = fullNameKey;
    fullNameKey = undefined;
  }

  // No name columns found at all
  if (!firstNameKey && !lastNameKey && !fullNameKey) {
    return null;
  }

  return {
    hasFirstName: !!firstNameKey,
    hasLastName: !!lastNameKey,
    hasFullName: !!fullNameKey,
    firstNameKey,
    lastNameKey,
    fullNameKey,
  };
}

/**
 * Check if name column selection dialog is needed
 * @param nameInfo Detected name column information
 * @returns True if user should choose between multiple name columns
 */
export function needsNameColumnSelection(
  nameInfo: NameColumnInfo | null,
): boolean {
  if (!nameInfo) return false;

  // Count how many distinct types of name columns exist
  const distinctTypes = [
    nameInfo.hasFirstName,
    nameInfo.hasLastName,
    nameInfo.hasFullName,
  ].filter(Boolean).length;

  // Need selection if we have 2 or more distinct types
  // (e.g., both firstName and lastName columns)
  return distinctTypes >= 2;
}

/**
 * Convert a CSV "special needs" cell into boolean flags.
 * @param value Raw CSV cell value
 * @returns Object with special need flags
 */
const mapNeeds = (
  value: unknown,
): Pick<
  Student,
  | 'restless'
  | 'shy'
  | 'concentrationIssues'
  | 'needsFrontSeat'
  | 'performanceStrong'
  | 'performanceWeak'
> => {
  const parts = String(value ?? '')
    .split(',')
    .map((p) => p.trim().toLowerCase());
  const includesAny = (candidates: string[]): boolean =>
    candidates.some((candidate) => parts.includes(candidate));
  return {
    restless: includesAny(['unruhig', 'restless']),
    shy: includesAny(['schüchtern', 'shy']),
    concentrationIssues: includesAny([
      'konzentration',
      'ablenkbarkeit',
      'distracted',
      'distractible',
    ]),
    needsFrontSeat: parts.some(
      (p) =>
        p.includes('hör') ||
        p.includes('seh') ||
        p.includes('brille') ||
        p.includes('front'),
    ),
    performanceStrong: includesAny(['leistungsstark', 'high performer']),
    performanceWeak: includesAny(['leistungsschwach', 'low performer']),
  };
};

/**
 * Interpret common truthy strings within a CSV cell.
 * Accepts "ja", "yes" or "1" (case-insensitive) as true.
 */
const parseBooleanCell = (value: unknown): boolean => {
  const v = String(value ?? '')
    .trim()
    .toLowerCase();
  return v === 'ja' || v === 'yes' || v === '1';
};

/**
 * Index of the file's headings by their normalized form.
 *
 * Row keys arrive trimmed and lower-cased (see {@link normalizeCsvHeader}) but
 * keep their umlauts, spaces and punctuation, while the shared vocabulary is
 * written in {@link normalizeHeaderKey} form. This index bridges the two, so
 * "Vordere Plätze", "vordere plaetze" and "Vordere-Plaetze" all reach the same
 * column. Several headings can normalize to the same key, hence the array.
 */
type CsvHeaderIndex = ReadonlyMap<string, readonly string[]>;

const buildHeaderIndex = (fields: readonly string[]): CsvHeaderIndex => {
  const index = new Map<string, string[]>();
  for (const field of fields) {
    const key = normalizeHeaderKey(field);
    if (!key) continue;
    const existing = index.get(key);
    if (existing) {
      existing.push(field);
    } else {
      index.set(key, [field]);
    }
  }
  return index;
};

/**
 * Read the first non-empty cell whose header matches one of the column's
 * aliases. Empty cells are skipped rather than returned, so a sheet carrying
 * several accepted spellings (e.g. "Ablenkbarkeit" and "Konzentration") still
 * resolves to whichever column the teacher actually filled in.
 */
const readAliasCell = (
  row: Record<string, unknown>,
  headers: CsvHeaderIndex,
  column: CsvAliasColumn,
): unknown => {
  for (const alias of COLUMN_ALIASES[column]) {
    for (const field of headers.get(alias) ?? []) {
      const value = row[field];
      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ''
      ) {
        return value;
      }
    }
  }
  return undefined;
};

const findHeightCellValue = (
  row: Record<string, unknown>,
): unknown | undefined => {
  for (const [key, value] of Object.entries(row)) {
    const normalized = normalizeHeaderKey(key);
    if (!normalized) continue;
    if (HEIGHT_KEY_PATTERNS.some((pattern) => normalized.includes(pattern))) {
      return value;
    }
  }
  return undefined;
};

const parseHeightCell = (value: unknown): HeightCategory | undefined => {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return undefined;
  }

  const normalized = raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss');

  const numericCandidate = parseFloat(
    normalized.replace(/[^0-9.,-]/g, '').replace(',', '.'),
  );
  if (!Number.isNaN(numericCandidate) && numericCandidate > 0) {
    let centimeters = numericCandidate;
    if (centimeters > 0 && centimeters <= 3.5) {
      centimeters *= 100;
    }
    if (centimeters > 30) {
      if (centimeters <= 150) return 'small';
      if (centimeters >= 175) return 'tall';
      return 'medium';
    }
  }

  const includes = (patterns: string[]): boolean =>
    patterns.some((pattern) => normalized.includes(pattern));

  if (
    normalized === 's' ||
    normalized === 'xs' ||
    includes(['klein', 'kurz', 'short', 'small', 'petit', 'niedrig'])
  ) {
    return 'small';
  }

  if (
    normalized === 'm' ||
    includes(['mittel', 'medium', 'average', 'normal'])
  ) {
    return 'medium';
  }

  if (
    normalized === 'l' ||
    normalized === 'xl' ||
    includes(['gross', 'tall', 'lang', 'hoch', 'grossgewachsen'])
  ) {
    return 'tall';
  }

  return undefined;
};

/**
 * Parse language skill level from CSV cell.
 * Recognizes German and English labels.
 */
const LANGUAGE_SKILL_PATTERNS: Record<LanguageSkillLevel, string[]> = {
  native: ['muttersprache', 'native', 'muttersprachlich', 'deutsch'],
  fluent: ['fliessend', 'fließend', 'fluent', 'c1', 'c2'],
  intermediate: ['fortgeschritten', 'intermediate', 'b1', 'b2'],
  beginner: ['anfanger', 'anfänger', 'beginner', 'a1', 'a2'],
  daz: [
    'daz',
    'daf',
    'zweitsprache',
    'forderung',
    'förderung',
    'language support',
  ],
};

const parseLanguageSkillCell = (
  value: unknown,
): LanguageSkillLevel | undefined => {
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;

  const normalized = raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss');

  for (const [level, patterns] of Object.entries(LANGUAGE_SKILL_PATTERNS)) {
    if (patterns.some((p) => normalized.includes(p))) {
      return level as LanguageSkillLevel;
    }
  }
  return undefined;
};

const findLanguageSkillCellValue = (
  row: Record<string, unknown>,
): unknown | undefined => {
  for (const [key, value] of Object.entries(row)) {
    const normalized = normalizeHeaderKey(key);
    if (!normalized) continue;
    if (
      LANGUAGE_SKILL_KEY_PATTERNS.some((pattern) =>
        normalized.includes(pattern),
      )
    ) {
      return value;
    }
  }
  return undefined;
};

/**
 * Parse social role from CSV cell.
 * Recognizes German and English labels.
 */
const SOCIAL_ROLE_PATTERNS: Record<SocialRole, string[]> = {
  mediator: ['mediator', 'vermittler', 'schlichtend', 'beruhigend'],
  leader: ['anfuhrer', 'anführer', 'leader', 'fuhrungspersonlichkeit'],
  loner: ['einzelganger', 'einzelgänger', 'loner', 'introvertiert'],
  socialHub: ['mittelpunkt', 'socialhub', 'social hub', 'beliebt', 'popular'],
};

const parseSocialRoleCell = (value: unknown): SocialRole | undefined => {
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;

  const normalized = raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss');

  // Check for "neutral" explicitly
  if (
    normalized === 'neutral' ||
    normalized === 'keine' ||
    normalized === 'none'
  ) {
    return undefined;
  }

  for (const [role, patterns] of Object.entries(SOCIAL_ROLE_PATTERNS)) {
    if (patterns.some((p) => normalized.includes(p))) {
      return role as SocialRole;
    }
  }
  return undefined;
};

const findSocialRoleCellValue = (
  row: Record<string, unknown>,
): unknown | undefined => {
  for (const [key, value] of Object.entries(row)) {
    const normalized = normalizeHeaderKey(key);
    if (!normalized) continue;
    // Avoid matching 'role' if it's part of other column names
    if (
      SOCIAL_ROLE_KEY_PATTERNS.some((pattern) => normalized.includes(pattern))
    ) {
      return value;
    }
  }
  return undefined;
};

/**
 * Extract name from CSV row based on mode and available columns
 * @param row CSV row data
 * @param nameInfo Detected name column information
 * @param mode Name column mode
 * @returns Extracted name or empty string
 */
function extractName(
  row: Record<string, unknown>,
  nameInfo: NameColumnInfo,
  mode?: NameColumnMode,
): string {
  const readCell = (key?: string): string =>
    key ? String(row[key] ?? '').trim() : '';

  // If full name column exists and no mode specified, use it
  if (nameInfo.fullNameKey && !mode) {
    return sanitizeStudentName(readCell(nameInfo.fullNameKey));
  }

  // If only one type of name column exists, use it
  if (nameInfo.hasFullName && !nameInfo.hasFirstName && !nameInfo.hasLastName) {
    return sanitizeStudentName(readCell(nameInfo.fullNameKey));
  }
  if (nameInfo.hasFirstName && !nameInfo.hasLastName && !nameInfo.hasFullName) {
    return sanitizeStudentName(readCell(nameInfo.firstNameKey));
  }
  if (nameInfo.hasLastName && !nameInfo.hasFirstName && !nameInfo.hasFullName) {
    return sanitizeStudentName(readCell(nameInfo.lastNameKey));
  }

  // Multiple name columns exist - use mode or default to firstName
  const actualMode = mode || 'firstName';

  // An export carrying "Name" next to "Vorname" and "Nachname": take the
  // ready-made column rather than rebuilding the name from its parts.
  if (actualMode === 'nameColumn' && nameInfo.fullNameKey) {
    return sanitizeStudentName(readCell(nameInfo.fullNameKey));
  }

  if (actualMode === 'fullName') {
    // Combine first and last name
    const firstName = readCell(nameInfo.firstNameKey);
    const lastName = readCell(nameInfo.lastNameKey);
    const combined = `${firstName} ${lastName}`.trim();
    // Neither part present: fall back to the full-name column instead of
    // dropping the name, which is what "combine" used to do on a file whose
    // only name column is a combined one.
    return sanitizeStudentName(combined || readCell(nameInfo.fullNameKey));
  }

  if (actualMode === 'firstName' && nameInfo.firstNameKey) {
    return sanitizeStudentName(readCell(nameInfo.firstNameKey));
  }

  if (actualMode === 'lastName' && nameInfo.lastNameKey) {
    return sanitizeStudentName(readCell(nameInfo.lastNameKey));
  }

  // Fallback: try any available column
  if (nameInfo.firstNameKey)
    return sanitizeStudentName(readCell(nameInfo.firstNameKey));
  if (nameInfo.lastNameKey)
    return sanitizeStudentName(readCell(nameInfo.lastNameKey));
  if (nameInfo.fullNameKey)
    return sanitizeStudentName(readCell(nameInfo.fullNameKey));

  return '';
}

/** "Nachname, Vorname" — exactly one comma, something on either side. */
const SURNAME_FIRST_PATTERN = /^\s*([^,]+?)\s*,\s*([^,]+?)\s*$/;

/**
 * True when *every* filled name reads "Nachname, Vorname".
 *
 * Demanding all of them is the point: a list where a single cell happens to
 * carry a comma must stay untouched, because reordering it would invent a name
 * the teacher never wrote.
 */
const usesSurnameFirst = (names: readonly string[]): boolean => {
  const filled = names.filter((name) => name.trim().length > 0);
  return (
    filled.length > 0 &&
    filled.every((name) => SURNAME_FIRST_PATTERN.test(name))
  );
};

const reorderSurnameFirst = (name: string): string => {
  const match = SURNAME_FIRST_PATTERN.exec(name);
  return match ? `${match[2]} ${match[1]}` : name;
};

/** Header of the class column, if the file carries one. */
export const findCsvClassKey = (
  headers: readonly string[],
): string | undefined => findHeader(headers, CLASS_VARIANTS);

/**
 * Distinct class names in a parsed file, in the order they first appear.
 *
 * Exports from school administration systems regularly hold several classes —
 * sometimes a whole school. Empty cells are ignored, so a single-class file
 * with a few blanks still counts as one class.
 */
export const collectCsvClassNames = (result: CsvParseResult): string[] => {
  const headers = (result.meta?.fields ?? []).map((field) =>
    normalizeCsvHeader(field),
  );
  const classKey = findCsvClassKey(headers);
  if (!classKey) return [];

  const names: string[] = [];
  const seen = new Set<string>();
  for (const row of Array.isArray(result.data) ? result.data : []) {
    if (row == null || typeof row !== 'object') continue;
    const value = String(row[classKey] ?? '').trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    names.push(value);
  }
  return names;
};

type ParseStudentsOptions = ParseCsvOptions & {
  /**
   * Import only the rows of this class. Ignored when the file has no class
   * column, or when no row carries that name.
   */
  className?: string;
  /** Set to false to import a recognised export without its preset. */
  usePreset?: boolean;
  /** Reports the preset that was applied, so a caller can name it in a toast. */
  onPresetApplied?: (preset: CsvPreset) => void;
};

/**
 * Parse a CSV file with flexible header names into student objects.
 * @param file CSV file uploaded by the user
 * @param nameMode Optional name column mode (firstName, lastName, fullName)
 * @returns Promise resolving to an array of students
 */
export async function parseCsvFlexible(
  file: File,
  nameMode?: NameColumnMode,
  options?: ParseStudentsOptions,
): Promise<Student[]> {
  const rawResult = await parseCsvRecords(file, {
    useWorker: options?.useWorker,
    previewRows: options?.previewRows,
    signal: options?.signal,
    timeoutMs: options?.timeoutMs,
    encoding: options?.encoding,
  });

  try {
    // A recognised export is translated into Klassenplan's own column
    // vocabulary first; everything below is the unchanged import path.
    const match =
      options?.usePreset === false
        ? null
        : detectCsvPreset(rawResult.meta?.fields ?? []);
    const parseResult = match
      ? applyCsvPreset(rawResult, match.preset)
      : rawResult;
    if (match) {
      options?.onPresetApplied?.(match.preset);
    }

    // Detect name columns from headers
    const headers =
      parseResult.meta?.fields?.map((field) => normalizeCsvHeader(field)) || [];
    const nameInfo = detectNameColumns(headers);
    const headerIndex = buildHeaderIndex(headers);

    const allRows = Array.isArray(parseResult.data) ? parseResult.data : [];
    // Narrowing to one class has to happen before the size check — otherwise a
    // whole-school export is rejected for being too large instead of asking
    // which class was meant.
    const classKey = options?.className ? findCsvClassKey(headers) : undefined;
    const rows =
      classKey && options?.className
        ? allRows.filter(
            (row) =>
              row != null &&
              typeof row === 'object' &&
              String(row[classKey] ?? '').trim() === options.className,
          )
        : allRows;

    if (rows.length > MAX_STUDENTS) {
      throw new CsvImportError(diagnoseTooManyRows(rows.length, MAX_STUDENTS));
    }

    if (!nameInfo) {
      throw new CsvImportError({
        messageKey: 'toast:csv.noNameColumn',
        values: {
          fileName: file.name,
          columns: formatColumnList(parseResult.meta?.fields ?? []),
        },
        offerFormatHelp: true,
      });
    }

    // First pass: create all students without partner references
    const studentsWithPartnerNames: Array<{
      student: Student;
      wishPartnerNames: string[];
      avoidPartnerNames: string[];
    }> = [];

    // Names are extracted up front: whether a column reads "Nachname, Vorname"
    // can only be judged across the whole list, never row by row.
    const extractedNames = rows.map((row) =>
      row != null && typeof row === 'object'
        ? extractName(row, nameInfo, nameMode)
        : '',
    );
    const surnameFirst = usesSurnameFirst(extractedNames);

    for (const [index, row] of rows.entries()) {
      if (row == null || typeof row !== 'object') continue;
      const extracted = extractedNames[index];
      const name = surnameFirst ? reorderSurnameFirst(extracted) : extracted;
      if (!name) continue;

      const gender = mapToGender(readAliasCell(row, headerIndex, 'gender'));
      const needs = mapNeeds(readAliasCell(row, headerIndex, 'specialNeeds'));
      const strong =
        parseBooleanCell(
          readAliasCell(row, headerIndex, 'performanceStrong'),
        ) || needs.performanceStrong;
      const weak =
        parseBooleanCell(readAliasCell(row, headerIndex, 'performanceWeak')) ||
        needs.performanceWeak;
      const heightValue = findHeightCellValue(row);
      const height = parseHeightCell(heightValue);

      // Parse wish/avoid partner names (comma-separated)
      const parsePartnerNames = (value: unknown): string[] => {
        if (!value) return [];
        return String(value)
          .split(',')
          .map((n) => n.trim())
          .filter((n) => n.length > 0);
      };

      const wishPartnerNames = parsePartnerNames(
        readAliasCell(row, headerIndex, 'wishPartner'),
      );
      const avoidPartnerNames = parsePartnerNames(
        readAliasCell(row, headerIndex, 'avoidPartner'),
      );

      // Create base student without performance flags
      const baseStudent = {
        id: generateId(),
        name,
        restless:
          parseBooleanCell(readAliasCell(row, headerIndex, 'restless')) ||
          needs.restless,
        shy:
          parseBooleanCell(readAliasCell(row, headerIndex, 'shy')) || needs.shy,
        concentrationIssues:
          parseBooleanCell(
            readAliasCell(row, headerIndex, 'concentrationIssues'),
          ) || needs.concentrationIssues,
        needsFrontSeat:
          parseBooleanCell(readAliasCell(row, headerIndex, 'needsFrontSeat')) ||
          needs.needsFrontSeat,
        height,
        prefersWindow: parseBooleanCell(
          readAliasCell(row, headerIndex, 'prefersWindow'),
        ),
        prefersDoor: parseBooleanCell(
          readAliasCell(row, headerIndex, 'prefersDoor'),
        ),
        languageSkill: parseLanguageSkillCell(findLanguageSkillCellValue(row)),
        socialRole: parseSocialRoleCell(findSocialRoleCellValue(row)),
        wishPartnerIds: [] as string[],
        avoidPartnerIds: [] as string[],
      };

      let student: Student;
      if (strong && !weak) {
        student = {
          ...baseStudent,
          performanceStrong: true,
          performanceWeak: false,
        };
      } else if (weak && !strong) {
        student = {
          ...baseStudent,
          performanceStrong: false,
          performanceWeak: true,
        };
      } else {
        student = {
          ...baseStudent,
          performanceStrong: false,
          performanceWeak: false,
        };
      }
      if (gender) student.gender = gender;

      studentsWithPartnerNames.push({
        student,
        wishPartnerNames,
        avoidPartnerNames,
      });
    }

    // Second pass: resolve partner names to IDs
    const nameToId = new Map<string, string>();
    for (const { student } of studentsWithPartnerNames) {
      nameToId.set(student.name.toLowerCase(), student.id);
    }

    const students = studentsWithPartnerNames.map(
      ({ student, wishPartnerNames, avoidPartnerNames }) => {
        // Resolve wish partner names to IDs (max 3)
        const wishPartnerIds: string[] = [];
        for (const partnerName of wishPartnerNames) {
          const partnerId = nameToId.get(partnerName.toLowerCase());
          if (
            partnerId &&
            partnerId !== student.id &&
            wishPartnerIds.length < 3
          ) {
            wishPartnerIds.push(partnerId);
          }
        }

        // Resolve avoid partner names to IDs (max 3)
        const avoidPartnerIds: string[] = [];
        for (const partnerName of avoidPartnerNames) {
          const partnerId = nameToId.get(partnerName.toLowerCase());
          if (
            partnerId &&
            partnerId !== student.id &&
            avoidPartnerIds.length < 3
          ) {
            avoidPartnerIds.push(partnerId);
          }
        }

        return {
          ...student,
          wishPartnerIds,
          avoidPartnerIds,
          // Keep legacy fields in sync for backward compatibility
          wishPartnerId: wishPartnerIds[0] ?? null,
          avoidPartnerId: avoidPartnerIds[0] ?? null,
        };
      },
    );
    return students;
  } catch (error) {
    logError(
      'CSV parsing failed during transformation',
      { error },
      CSV_PARSING_CONTEXT,
    );
    throw error;
  }
}
