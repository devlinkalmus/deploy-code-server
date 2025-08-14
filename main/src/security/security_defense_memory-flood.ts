/**
 * Security Defense - Memory Flood Simulation
 * Simulates memory pressure and out-of-memory conditions for security testing
 */

import { logger } from '../utils/logging';
import { intrusionLogger } from './security_defense_intrusion-logger';

export interface MemoryFloodConfig {
  enabled: boolean;
  maxMemoryUsage: number; // MB
  simulationDuration: number; // seconds
  triggerThreshold: number; // suspicious requests per minute
  autoCleanup: boolean;
  alertOnTrigger: boolean;
}

export interface MemoryFloodStatus {
  isActive: boolean;
  startTime: Date | null;
  endTime: Date | null;
  currentMemoryUsage: number; // MB
  peakMemoryUsage: number; // MB
  triggerReason: string;
  sourceIp?: string;
  cleanupPerformed: boolean;
}

export interface MemoryBlock {
  id: string;
  size: number; // bytes
  data: Buffer;
  timestamp: Date;
  purpose: string;
}

class SecurityDefenseMemoryFlood {
  private config: MemoryFloodConfig;
  private memoryLogger = logger.createChildLogger('memory-flood');
  private memoryBlocks: Map<string, MemoryBlock> = new Map();
  private floodStatus: MemoryFloodStatus | null = null;
  private requestCounter: Map<string, number> = new Map();
  private cleanupTimer: NodeJS.Timer | null = null;

  constructor(config: Partial<MemoryFloodConfig> = {}) {
    this.config = {
      enabled: true,
      maxMemoryUsage: 100, // 100MB default
      simulationDuration: 30, // 30 seconds
      triggerThreshold: 50, // 50 requests per minute
      autoCleanup: true,
      alertOnTrigger: true,
      ...config
    };

    this.startRequestCounterCleanup();
  }

  /**
   * Trigger memory flood simulation
   */
  async triggerMemoryFlood(
    reason: string, 
    sourceIp?: string, 
    targetSize?: number
  ): Promise<MemoryFloodStatus> {
    if (!this.config.enabled) {
      throw new Error('Memory flood simulation is disabled');
    }

    if (this.floodStatus?.isActive) {
      this.memoryLogger.warn('Memory flood simulation already active', 'memory-flood');
      return this.floodStatus;
    }

    const floodSize = targetSize || this.config.maxMemoryUsage;
    
    this.floodStatus = {
      isActive: true,
      startTime: new Date(),
      endTime: null,
      currentMemoryUsage: 0,
      peakMemoryUsage: 0,
      triggerReason: reason,
      sourceIp,
      cleanupPerformed: false
    };

    this.memoryLogger.security(
      `Memory flood simulation triggered: ${reason}`,
      'memory-flood-start',
      {
        reason,
        sourceIp,
        targetSize: floodSize,
        duration: this.config.simulationDuration
      },
      {
        tags: ['memory-flood', 'security-simulation', 'resource-exhaustion']
      }
    );

    // Log intrusion event
    if (sourceIp) {
      await intrusionLogger.logIntrusion({
        type: 'suspicious_activity',
        severity: 'high',
        source: { ip: sourceIp },
        target: { endpoint: 'memory', operation: 'flood_simulation' },
        details: {
          description: `Memory flood simulation triggered: ${reason}`,
          payload: { targetSize: floodSize, duration: this.config.simulationDuration }
        },
        response: { action: 'logged', success: true },
        context: {}
      });
    }

    try {
      // Allocate memory blocks to simulate memory pressure
      await this.allocateMemoryBlocks(floodSize);

      // Set auto-cleanup timer
      if (this.config.autoCleanup) {
        this.scheduleCleanup();
      }

      // Trigger alert if configured
      if (this.config.alertOnTrigger && sourceIp) {
        await this.triggerMemoryAlert(reason, sourceIp);
      }

    } catch (error) {
      this.memoryLogger.error(
        `Memory flood simulation failed: ${error instanceof Error ? error.message : String(error)}`,
        'memory-flood-error'
      );
      
      await this.stopMemoryFlood();
      throw error;
    }

    return this.floodStatus;
  }

  /**
   * Stop memory flood simulation
   */
  async stopMemoryFlood(): Promise<void> {
    if (!this.floodStatus?.isActive) {
      return;
    }

    this.memoryLogger.info('Stopping memory flood simulation', 'memory-flood-stop');

    // Clear cleanup timer
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Release all allocated memory
    await this.releaseAllMemory();

    // Update status
    this.floodStatus.isActive = false;
    this.floodStatus.endTime = new Date();
    this.floodStatus.cleanupPerformed = true;

    this.memoryLogger.info(
      `Memory flood simulation stopped`,
      'memory-flood-complete',
      {
        duration: this.floodStatus.endTime.getTime() - this.floodStatus.startTime!.getTime(),
        peakMemoryUsage: this.floodStatus.peakMemoryUsage,
        reason: this.floodStatus.triggerReason
      }
    );
  }

