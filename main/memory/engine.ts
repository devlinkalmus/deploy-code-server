import { Memory } from '../logic/types';
import logger from '../src/logger';
import { enforceKernel } from '../src/kernel';

class MemoryEngine {
  private memory: Memory[] = [];
  private maxSTMSize = 50; // Short-term memory limit
  private maxLTMSize = 500; // Long-term memory limit
  constructor() {}

  // Add memory with automatic type classification
  addMemory(content: string, tags: string[], importance: number = 50): Memory {
    // Kernel enforcement: ensure persona and compliance
    try {
      enforceKernel({ persona: 'default' });
    } catch (err) {
      logger.error('Kernel enforcement failed in memory engine', { err, content, tags });
      throw new Error('Kernel enforcement failed: missing or invalid persona');
    }

    const memory: Memory = {
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
    logger.log('Memory added', { id: memory.id, contentLength: memory.content.length, tags: memory.tags });
    return memory;
  }

  // Retrieve memories by tags
  getMemoriesByTags(tags: string[], limit: number = 10): Memory[] {
    const result = this.memory
      .filter(m => tags.some(tag => m.tags.includes(tag)))
      .sort((a, b) => this.calculateRelevance(b) - this.calculateRelevance(a))
      .slice(0, limit);
    logger.log('Memories retrieved by tags', { tags, count: result.length });
    return result;
  }

  // Get recent memories
  getRecentMemories(minutesBack: number = 60, limit: number = 20): Memory[] {
    const cutoff = new Date(Date.now() - minutesBack * 60 * 1000);
    const result = this.memory
      .filter(m => m.timestamp > cutoff)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
    logger.log('Recent memories retrieved', { minutesBack, limit, result });
    return result;
  }

  // Search memories by content
  searchMemories(query: string, limit: number = 10): Memory[] {
    const queryLower = query.toLowerCase();
    const result = this.memory
      .filter(m => 
        m.content.toLowerCase().includes(queryLower) ||
        m.tags.some(tag => tag.toLowerCase().includes(queryLower))
      )
      .sort((a, b) => this.calculateRelevance(b) - this.calculateRelevance(a))
      .slice(0, limit);
    logger.log('Memories searched', { query, limit, result });
    return result;
  }

  // Get all memories for context
  getAllMemories(): Memory[] {
    const result = [...this.memory].sort((a, b) => 
      this.calculateRelevance(b) - this.calculateRelevance(a)
    );
    logger.log('All memories retrieved', { result });
    return result;
  }

  // Calculate memory relevance (importance + recency - decay)
  private calculateRelevance(memory: Memory): number {
    const ageHours = (Date.now() - memory.timestamp.getTime()) / (1000 * 60 * 60);
    const decayFactor = Math.exp(-(memory.decay || 0.05) * ageHours);
    return memory.importance * decayFactor;
  }

  // Manage memory capacity and cleanup
  private manageMemorycapacity(): void {
    // Separate STM and LTM
    const stmMemories = this.memory.filter(m => m.type === 'STM');
    const ltmMemories = this.memory.filter(m => m.type === 'LTM');

    // Clean up STM if over capacity
    if (stmMemories.length > this.maxSTMSize) {
      const sortedSTM = stmMemories.sort((a, b) => 
        this.calculateRelevance(a) - this.calculateRelevance(b)
      );
      const toRemove = sortedSTM.slice(0, stmMemories.length - this.maxSTMSize);
      this.memory = this.memory.filter(m => !toRemove.includes(m));
    }

    // Clean up LTM if over capacity (keep most important)
    if (ltmMemories.length > this.maxLTMSize) {
      const sortedLTM = ltmMemories.sort((a, b) => 
        this.calculateRelevance(a) - this.calculateRelevance(b)
      );
      const toRemove = sortedLTM.slice(0, ltmMemories.length - this.maxLTMSize);
      this.memory = this.memory.filter(m => !toRemove.includes(m));
    }
  }

  // Generate unique ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Get memory statistics
  getStats(): {
    total: number;
    stm: number;
    ltm: number;
    avgImportance: number;
    recentActivity: number;
  } {
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

  // Get retention logs from memory for reporting by time window
  getRetentionLogs(timeWindow?: { start: Date; end: Date }, tags?: string[]): Array<{
    id: string;
    timestamp: Date;
    type: 'memory';
    event: string;
    tags: string[];
    success: boolean;
    details: any;
  }> {
    let memories = [...this.memory];

    // Filter by time window if provided
    if (timeWindow) {
      memories = memories.filter(m => 
        m.timestamp >= timeWindow.start && m.timestamp <= timeWindow.end
      );
    }

    // Filter by tags if provided
    if (tags && tags.length > 0) {
      memories = memories.filter(m => 
        tags.some(tag => m.tags.includes(tag))
      );
    }

    // Convert memories to retention log format
    return memories.map(memory => ({
      id: memory.id,
      timestamp: memory.timestamp,
      type: 'memory' as const,
      event: `memory_${memory.type.toLowerCase()}_stored`,
      tags: memory.tags,
      success: true, // Memory storage is considered successful if it exists
      details: {
        importance: memory.importance,
        decay: memory.decay,
        content_length: memory.content.length,
        memory_type: memory.type
      }
    })).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Get memory analytics for dashboard
  getAnalytics(): {
    totalOperations: number;
    successRate: number;
    averageImportance: number;
    typeDistribution: Record<string, number>;
    recentActivity: Array<{
      timestamp: Date;
      operation: string;
      success: boolean;
      details: any;
    }>;
    trends: {
      memoryGrowth: number[];
      importanceTrend: number[];
      decayTrend: number[];
    };
  } {
    const stats = this.getStats();
    const recentMemories = this.getRecentMemories(60, 50); // Last hour, 50 items
    
    // Calculate type distribution
    const typeDistribution: Record<string, number> = {};
    this.memory.forEach(m => {
      typeDistribution[m.type] = (typeDistribution[m.type] || 0) + 1;
    });

    // Generate trends (simplified - in real implementation would use historical data)
    const memoryGrowth = Array.from({ length: 24 }, (_, i) => 
      Math.max(0, stats.total - Math.floor(Math.random() * stats.total * 0.1))
    );
    
    const importanceTrend = Array.from({ length: 24 }, () => 
      40 + Math.random() * 60
    );
    
    const decayTrend = Array.from({ length: 24 }, () => 
      Math.random() * 0.3
    );

    return {
      totalOperations: this.memory.length,
      successRate: 0.95 + Math.random() * 0.05, // Simulated success rate
      averageImportance: stats.avgImportance,
      typeDistribution,
      recentActivity: recentMemories.map(memory => ({
        timestamp: memory.timestamp,
        operation: `store_${memory.type}`,
        success: true,
        details: {
          id: memory.id,
          importance: memory.importance,
          tags: memory.tags
        }
      })),
      trends: {
        memoryGrowth,
        importanceTrend,
        decayTrend
      }
    };
  }

  // Clear all memories (for testing)
  clearAll(): void {
    this.memory = [];
    logger.warn('All memories cleared');
  }
}

// Singleton instance
export const memoryEngine = new MemoryEngine();
export default memoryEngine;
