/**
 * Universal Logging Utility
 * Provides timestamp, origin, UUID tracking for all JRVI operations
 */

export interface LogEntry {
  id: string;
  timestamp: Date;
  origin: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  source?: string;
  lineage?: string[];
  tags?: string[];
  brandAffinity?: string[];
  sessionId?: string;
  requestId?: string;
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  AUDIT = 'audit',
  SECURITY = 'security'
}

export interface LoggerConfig {
  defaultOrigin: string;
  sessionId?: string;
  enableConsole: boolean;
  enableAudit: boolean;
  enableSecurity: boolean;
  maxRetention: number; // in days
  auditCallback?: (entry: LogEntry) => void;
  securityCallback?: (entry: LogEntry) => void;
}

class UniversalLogger {
  private logs: LogEntry[] = [];
  private config: LoggerConfig;
  private sessionId: string;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      defaultOrigin: 'jrvi-system',
      enableConsole: true,
      enableAudit: true,
      enableSecurity: true,
      maxRetention: 30,
      ...config
    };
    
    this.sessionId = config.sessionId || this.generateId();
    this.startCleanupProcess();
  }

  /**
   * Generate a simple UUID-like identifier
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Create a new log entry with universal tracking
   */
  log(
    level: LogLevel,
    message: string,
    origin?: string,
    context?: Record<string, any>,
    options?: {
      source?: string;
      lineage?: string[];
      tags?: string[];
      brandAffinity?: string[];
      requestId?: string;
    }
  ): LogEntry {
    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      origin: origin || this.config.defaultOrigin,
      level,
      message,
      context,
      sessionId: this.sessionId,
      ...options
    };

    // Store log entry
    this.logs.push(entry);

    // Console output if enabled
    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }

    // Audit callback
    if (this.config.enableAudit && level === LogLevel.AUDIT && this.config.auditCallback) {
      this.config.auditCallback(entry);
    }

    // Security callback
    if (this.config.enableSecurity && level === LogLevel.SECURITY && this.config.securityCallback) {
      this.config.securityCallback(entry);
    }

    return entry;
  }

  /**
   * Convenience methods for different log levels
   */
  debug(message: string, origin?: string, context?: Record<string, any>, options?: any): LogEntry {
    return this.log(LogLevel.DEBUG, message, origin, context, options);
  }

  info(message: string, origin?: string, context?: Record<string, any>, options?: any): LogEntry {
    return this.log(LogLevel.INFO, message, origin, context, options);
  }

  warn(message: string, origin?: string, context?: Record<string, any>, options?: any): LogEntry {
    return this.log(LogLevel.WARN, message, origin, context, options);
  }

  error(message: string, origin?: string, context?: Record<string, any>, options?: any): LogEntry {
    return this.log(LogLevel.ERROR, message, origin, context, options);
  }

  audit(message: string, origin?: string, context?: Record<string, any>, options?: any): LogEntry {
    return this.log(LogLevel.AUDIT, message, origin, context, options);
  }

  security(message: string, origin?: string, context?: Record<string, any>, options?: any): LogEntry {
    return this.log(LogLevel.SECURITY, message, origin, context, options);
  }

  /**
   * Create a child logger with lineage tracking
   */
  createChildLogger(origin: string, parentLogId?: string): UniversalLogger {
    const childLogger = new UniversalLogger({
      ...this.config,
      defaultOrigin: origin,
      sessionId: this.sessionId
    });

    if (parentLogId) {
      // Log the creation of child logger with lineage
      this.audit(`Child logger created: ${origin}`, this.config.defaultOrigin, {
        childOrigin: origin,
        parentLogId
      }, {
        lineage: [parentLogId],
        tags: ['logger-creation', 'lineage']
      });
    }

    return childLogger;
  }

  /**
   * Query logs with various filters
   */
  query(options: {
    level?: LogLevel;
    origin?: string;
    timeRange?: { start: Date; end: Date };
    tags?: string[];
    brandAffinity?: string[];
    limit?: number;
    search?: string;
  } = {}): LogEntry[] {
    let filtered = [...this.logs];

    if (options.level) {
      filtered = filtered.filter(log => log.level === options.level);
    }

    if (options.origin) {
      filtered = filtered.filter(log => log.origin === options.origin);
    }

    if (options.timeRange) {
      filtered = filtered.filter(log => 
        log.timestamp >= options.timeRange!.start && 
        log.timestamp <= options.timeRange!.end
      );
    }

    if (options.tags && options.tags.length > 0) {
      filtered = filtered.filter(log => 
        log.tags && options.tags!.some(tag => log.tags!.includes(tag))
      );
    }

    if (options.brandAffinity && options.brandAffinity.length > 0) {
      filtered = filtered.filter(log => 
        log.brandAffinity && options.brandAffinity!.some(brand => log.brandAffinity!.includes(brand))
      );
    }

    if (options.search) {
      const searchLower = options.search.toLowerCase();
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        log.origin.toLowerCase().includes(searchLower)
      );
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  /**
   * Get audit trail for compliance
   */
  getAuditTrail(timeRange?: { start: Date; end: Date }): LogEntry[] {
    return this.query({
      level: LogLevel.AUDIT,
      timeRange
    });
  }

  /**
   * Get security logs
   */
  getSecurityLogs(timeRange?: { start: Date; end: Date }): LogEntry[] {
    return this.query({
      level: LogLevel.SECURITY,
      timeRange
    });
  }

  /**
   * Export logs for external analysis
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    } else {
      // CSV format
      const headers = ['id', 'timestamp', 'origin', 'level', 'message', 'context'];
      const csvRows = [headers.join(',')];
      
      this.logs.forEach(log => {
        const row = [
          log.id,
          log.timestamp.toISOString(),
          log.origin,
          log.level,
          `"${log.message.replace(/"/g, '""')}"`,
          log.context ? `"${JSON.stringify(log.context).replace(/"/g, '""')}"` : ''
        ];
        csvRows.push(row.join(','));
      });
      
      return csvRows.join('\n');
    }
  }

  /**
   * Clear logs (with optional filter)
   */
  clearLogs(filter?: { level?: LogLevel; olderThan?: Date }): number {
    const initialCount = this.logs.length;
    
    if (!filter) {
      this.logs = [];
      return initialCount;
    }

    this.logs = this.logs.filter(log => {
      if (filter.level && log.level === filter.level) return false;
      if (filter.olderThan && log.timestamp < filter.olderThan) return false;
      return true;
    });

    return initialCount - this.logs.length;
  }

  /**
   * Get logging statistics
   */
  getStats(): {
    totalLogs: number;
    byLevel: Record<LogLevel, number>;
    byOrigin: Record<string, number>;
    sessionId: string;
    oldestLog?: Date;
    newestLog?: Date;
  } {
    const byLevel = Object.values(LogLevel).reduce((acc, level) => {
      acc[level] = this.logs.filter(log => log.level === level).length;
      return acc;
    }, {} as Record<LogLevel, number>);

    const byOrigin = this.logs.reduce((acc, log) => {
      acc[log.origin] = (acc[log.origin] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const timestamps = this.logs.map(log => log.timestamp);
    const oldestLog = timestamps.length > 0 ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : undefined;
    const newestLog = timestamps.length > 0 ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : undefined;

    return {
      totalLogs: this.logs.length,
      byLevel,
      byOrigin,
      sessionId: this.sessionId,
      oldestLog,
      newestLog
    };
  }

  /**
   * Output log entry to console with formatting
   */
  private outputToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const prefix = `[${timestamp}] [${entry.origin}] [${entry.id.slice(0, 8)}]`;
    
    const logMessage = `${prefix} ${entry.message}`;
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, entry.context);
        break;
      case LogLevel.INFO:
        console.info(logMessage, entry.context);
        break;
      case LogLevel.WARN:
        console.warn(logMessage, entry.context);
        break;
      case LogLevel.ERROR:
        console.error(logMessage, entry.context);
        break;
      case LogLevel.AUDIT:
        console.info(`🔍 AUDIT: ${logMessage}`, entry.context);
        break;
      case LogLevel.SECURITY:
        console.warn(`🔒 SECURITY: ${logMessage}`, entry.context);
        break;
    }
  }

  /**
   * Start automatic cleanup process for old logs
   */
  private startCleanupProcess(): void {
    setInterval(() => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.maxRetention);
      
      const removedCount = this.clearLogs({ olderThan: cutoffDate });
      
      if (removedCount > 0) {
        this.info(`Cleaned up ${removedCount} old log entries`, 'logger-cleanup');
      }
    }, 24 * 60 * 60 * 1000); // Run daily
  }
}

// Singleton instance for global use
export const logger = new UniversalLogger({
  defaultOrigin: 'jrvi-core',
  sessionId: undefined, // Will be auto-generated
  enableConsole: true,
  enableAudit: true,
  enableSecurity: true
});

// Factory function for creating specialized loggers
export function createLogger(origin: string, config?: Partial<LoggerConfig>): UniversalLogger {
  return new UniversalLogger({
    defaultOrigin: origin,
    ...config
  });
}

// Helper function for creating request-scoped loggers
export function createRequestLogger(requestId: string, origin: string): UniversalLogger {
  return new UniversalLogger({
    defaultOrigin: origin,
    sessionId: logger.getStats().sessionId // Use same session but track request
  });
}

export default logger;