  /**
   * Check if request should trigger memory flood
   */
  async checkTriggerConditions(sourceIp: string, endpoint: string): Promise<boolean> {
    if (!this.config.enabled || this.floodStatus?.isActive) {
      return false;
    }

    // Count requests from this IP
    const currentCount = this.requestCounter.get(sourceIp) || 0;
    this.requestCounter.set(sourceIp, currentCount + 1);

    // Check if threshold exceeded
    if (currentCount >= this.config.triggerThreshold) {
      this.memoryLogger.security(
        `Memory flood trigger threshold exceeded for IP: ${sourceIp}`,
        'memory-flood-trigger',
        {
          sourceIp,
          requestCount: currentCount,
          threshold: this.config.triggerThreshold,
          endpoint
        }
      );

      // Trigger memory flood
      await this.triggerMemoryFlood(
        `Request threshold exceeded: ${currentCount} requests`,
        sourceIp
      );

      return true;
    }

    return false;
  }

  /**
   * Simulate out-of-memory error
   */
  simulateOutOfMemoryError(context?: string): Error {
    const error = new Error('JavaScript heap out of memory');
    error.name = 'RangeError';
    
    this.memoryLogger.error(
      `Simulated out-of-memory error${context ? ` in ${context}` : ''}`,
      'memory-flood-oom',
      {
        context,
        memoryUsage: this.getCurrentMemoryUsage(),
        isSimulation: true
      }
    );

    return error;
  }

  /**
   * Simulate memory pressure effects
   */
  simulateMemoryPressure(): {
    slowResponse: boolean;
    degradedPerformance: boolean;
    memoryWarning: boolean;
    criticalLevel: boolean;
  } {
    const usage = this.getCurrentMemoryUsage();
    const usagePercent = (usage / this.config.maxMemoryUsage) * 100;

    return {
      slowResponse: usagePercent > 60,
      degradedPerformance: usagePercent > 75,
      memoryWarning: usagePercent > 85,
      criticalLevel: usagePercent > 95
    };
  }

  /**
   * Allocate memory blocks for simulation
   */
  private async allocateMemoryBlocks(targetSizeMB: number): Promise<void> {
    const targetSizeBytes = targetSizeMB * 1024 * 1024;
    const blockSize = 1024 * 1024; // 1MB blocks
    const numBlocks = Math.floor(targetSizeBytes / blockSize);

    this.memoryLogger.info(
      `Allocating ${numBlocks} memory blocks (${targetSizeMB}MB total)`,
      'memory-allocation'
    );

    for (let i = 0; i < numBlocks; i++) {
      try {
        const blockId = this.generateBlockId();
        const buffer = Buffer.alloc(blockSize, 0);
        
        // Fill buffer with random data to prevent optimization
        for (let j = 0; j < blockSize; j += 1024) {
          buffer.writeUInt32BE(Math.random() * 0xFFFFFFFF, j);
        }

        const memoryBlock: MemoryBlock = {
          id: blockId,
          size: blockSize,
          data: buffer,
          timestamp: new Date(),
          purpose: 'memory_flood_simulation'
        };

        this.memoryBlocks.set(blockId, memoryBlock);

        // Update usage tracking
        const currentUsage = this.getCurrentMemoryUsage();
        this.floodStatus!.currentMemoryUsage = currentUsage;
        
        if (currentUsage > this.floodStatus!.peakMemoryUsage) {
          this.floodStatus!.peakMemoryUsage = currentUsage;
        }

        // Add small delay to prevent overwhelming the system
        if (i % 10 === 0) {
          await this.delay(10);
        }

      } catch (error) {
        this.memoryLogger.error(
          `Failed to allocate memory block ${i}: ${error instanceof Error ? error.message : String(error)}`,
          'memory-allocation-error'
        );
        break;
      }
    }

    this.memoryLogger.info(
      `Memory allocation complete: ${this.memoryBlocks.size} blocks allocated`,
      'memory-allocation-complete',
      {
        blocksAllocated: this.memoryBlocks.size,
        totalSizeMB: this.getCurrentMemoryUsage(),
        targetSizeMB
      }
    );
  }

