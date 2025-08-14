// Universal Logger for JRVI (CommonJS)
// Usage: const logger = require('./logger'); logger.log('message', { meta })

const logger = {
  getTimestamp: () => new Date().toISOString(),
  log: (message, meta) => {
    const timestamp = logger.getTimestamp();
    console.log(`[JRVI][INFO][${timestamp}]`, message, meta || '');
  },
  info: (message, meta) => {
    const timestamp = logger.getTimestamp();
    console.log(`[JRVI][INFO][${timestamp}]`, message, meta || '');
  },
  error: (message, meta) => {
    const timestamp = logger.getTimestamp();
    console.error(`[JRVI][ERROR][${timestamp}]`, message, meta || '');
  },
  warn: (message, meta) => {
    const timestamp = logger.getTimestamp();
    console.warn(`[JRVI][WARN][${timestamp}]`, message, meta || '');
  },
  audit: (message, meta) => {
    const timestamp = logger.getTimestamp();
    console.log(`[JRVI][AUDIT][${timestamp}]`, message, meta || '');
  },
  security: (message, meta) => {
    const timestamp = logger.getTimestamp();
    console.warn(`[JRVI][SECURITY][${timestamp}]`, message, meta || '');
  }
};

module.exports = logger;
