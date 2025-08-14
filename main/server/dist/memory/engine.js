"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryEngine = void 0;
const logger_1 = __importDefault(require("../src/logger"));
const kernel_1 = require("../src/kernel");
class MemoryEngine {
    constructor() {
        this.memory = [];
        this.maxSTMSize = 50; // Short-term memory limit
        this.maxLTMSize = 500; // Long-term memory limit
    }
    // Add memory with automatic type classification
    addMemory(content, tags, importance = 50) {
        // Kernel enforcement: ensure tags and compliance
        try {
            (0, kernel_1.enforceKernel)({ persona: 'default' });
        }
        catch (err) {
            logger_1.default.error('Kernel enforcement failed in memory engine', { err, content, tags });
            throw new Error('Kernel enforcement failed: missing or invalid tags');
        }
        const memory = {
            id: this.generateId(),
            content,
            tags,
            importance,
            type: importance >= 70 ? 'LTM' : 'STM',
            timestamp: new Date(),
            decay: importance < 30 ? 0.1 : 0.05 // Higher decay for low importance
        };
        this.memory.push(memory);
        this.manageMemorycapacity();
        logger_1.default.log('Memory added', { id: memory.id, contentLength: memory.content.length, tags: memory.tags });
        return memory;
    }
    // Retrieve memories by tags
    getMemoriesByTags(tags, limit = 10) {
        const result = this.memory
            .filter(m => tags.some(tag => m.tags.includes(tag)))
            .sort((a, b) => this.calculateRelevance(b) - this.calculateRelevance(a))
            .slice(0, limit);
        logger_1.default.log('Memories retrieved by tags', { tags, count: result.length });
        return result;
    }
    // Get recent memories
    getRecentMemories(minutesBack = 60, limit = 20) {
        const cutoff = new Date(Date.now() - minutesBack * 60 * 1000);
        const result = this.memory
            .filter(m => m.timestamp > cutoff)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);
        logger_1.default.log('Recent memories retrieved', { minutesBack, limit, result });
        return result;
    }
    // Search memories by content
    searchMemories(query, limit = 10) {
        const queryLower = query.toLowerCase();
        const result = this.memory
            .filter(m => m.content.toLowerCase().includes(queryLower) ||
            m.tags.some(tag => tag.toLowerCase().includes(queryLower)))
            .sort((a, b) => this.calculateRelevance(b) - this.calculateRelevance(a))
            .slice(0, limit);
        logger_1.default.log('Memories searched', { query, limit, result });
        return result;
    }
    // Get all memories for context
    getAllMemories() {
        const result = [...this.memory].sort((a, b) => this.calculateRelevance(b) - this.calculateRelevance(a));
        logger_1.default.log('All memories retrieved', { result });
        return result;
    }
    // Calculate memory relevance (importance + recency - decay)
    calculateRelevance(memory) {
        const ageHours = (Date.now() - memory.timestamp.getTime()) / (1000 * 60 * 60);
        const decayFactor = Math.exp(-(memory.decay || 0.05) * ageHours);
        return memory.importance * decayFactor;
    }
    // Manage memory capacity and cleanup
    manageMemorycapacity() {
        // Separate STM and LTM
        const stmMemories = this.memory.filter(m => m.type === 'STM');
        const ltmMemories = this.memory.filter(m => m.type === 'LTM');
        // Clean up STM if over capacity
        if (stmMemories.length > this.maxSTMSize) {
            const sortedSTM = stmMemories.sort((a, b) => this.calculateRelevance(a) - this.calculateRelevance(b));
            const toRemove = sortedSTM.slice(0, stmMemories.length - this.maxSTMSize);
            this.memory = this.memory.filter(m => !toRemove.includes(m));
        }
        // Clean up LTM if over capacity (keep most important)
        if (ltmMemories.length > this.maxLTMSize) {
            const sortedLTM = ltmMemories.sort((a, b) => this.calculateRelevance(a) - this.calculateRelevance(b));
            const toRemove = sortedLTM.slice(0, ltmMemories.length - this.maxLTMSize);
            this.memory = this.memory.filter(m => !toRemove.includes(m));
        }
    }
    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    // Get memory statistics
    getStats() {
        const stmCount = this.memory.filter(m => m.type === 'STM').length;
        const ltmCount = this.memory.filter(m => m.type === 'LTM').length;
        const avgImportance = this.memory.reduce((sum, m) => sum + m.importance, 0) / this.memory.length || 0;
        const recentCount = this.getRecentMemories(15).length; // Last 15 minutes
        return {
            total: this.memory.length,
            stm: stmCount,
            ltm: ltmCount,
            avgImportance: Math.round(avgImportance),
            recentActivity: recentCount
        };
    }
    // Clear all memories (for testing)
    clearAll() {
        this.memory = [];
        logger_1.default.warn('All memories cleared');
    }
}
// Singleton instance
exports.memoryEngine = new MemoryEngine();
exports.default = exports.memoryEngine;