  /**
   * Release all allocated memory
   */
  private async releaseAllMemory(): Promise<void> {
    this.memoryLogger.info(
      `Releasing ${this.memoryBlocks.size} memory blocks`,
      'memory-release'
    );

    const blockIds = Array.from(this.memoryBlocks.keys());
    
    for (const blockId of blockIds) {
      this.memoryBlocks.delete(blockId);
      
      // Add small delay to prevent overwhelming the GC
      if (blockIds.indexOf(blockId) % 10 === 0) {
        await this.delay(5);
      }
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    this.memoryLogger.info('All memory blocks released', 'memory-release-complete');
  }

  /**
   * Schedule automatic cleanup
   */
  private scheduleCleanup(): void {
    this.cleanupTimer = setTimeout(async () => {
      this.memoryLogger.info('Auto-cleanup timer triggered', 'memory-flood-cleanup');
      await this.stopMemoryFlood();
    }, this.config.simulationDuration * 1000);
  }

  /**
   * Trigger memory alert
   */
  private async triggerMemoryAlert(reason: string, sourceIp: string): Promise<void> {
    // This would integrate with the dashboard alert system
    this.memoryLogger.security(
      `MEMORY FLOOD ALERT: ${reason}`,
      'memory-flood-alert',
      {
        reason,
        sourceIp,
        memoryUsage: this.getCurrentMemoryUsage(),
        timestamp: new Date().toISOString()
      },
      {
        tags: ['memory-flood-alert', 'resource-exhaustion', 'security-simulation']
      }
    );
  }

  /**
   * Get current memory usage from allocated blocks
   */
  private getCurrentMemoryUsage(): number {
    const totalBytes = Array.from(this.memoryBlocks.values())
      .reduce((sum, block) => sum + block.size, 0);
    
    return Math.round(totalBytes / (1024 * 1024)); // Convert to MB
  }

  /**
   * Get system memory usage
   */
  getSystemMemoryUsage(): {
    used: number;
    free: number;
    total: number;
    percentage: number;
  } {
    const memUsage = process.memoryUsage();
    const used = Math.round(memUsage.heapUsed / (1024 * 1024));
    const total = Math.round(memUsage.heapTotal / (1024 * 1024));
    const free = total - used;
    const percentage = Math.round((used / total) * 100);

    return { used, free, total, percentage };
  }

  /**
   * Get memory flood status
   */
  getMemoryFloodStatus(): MemoryFloodStatus | null {
    return this.floodStatus ? { ...this.floodStatus } : null;
  }

  /**
   * Get memory flood statistics
   */
  getMemoryFloodStats(): {
    enabled: boolean;
    isActive: boolean;
    totalBlocks: number;
    simulatedMemoryUsage: number;
    systemMemoryUsage: ReturnType<typeof this.getSystemMemoryUsage>;
    requestCounts: Array<{ ip: string; count: number }>;
    config: MemoryFloodConfig;
  } {
    const requestCounts = Array.from(this.requestCounter.entries())
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      enabled: this.config.enabled,
      isActive: this.floodStatus?.isActive || false,
      totalBlocks: this.memoryBlocks.size,
      simulatedMemoryUsage: this.getCurrentMemoryUsage(),
      systemMemoryUsage: this.getSystemMemoryUsage(),
      requestCounts,
      config: { ...this.config }
    };
  }

  /**
   * Start request counter cleanup
   */
  private startRequestCounterCleanup(): void {
    setInterval(() => {
      // Reset request counters every minute
      this.requestCounter.clear();
      this.memoryLogger.debug('Request counters reset', 'memory-flood-cleanup');
    }, 60000);
  }

  /**
   * Manually trigger memory stress test
   */
  async performMemoryStressTest(
    durationSeconds: number = 10,
    targetSizeMB: number = 50
  ): Promise<void> {
    this.memoryLogger.info(
      `Starting manual memory stress test: ${targetSizeMB}MB for ${durationSeconds}s`,
      'memory-stress-test'
    );

    await this.triggerMemoryFlood(
      'Manual stress test',
      'system',
      targetSizeMB
    );

    // Override auto-cleanup timer for manual test
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
    }

    setTimeout(async () => {
      await this.stopMemoryFlood();
    }, durationSeconds * 1000);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MemoryFloodConfig>): void {
    this.config = { ...this.config, ...config };
    this.memoryLogger.info('Memory flood configuration updated', 'memory-flood-config');
  }

  /**
   * Force cleanup and reset
   */
  async forceCleanup(): Promise<void> {
    this.memoryLogger.info('Force cleanup initiated', 'memory-flood-force-cleanup');
    
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    await this.releaseAllMemory();
    
    this.floodStatus = null;
    this.requestCounter.clear();

    this.memoryLogger.info('Force cleanup completed', 'memory-flood-force-cleanup');
  }

  /**
   * Utility methods
   */
  private generateBlockId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const securityDefenseMemoryFlood = new SecurityDefenseMemoryFlood();

export default securityDefenseMemoryFlood;