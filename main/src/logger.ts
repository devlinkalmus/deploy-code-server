// Universal Logger for JRVI
// Usage: import logger from './logger'; logger.log('message', { meta })

const logger = {
  getTimestamp: (): string => new Date().toISOString(),
  log: (message: string, meta?: Record<string, any>) => {
    const timestamp = logger.getTimestamp();
    // Extend with file, function, user, etc. as needed
    console.log(`[JRVI][${timestamp}]`, message, meta || '');
  },
  error: (message: string, meta?: Record<string, any>) => {
    const timestamp = logger.getTimestamp();
    console.error(`[JRVI][ERROR][${timestamp}]`, message, meta || '');
  },
  warn: (message: string, meta?: Record<string, any>) => {
    const timestamp = logger.getTimestamp();
    console.warn(`[JRVI][WARN][${timestamp}]`, message, meta || '');
  },
  // New method for production logging (e.g., to file or external service)
  prodLog: (level: 'log' | 'error' | 'warn', message: string, meta?: Record<string, any>) => {
    const timestamp = logger.getTimestamp();
    // Placeholder: extend to write to file, external logging service, etc.
    // For now, just console with level prefix
    switch (level) {
      case 'log':
        console.log(`[JRVI][PROD][${timestamp}]`, message, meta || '');
        break;
      case 'error':
        console.error(`[JRVI][PROD][ERROR][${timestamp}]`, message, meta || '');
        break;
      case 'warn':
        console.warn(`[JRVI][PROD][WARN][${timestamp}]`, message, meta || '');
        break;
    }
  }
};

export default logger;
