"use strict";
// Universal Logger for JRVI
// Usage: import logger from './logger'; logger.log('message', { meta })
Object.defineProperty(exports, "__esModule", { value: true });
const logger = {
    getTimestamp: () => new Date().toISOString(),
    log: (message, meta) => {
        const timestamp = logger.getTimestamp();
        // Extend with file, function, user, etc. as needed
        console.log(`[JRVI][${timestamp}]`, message, meta || '');
    },
    error: (message, meta) => {
        const timestamp = logger.getTimestamp();
        console.error(`[JRVI][ERROR][${timestamp}]`, message, meta || '');
    },
    warn: (message, meta) => {
        const timestamp = logger.getTimestamp();
        console.warn(`[JRVI][WARN][${timestamp}]`, message, meta || '');
    }
};
exports.default = logger;
