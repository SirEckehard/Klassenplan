import { vi, type MockedFunction, expect } from 'vitest';
import type { ParseConfig, ParseResult } from 'papaparse';

// ===== LOCALSTORAGE MOCKS =====

/**
 * Create a complete localStorage mock
 */
export const createMockLocalStorage = () => {
  const store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
    length: 0,
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
};

/**
 * Setup localStorage mock for tests
 */
export const setupLocalStorageMock = () => {
  const mockLocalStorage = createMockLocalStorage();
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });
  return mockLocalStorage;
};

// ===== INDEXEDDB MOCKS =====

/**
 * Create a basic IndexedDB mock for idb-keyval
 */
export const createMockIndexedDB = () => {
  const store: Record<string, unknown> = {};

  const mockIdbKeyval = {
    get: vi.fn(async (key: string) => store[key]),
    set: vi.fn(async (key: string, value: unknown) => {
      store[key] = value;
    }),
    del: vi.fn(async (key: string) => {
      delete store[key];
    }),
    clear: vi.fn(async () => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
    keys: vi.fn(async () => Object.keys(store)),
    values: vi.fn(async () => Object.values(store)),
  };

  return { mockIdbKeyval, store };
};

/**
 * Setup IndexedDB mocks for idb-keyval
 */
export const setupIndexedDBMocks = () => {
  const { mockIdbKeyval, store } = createMockIndexedDB();

  // Mock idb-keyval module
  vi.doMock('idb-keyval', () => mockIdbKeyval);

  return { mockIdbKeyval, store };
};

// ===== FILE API MOCKS =====

/**
 * Create mock file picker for File System Access API
 */
export const createMockFilePicker = () => {
  const mockWritableStream = {
    write: vi.fn(),
    close: vi.fn(),
    abort: vi.fn(),
  };

  const mockFileHandle = {
    createWritable: vi.fn(async () => mockWritableStream),
    getFile: vi.fn(async () => new File(['test content'], 'test.json')),
  };

  return {
    showSaveFilePicker: vi.fn(async () => mockFileHandle),
    showOpenFilePicker: vi.fn(async () => [mockFileHandle]),
    mockWritableStream,
    mockFileHandle,
  };
};

/**
 * Setup File System Access API mocks
 */
export const setupFileSystemMocks = () => {
  const mocks = createMockFilePicker();

  Object.defineProperty(window, 'showSaveFilePicker', {
    value: mocks.showSaveFilePicker,
    writable: true,
  });

  Object.defineProperty(window, 'showOpenFilePicker', {
    value: mocks.showOpenFilePicker,
    writable: true,
  });

  return mocks;
};

// ===== CSV PARSING MOCKS =====

/**
 * Create mock for Papa Parse
 */
type PapaParseOptions = Pick<ParseConfig<string[]>, 'complete'>;

export const createMockPapaParse = () => {
  const parse = vi.fn((input: string, options?: PapaParseOptions) => {
    const lines = input.trim().split('\n');
    const data = lines
      .slice(1)
      .map((line) =>
        line.split(',').map((value) => value.trim().replace(/^"|"$/g, '')),
      );

    const result: ParseResult<string[]> = {
      data,
      errors: [],
      meta: {
        delimiter: ',',
        linebreak: '\n',
        aborted: false,
        truncated: false,
        cursor: input.length,
      },
    };
    options?.complete?.(result, input as unknown as undefined);
    return result;
  });

  return { parse };
};

/**
 * Setup Papa Parse mocks
 */
export const setupPapaParseMedia = () => {
  const mockPapa = createMockPapaParse();

  vi.doMock('papaparse', () => ({
    default: mockPapa,
    parse: mockPapa.parse,
  }));

  return mockPapa;
};

// ===== ROUTER MOCKS =====

/**
 * Create mock for React Router hooks
 */
export const createMockRouter = () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({
    pathname: '/',
    search: '',
    hash: '',
    state: null,
    key: 'default',
  }),
  useParams: () => ({}),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
});

/**
 * Setup React Router mocks
 */
export const setupRouterMocks = () => {
  const mocks = createMockRouter();

  vi.doMock('react-router-dom', async (importOriginal) => {
    const actual =
      (await importOriginal()) as typeof import('react-router-dom');
    return {
      ...actual,
      useNavigate: mocks.useNavigate,
      useLocation: mocks.useLocation,
      useParams: mocks.useParams,
      useSearchParams: mocks.useSearchParams,
    };
  });

  return mocks;
};

// ===== DOM MOCKS =====

/**
 * Setup common DOM mocks for testing
 */
export const setupDOMMocks = () => {
  // Mock window.scrollTo
  Object.defineProperty(window, 'scrollTo', {
    value: vi.fn(),
    writable: true,
  });

  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
    writable: true,
  });

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  return {
    scrollTo: window.scrollTo,
    matchMedia: window.matchMedia,
    ResizeObserver: global.ResizeObserver,
    IntersectionObserver: global.IntersectionObserver,
  };
};

// ===== UTILITY MOCK SETUP =====

/**
 * Setup all common mocks for testing
 */
export const setupAllCommonMocks = () => {
  const localStorage = setupLocalStorageMock();
  const { mockIdbKeyval } = setupIndexedDBMocks();
  const fileMocks = setupFileSystemMocks();
  const router = setupRouterMocks();
  const dom = setupDOMMocks();

  return {
    localStorage,
    indexedDB: mockIdbKeyval,
    files: fileMocks,
    router,
    dom,
  };
};

// ===== MOCK RESET UTILITIES =====

/**
 * Reset all mocks to their initial state
 */
export const resetAllMocks = () => {
  vi.clearAllMocks();
  vi.resetAllMocks();
};

/**
 * Clear localStorage and IndexedDB mocks
 */
export const clearStorageMocks = () => {
  if (window.localStorage && typeof window.localStorage.clear === 'function') {
    window.localStorage.clear();
  }
};

// ===== MOCK ASSERTIONS =====

/**
 * Assert that a mock function was called with specific arguments
 */
export const expectMockCall = <T extends (...args: unknown[]) => unknown>(
  mockFn: MockedFunction<T>,
  callIndex: number,
  expectedArgs: Parameters<T>,
) => {
  expect(mockFn).toHaveBeenNthCalledWith(callIndex + 1, ...expectedArgs);
};

/**
 * Assert that a mock function was called a specific number of times
 */
export const expectMockCallCount = <T extends (...args: unknown[]) => unknown>(
  mockFn: MockedFunction<T>,
  expectedCount: number,
) => {
  expect(mockFn).toHaveBeenCalledTimes(expectedCount);
};
