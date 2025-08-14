"use strict";
/**
 * Universal Logging Utility
 * Provides timestamp, origin, UUID tracking for all JRVI operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.LogLevel = void 0;
exports.createLogger = createLogger;
exports.createRequestLogger = createRequestLogger;
var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "debug";
    LogLevel["INFO"] = "info";
    LogLevel["WARN"] = "warn";
    LogLevel["ERROR"] = "error";
    LogLevel["AUDIT"] = "audit";
    LogLevel["SECURITY"] = "security";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class UniversalLogger {
    constructor(config = {}) {
        this.logs = [];
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
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }
    /**
     * Create a new log entry with universal tracking
     */
    log(level, message, origin, context, options) {
        const entry = {
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
    debug(message, origin, context, options) {
        return this.log(LogLevel.DEBUG, message, origin, context, options);
    }
    info(message, origin, context, options) {
        return this.log(LogLevel.INFO, message, origin, context, options);
    }
    warn(message, origin, context, options) {
        return this.log(LogLevel.WARN, message, origin, context, options);
    }
    error(message, origin, context, options) {
        return this.log(LogLevel.ERROR, message, origin, context, options);
    }
    audit(message, origin, context, options) {
        return this.log(LogLevel.AUDIT, message, origin, context, options);
    }
    security(message, origin, context, options) {
        return this.log(LogLevel.SECURITY, message, origin, context, options);
    }
    /**
     * Create a child logger with lineage tracking
     */
    createChildLogger(origin, parentLogId) {
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
    query(options = {}) {
        let filtered = [...this.logs];
        if (options.level) {
            filtered = filtered.filter(log => log.level === options.level);
        }
        if (options.origin) {
            filtered = filtered.filter(log => log.origin === options.origin);
        }
        if (options.timeRange) {
            filtered = filtered.filter(log => log.timestamp >= options.timeRange.start &&
                log.timestamp <= options.timeRange.end);
        }
        if (options.tags && options.tags.length > 0) {
            filtered = filtered.filter(log => log.tags && options.tags.some(tag => log.tags.includes(tag)));
        }
        if (options.brandAffinity && options.brandAffinity.length > 0) {
            filtered = filtered.filter(log => log.brandAffinity && options.brandAffinity.some(brand => log.brandAffinity.includes(brand)));
        }
        if (options.search) {
            const searchLower = options.search.toLowerCase();
            filtered = filtered.filter(log => log.message.toLowerCase().includes(searchLower) ||
                log.origin.toLowerCase().includes(searchLower));
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
    getAuditTrail(timeRange) {
        return this.query({
            level: LogLevel.AUDIT,
            timeRange
        });
    }
    /**
     * Get security logs
     */
    getSecurityLogs(timeRange) {
        return this.query({
            level: LogLevel.SECURITY,
            timeRange
        });
    }
    /**
     * Export logs for external analysis
     */
    exportLogs(format = 'json') {
        if (format === 'json') {
            return JSON.stringify(this.logs, null, 2);
        }
        else {
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
    clearLogs(filter) {
        const initialCount = this.logs.length;
        if (!filter) {
            this.logs = [];
            return initialCount;
        }
        this.logs = this.logs.filter(log => {
            if (filter.level && log.level === filter.level)
                return false;
            if (filter.olderThan && log.timestamp < filter.olderThan)
                return false;
            return true;
        });
        return initialCount - this.logs.length;
    }
    /**
     * Get logging statistics
     */
    getStats() {
        const byLevel = Object.values(LogLevel).reduce((acc, level) => {
            acc[level] = this.logs.filter(log => log.level === level).length;
            return acc;
        }, {});
        const byOrigin = this.logs.reduce((acc, log) => {
            acc[log.origin] = (acc[log.origin] || 0) + 1;
            return acc;
        }, {});
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
    outputToConsole(entry) {
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
    startCleanupProcess() {
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
exports.logger = new UniversalLogger({
    defaultOrigin: 'jrvi-core',
    sessionId: undefined, // Will be auto-generated
    enableConsole: true,
    enableAudit: true,
    enableSecurity: true
});
// Factory function for creating specialized loggers
function createLogger(origin, config) {
    return new UniversalLogger({
        defaultOrigin: origin,
        ...config
    });
}
// Helper function for creating request-scoped loggers
function createRequestLogger(requestId, origin) {
    return new UniversalLogger({
        defaultOrigin: origin,
        sessionId: exports.logger.getStats().sessionId // Use same session but track request
    });
}
exports.default = exports.logger;
