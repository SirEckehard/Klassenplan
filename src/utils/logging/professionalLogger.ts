import { clientLogger } from './logger.client';
import { LogLevel, type LogEntry } from './loggerCore';

export interface LoggerConfig {
  /** Environment configuration */
  environment: 'development' | 'production' | 'test';
  /** Maximum log level to process */
  level: LogLevel;
  /** Enable debug mode */
  debug: boolean;
  /** Buffer size for batched logging */
  bufferSize: number;
  /** Flush interval in milliseconds */
  flushInterval: number;
  /** Sample rate for high-volume logs (0.0 - 1.0) */
  sampleRate: number;
  /** Remote logging endpoint (optional) */
  remoteEndpoint?: string;
  /** Maximum entries to keep in memory */
  maxEntries: number;
  /** Enable performance tracking */
  enablePerformanceTracking: boolean;
}

export interface PerformanceMetrics {
  /** Total logs processed */
  totalLogs: number;
  /** Logs by level */
  logsByLevel: Record<LogLevel, number>;
  /** Average processing time */
  avgProcessingTime: number;
  /** Buffer flush count */
  flushCount: number;
  /** Dropped logs (due to sampling) */
  droppedLogs: number;
}

export class ProfessionalLogger {
  private config: LoggerConfig;
  private logBuffer: LogEntry[] = [];
  private logHistory: LogEntry[] = [];
  private flushTimer?: number;
  private metrics!: PerformanceMetrics; // Initialized in constructor
  private sessionId: string;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      environment: this.detectEnvironment(),
      level: this.getDefaultLogLevel(),
      debug: this.getDebugMode(),
      bufferSize: 50,
      flushInterval: 5000, // 5 seconds
      sampleRate: 1.0, // No sampling by default
      maxEntries: 1000,
      enablePerformanceTracking: true,
      ...config,
    };

    this.sessionId = this.generateSessionId();
    this.initializeMetrics();
    this.startFlushTimer();
  }

  private detectEnvironment(): 'development' | 'production' | 'test' {
    if (typeof window === 'undefined') return 'test';
    if (import.meta.env.DEV) return 'development';
    return 'production';
  }

  private getDefaultLogLevel(): LogLevel {
    const env = this.detectEnvironment();
    switch (env) {
      case 'development':
        return LogLevel.DEBUG;
      case 'production':
        return LogLevel.WARN;
      case 'test':
        return LogLevel.ERROR;
      default:
        return LogLevel.INFO;
    }
  }

  private getDebugMode(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('debug') === 'true';
    } catch {
      return false;
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private initializeMetrics(): void {
    this.metrics = {
      totalLogs: 0,
      logsByLevel: {
        [LogLevel.DEBUG]: 0,
        [LogLevel.INFO]: 0,
        [LogLevel.WARN]: 0,
        [LogLevel.ERROR]: 0,
        [LogLevel.SILENT]: 0,
      },
      avgProcessingTime: 0,
      flushCount: 0,
      droppedLogs: 0,
    };
  }

  private startFlushTimer(): void {
    if (typeof window === 'undefined') return;

    this.flushTimer = window.setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private shouldSample(): boolean {
    return Math.random() <= this.config.sampleRate;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    source?: string,
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date(),
      context: {
        ...context,
        sessionId: this.sessionId,
        environment: this.config.environment,
        userAgent:
          typeof window !== 'undefined'
            ? window.navigator.userAgent
            : 'unknown',
      },
      source,
    };
  }

  private processLog(entry: LogEntry): void {
    const startTime = performance.now();

    // Update metrics
    this.metrics.totalLogs++;
    this.metrics.logsByLevel[entry.level]++;

    // Add to buffer
    this.logBuffer.push(entry);

    // Add to history (with limit)
    this.logHistory.push(entry);
    if (this.logHistory.length > this.config.maxEntries) {
      this.logHistory.shift();
    }

    // Auto-flush if buffer is full
    if (this.logBuffer.length >= this.config.bufferSize) {
      this.flush();
    }

    // Update performance metrics
    if (this.config.enablePerformanceTracking) {
      const processingTime = performance.now() - startTime;
      this.metrics.avgProcessingTime =
        (this.metrics.avgProcessingTime * (this.metrics.totalLogs - 1) +
          processingTime) /
        this.metrics.totalLogs;
    }
  }

  private outputToConsole(entry: LogEntry): void {
    switch (entry.level) {
      case LogLevel.DEBUG:
        clientLogger.debug(
          entry.message,
          entry.context,
          entry.source,
          entry.timestamp,
        );
        break;
      case LogLevel.INFO:
        clientLogger.info(
          entry.message,
          entry.context,
          entry.source,
          entry.timestamp,
        );
        break;
      case LogLevel.WARN:
        clientLogger.warn(
          entry.message,
          entry.context,
          entry.source,
          entry.timestamp,
        );
        break;
      case LogLevel.ERROR:
        clientLogger.error(
          entry.message,
          entry.context,
          entry.source,
          entry.timestamp,
        );
        break;
    }
  }

  private async sendToRemote(entries: LogEntry[]): Promise<void> {
    if (!this.config.remoteEndpoint) return;

    try {
      const payload = {
        sessionId: this.sessionId,
        environment: this.config.environment,
        entries: entries.map((entry) => ({
          ...entry,
          timestamp: entry.timestamp.toISOString(),
        })),
        metrics: this.metrics,
      };

      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      // Fallback to client log for remote logging errors
      clientLogger.error('Failed to send logs to remote endpoint:', { error });
    }
  }

  /**
   * Flush buffered logs to console and remote endpoint
   */
  public flush(): void {
    if (this.logBuffer.length === 0) return;

    const entries = [...this.logBuffer];
    this.logBuffer = [];
    this.metrics.flushCount++;

    // Output to console
    entries.forEach((entry) => this.outputToConsole(entry));

    // Send to remote endpoint if configured
    if (this.config.remoteEndpoint) {
      this.sendToRemote(entries);
    }
  }

  /**
   * Log a message at the specified level
   */
  public log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    source?: string,
  ): void {
    if (!this.shouldLog(level)) return;

    if (!this.shouldSample()) {
      this.metrics.droppedLogs++;
      return;
    }

    const entry = this.createLogEntry(level, message, context, source);
    this.processLog(entry);
  }

  /**
   * Debug level logging
   */
  public debug(
    message: string,
    context?: Record<string, unknown>,
    source?: string,
  ): void {
    this.log(LogLevel.DEBUG, message, context, source);
  }

  /**
   * Info level logging
   */
  public info(
    message: string,
    context?: Record<string, unknown>,
    source?: string,
  ): void {
    this.log(LogLevel.INFO, message, context, source);
  }

  /**
   * Warning level logging
   */
  public warn(
    message: string,
    context?: Record<string, unknown>,
    source?: string,
  ): void {
    this.log(LogLevel.WARN, message, context, source);
  }

  /**
   * Error level logging
   */
  public error(
    message: string,
    context?: Record<string, unknown>,
    source?: string,
  ): void {
    this.log(LogLevel.ERROR, message, context, source);
  }

  /**
   * Log performance timing
   */
  public time(label: string): void {
    if (this.config.enablePerformanceTracking) {
      console.time(label);
    }
  }

  /**
   * End performance timing
   */
  public timeEnd(label: string): void {
    if (this.config.enablePerformanceTracking) {
      console.timeEnd(label);
    }
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent log history
   */
  public getHistory(count?: number): LogEntry[] {
    const entries = this.logHistory.slice();
    return count ? entries.slice(-count) : entries;
  }

  /**
   * Update logger configuration
   */
  public updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Clear log history and reset metrics
   */
  public clear(): void {
    this.logHistory = [];
    this.logBuffer = [];
    this.initializeMetrics();
  }

  /**
   * Cleanup and flush remaining logs
   */
  public destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

// Create singleton instance
export const professionalLogger = new ProfessionalLogger();
