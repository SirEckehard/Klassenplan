// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ProfessionalLogger } from '../professionalLogger';
import { LogLevel } from '../../logger';
import { clientLogger } from '../logger.client';

// Mock performance.now for consistent testing
const mockPerformanceNow = vi.fn(() => 1000);
Object.defineProperty(global, 'performance', {
  value: { now: mockPerformanceNow },
  writable: true,
});

describe('ProfessionalLogger', () => {
  let logger: ProfessionalLogger;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock clientLogger methods since ProfessionalLogger delegates to it
    vi.spyOn(clientLogger, 'debug').mockImplementation(() => {});
    vi.spyOn(clientLogger, 'info').mockImplementation(() => {});
    vi.spyOn(clientLogger, 'warn').mockImplementation(() => {});
    vi.spyOn(clientLogger, 'error').mockImplementation(() => {});

    logger = new ProfessionalLogger({
      environment: 'test',
      level: LogLevel.DEBUG,
      bufferSize: 4, // Buffer 4 logs before flushing
      flushInterval: 999999, // Very long interval to avoid auto-flush during tests
      sampleRate: 1.0,
      enablePerformanceTracking: true,
    });
  });

  afterEach(() => {
    logger.destroy();
  });

  describe('Basic Logging', () => {
    it('should log messages at appropriate levels', () => {
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      // Force flush to trigger console output via clientLogger
      logger.flush();

      // ProfessionalLogger delegates to clientLogger, so verify those calls
      expect(clientLogger.debug).toHaveBeenCalledWith(
        'Debug message',
        expect.any(Object),
        undefined,
        expect.any(Date),
      );
      expect(clientLogger.info).toHaveBeenCalledWith(
        'Info message',
        expect.any(Object),
        undefined,
        expect.any(Date),
      );
      expect(clientLogger.warn).toHaveBeenCalledWith(
        'Warning message',
        expect.any(Object),
        undefined,
        expect.any(Date),
      );
      expect(clientLogger.error).toHaveBeenCalledWith(
        'Error message',
        expect.any(Object),
        undefined,
        expect.any(Date),
      );
    });

    it('should respect log level filtering', () => {
      const restrictiveLogger = new ProfessionalLogger({
        level: LogLevel.WARN,
        bufferSize: 1,
      });

      restrictiveLogger.debug('Should not appear');
      restrictiveLogger.info('Should not appear');
      restrictiveLogger.warn('Should appear');
      restrictiveLogger.error('Should appear');

      restrictiveLogger.flush();

      expect(clientLogger.debug).not.toHaveBeenCalled();
      expect(clientLogger.info).not.toHaveBeenCalled();
      expect(clientLogger.warn).toHaveBeenCalledWith(
        'Should appear',
        expect.any(Object),
        undefined,
        expect.any(Date),
      );
      expect(clientLogger.error).toHaveBeenCalledWith(
        'Should appear',
        expect.any(Object),
        undefined,
        expect.any(Date),
      );

      restrictiveLogger.destroy();
    });

    it('should include context and source in log entries', () => {
      const context = { userId: 123, action: 'test' };
      const source = 'TestModule';

      logger.info('Test message', context, source);
      logger.flush();

      expect(clientLogger.info).toHaveBeenCalledWith(
        'Test message',
        expect.objectContaining({ userId: 123, action: 'test' }),
        'TestModule',
        expect.any(Date),
      );
    });
  });

  describe('Buffering and Flushing', () => {
    it('should buffer logs and flush when buffer is full', () => {
      // Buffer size is 4, so fourth log should trigger flush
      logger.info('Message 1');
      logger.info('Message 2');
      logger.info('Message 3');

      // No console output yet since buffer isn't full (3 < 4)
      expect(clientLogger.info).not.toHaveBeenCalled();

      logger.info('Message 4'); // Should trigger auto-flush (4 >= 4)

      // Now all 4 buffered logs should be output
      expect(clientLogger.info).toHaveBeenCalledTimes(4);
    });

    it('should flush manually when requested', () => {
      logger.info('Buffered message');
      expect(clientLogger.info).not.toHaveBeenCalled();

      logger.flush();
      expect(clientLogger.info).toHaveBeenCalled();
    });
  });

  describe('Performance Metrics', () => {
    it('should track basic metrics', () => {
      logger.debug('Debug 1');
      logger.info('Info 1');
      logger.info('Info 2');
      logger.warn('Warning 1');
      logger.error('Error 1');

      const metrics = logger.getMetrics();

      expect(metrics.totalLogs).toBe(5);
      expect(metrics.logsByLevel[LogLevel.DEBUG]).toBe(1);
      expect(metrics.logsByLevel[LogLevel.INFO]).toBe(2);
      expect(metrics.logsByLevel[LogLevel.WARN]).toBe(1);
      expect(metrics.logsByLevel[LogLevel.ERROR]).toBe(1);
    });

    it('should track flush count', () => {
      logger.info('Message 1');
      logger.flush();
      logger.info('Message 2');
      logger.flush();

      const metrics = logger.getMetrics();
      expect(metrics.flushCount).toBe(2);
    });
  });

  describe('Sampling', () => {
    it('should drop logs based on sample rate', () => {
      const samplingLogger = new ProfessionalLogger({
        level: LogLevel.DEBUG,
        sampleRate: 0.0, // Drop all logs
        bufferSize: 1,
      });

      samplingLogger.info('Should be dropped');
      samplingLogger.flush();

      const metrics = samplingLogger.getMetrics();
      expect(metrics.droppedLogs).toBe(1);
      expect(metrics.totalLogs).toBe(0);

      samplingLogger.destroy();
    });
  });

  describe('Log History', () => {
    it('should maintain log history', () => {
      logger.info('Historical message 1');
      logger.warn('Historical message 2');

      const history = logger.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].message).toBe('Historical message 1');
      expect(history[1].message).toBe('Historical message 2');
    });

    it('should limit history size', () => {
      const limitedLogger = new ProfessionalLogger({
        maxEntries: 2,
        bufferSize: 1,
      });

      limitedLogger.info('Message 1');
      limitedLogger.info('Message 2');
      limitedLogger.info('Message 3'); // Should remove Message 1

      const history = limitedLogger.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].message).toBe('Message 2');
      expect(history[1].message).toBe('Message 3');

      limitedLogger.destroy();
    });

    it('should return limited history when requested', () => {
      logger.info('Message 1');
      logger.info('Message 2');
      logger.info('Message 3');

      const limitedHistory = logger.getHistory(2);
      expect(limitedHistory).toHaveLength(2);
      expect(limitedHistory[0].message).toBe('Message 2');
      expect(limitedHistory[1].message).toBe('Message 3');
    });
  });

  describe('Configuration Updates', () => {
    it('should allow runtime configuration updates', () => {
      logger.updateConfig({ level: LogLevel.ERROR });

      logger.info('Should not appear');
      logger.error('Should appear');
      logger.flush();

      expect(clientLogger.info).not.toHaveBeenCalled();
      expect(clientLogger.error).toHaveBeenCalledWith(
        'Should appear',
        expect.any(Object),
        undefined,
        expect.any(Date),
      );
    });
  });

  describe('Cleanup', () => {
    it('should clear history and reset metrics', () => {
      logger.info('Message to clear');
      const initialMetrics = logger.getMetrics();
      expect(initialMetrics.totalLogs).toBe(1);

      logger.clear();

      const clearedMetrics = logger.getMetrics();
      expect(clearedMetrics.totalLogs).toBe(0);
      expect(logger.getHistory()).toHaveLength(0);
    });
  });

  describe('Performance Tracking', () => {
    it('should support performance timing', () => {
      const consoleSpy = vi.spyOn(console, 'time').mockImplementation(() => {});
      const consoleEndSpy = vi
        .spyOn(console, 'timeEnd')
        .mockImplementation(() => {});

      logger.time('test-operation');
      logger.timeEnd('test-operation');

      expect(consoleSpy).toHaveBeenCalledWith('test-operation');
      expect(consoleEndSpy).toHaveBeenCalledWith('test-operation');
    });
  });
});
