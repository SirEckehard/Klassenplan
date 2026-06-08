import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  logger,
  LogLevel,
  logDebug,
  logInfo,
  logWarn,
  logError,
} from '../logger';

// Mock console methods
const mockConsole = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock import.meta.env
vi.mock('import.meta.env', () => ({
  DEV: true,
}));

describe('Logger', () => {
  beforeEach(() => {
    // Replace console methods with mocks
    global.console.debug = mockConsole.debug;
    global.console.info = mockConsole.info;
    global.console.warn = mockConsole.warn;
    global.console.error = mockConsole.error;

    // Clear all mocks
    vi.clearAllMocks();

    // Clear localStorage
    localStorage.clear();

    // Reset logger to default state
    logger.setLevel(LogLevel.INFO);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Log Levels', () => {
    it('should respect log level filtering', () => {
      logger.setLevel(LogLevel.WARN);

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalledTimes(1);
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
    });

    it('should log all levels when set to DEBUG', () => {
      logger.setLevel(LogLevel.DEBUG);

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(mockConsole.debug).toHaveBeenCalledTimes(1);
      expect(mockConsole.info).toHaveBeenCalledTimes(1);
      expect(mockConsole.warn).toHaveBeenCalledTimes(1);
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
    });

    it('should silence all logs when set to SILENT', () => {
      logger.setLevel(LogLevel.SILENT);

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.warn).not.toHaveBeenCalled();
      expect(mockConsole.error).not.toHaveBeenCalled();
    });
  });

  describe('Message Formatting', () => {
    it('should format messages with timestamp and level', () => {
      logger.setLevel(LogLevel.INFO);
      logger.info('test message');

      expect(mockConsole.info).toHaveBeenCalledTimes(1);
      const call = mockConsole.info.mock.calls[0][0];
      expect(call).toMatch(
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z INFO test message/,
      );
    });

    it('should include context when provided', () => {
      logger.setLevel(LogLevel.INFO);
      logger.info('test message', { userId: '123', action: 'login' });

      expect(mockConsole.info).toHaveBeenCalledTimes(1);
      const call = mockConsole.info.mock.calls[0][0];
      expect(call).toContain('test message');
      expect(call).toContain('{"userId":"123","action":"login"}');
    });

    it('should include source when provided', () => {
      logger.setLevel(LogLevel.INFO);
      logger.info('test message', undefined, 'AuthService');

      expect(mockConsole.info).toHaveBeenCalledTimes(1);
      const call = mockConsole.info.mock.calls[0][0];
      expect(call).toContain('[AuthService]');
      expect(call).toContain('test message');
    });

    it('should include both context and source', () => {
      logger.setLevel(LogLevel.INFO);
      logger.info('test message', { userId: '123' }, 'AuthService');

      expect(mockConsole.info).toHaveBeenCalledTimes(1);
      const call = mockConsole.info.mock.calls[0][0];
      expect(call).toContain('[AuthService]');
      expect(call).toContain('test message');
      expect(call).toContain('{"userId":"123"}');
    });
  });

  describe('Debug Mode Control', () => {
    it('should enable debug mode via localStorage', () => {
      logger.enableDebug();
      expect(localStorage.getItem('debug')).toBe('true');
      expect(logger.getLevel()).toBe(LogLevel.DEBUG);
    });

    it('should disable debug mode via localStorage', () => {
      logger.enableDebug();
      logger.disableDebug();
      expect(localStorage.getItem('debug')).toBeNull();
      expect(logger.getLevel()).toBe(LogLevel.INFO); // Default for dev
    });
  });

  describe('Convenience Functions', () => {
    beforeEach(() => {
      logger.setLevel(LogLevel.DEBUG);
    });

    it('should work with logDebug function', () => {
      logDebug('debug message', { test: true }, 'TestSource');
      expect(mockConsole.debug).toHaveBeenCalledTimes(1);
    });

    it('should work with logInfo function', () => {
      logInfo('info message', { test: true }, 'TestSource');
      expect(mockConsole.info).toHaveBeenCalledTimes(1);
    });

    it('should work with logWarn function', () => {
      logWarn('warn message', { test: true }, 'TestSource');
      expect(mockConsole.warn).toHaveBeenCalledTimes(1);
    });

    it('should work with logError function', () => {
      logError('error message', { test: true }, 'TestSource');
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('Environment-based Configuration', () => {
    it('should use appropriate console methods for each level', () => {
      logger.setLevel(LogLevel.DEBUG);

      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('DEBUG debug'),
      );
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('INFO info'),
      );
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('WARN warn'),
      );
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR error'),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle circular references in context gracefully', () => {
      const circularObj: Record<string, unknown> = { name: 'test' };
      circularObj.self = circularObj;

      expect(() => {
        logger.info('test message', circularObj);
      }).toThrow(); // JSON.stringify will throw on circular references

      // Logger should still function after error
      logger.info('normal message');
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('normal message'),
      );
    });
  });
});
