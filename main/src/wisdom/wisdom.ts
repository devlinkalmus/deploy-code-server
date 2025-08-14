/**
 * JRVI Wisdom Forge Integration
 * Implements time-weighted memory reinforcement and dormant memory awakening
 * Provides hooks for wisdom accumulation and strategic memory management
 */

import { logger } from '../utils/logging';
import { cltmCore, MemoryEntry, MemoryType, SecurityLevel } from '../memory/cltm_core';
import { strategyKernel, createOperationRequest, OperationType, Priority } from '../kernel/strategy';
import { securityMiddleware, UserSession } from '../security/middleware';

export interface WisdomForgeConfig {
  enableTimeWeighting: boolean;
  reinforcementThreshold: number;
  dormancyPeriodHours: number;
  maxWisdomGain: number;
  decayResistanceBonus: number;
  associationStrengthMultiplier: number;
  awakenDormantInterval: number; // in minutes
  reinforcementInterval: number; // in minutes
}

export interface WisdomMetrics {
  totalWisdomAccumulated: number;
  reinforcedMemories: number;
  awakenedMemories: number;
  wisdomEfficiency: number;
  memoryUtilization: number;
  knowledgeConnectivity: number;
  temporalDistribution: Record<string, number>;
  topWisdomSources: Array<{ source: string; wisdom: number; memoryCount: number }>;
}

export interface MemoryReinforcementResult {
  memoryId: string;
  oldWisdom: number;
  newWisdom: number;
  reinforcementFactor: number;
  timeWeight: number;
  associationBonus: number;
  success: boolean;
  auditLogId?: string;
}

export interface DormantMemoryResult {
  memoryId: string;
  dormancyDuration: number;
  awakenStrength: number;
  reactivationBonus: number;
  newConnections: string[];
  success: boolean;
  auditLogId?: string;
}

export interface WisdomInsight {
  id: string;
  type: 'PATTERN' | 'SYNTHESIS' | 'EMERGENCE' | 'CORRELATION';
  description: string;
  confidence: number;
  relatedMemories: string[];
  wisdomValue: number;
  timestamp: Date;
  actionRecommendations: string[];
}

export class WisdomForge {
  private config: WisdomForgeConfig;
  private metrics: WisdomMetrics;
  private reinforcementTimer?: NodeJS.Timeout;
  private awakenTimer?: NodeJS.Timeout;
  private wisdomLogger = logger.createChildLogger('wisdom-forge');
  private insights: Map<string, WisdomInsight> = new Map();
  private lastReinforcementRun: Date = new Date();
  private lastAwakenRun: Date = new Date();

  constructor(config?: Partial<WisdomForgeConfig>) {
    this.config = {
      enableTimeWeighting: true,
      reinforcementThreshold: 0.6,
      dormancyPeriodHours: 168, // 7 days
      maxWisdomGain: 0.3,
      decayResistanceBonus: 0.4,
      associationStrengthMultiplier: 1.5,
      awakenDormantInterval: 60, // 1 hour
      reinforcementInterval: 30, // 30 minutes
      ...config
    };

    this.metrics = {
      totalWisdomAccumulated: 0,
      reinforcedMemories: 0,
      awakenedMemories: 0,
      wisdomEfficiency: 0,
      memoryUtilization: 0,
      knowledgeConnectivity: 0,
      temporalDistribution: {},
      topWisdomSources: []
    };

    this.initializeWisdomForge();
  }

  /**
   * Initialize the Wisdom Forge system
   */
  private initializeWisdomForge(): void {
    this.wisdomLogger.info(
      'Initializing Wisdom Forge system',
      'wisdom-forge-init',
      {
        config: this.config,
        enableTimeWeighting: this.config.enableTimeWeighting
      }
    );

    if (this.config.enableTimeWeighting) {
      this.startReinforcementProcess();
      this.startAwakenProcess();
    }

    // Initial metrics calculation
    this.updateMetrics();

    this.wisdomLogger.audit(
      'Wisdom Forge system initialized',
      'wisdom-forge-init',
      {
        totalMemories: cltmCore.getMemoryStats().totalMemories,
        initialWisdom: this.metrics.totalWisdomAccumulated
      },
      {
        tags: ['wisdom-forge', 'system-init'],
        brandAffinity: ['JRVI']
      }
    );
  }

  /**
   * Start automatic memory reinforcement process
   */
  private startReinforcementProcess(): void {
    if (this.reinforcementTimer) {
      clearInterval(this.reinforcementTimer);
    }

    this.reinforcementTimer = setInterval(async () => {
      try {
        await this.reinforceWisdom();
      } catch (error) {
        this.wisdomLogger.error(
          'Reinforcement process failed',
          'wisdom-reinforcement',
          { 
            error: error instanceof Error ? error.message : String(error),
            lastRun: this.lastReinforcementRun
          }
        );
      }
    }, this.config.reinforcementInterval * 60 * 1000);
  }

  /**
   * Start automatic dormant memory awakening process
   */
  private startAwakenProcess(): void {
    if (this.awakenTimer) {
      clearInterval(this.awakenTimer);
    }

    this.awakenTimer = setInterval(async () => {
      try {
        await this.awakenDormant();
      } catch (error) {
        this.wisdomLogger.error(
          'Awaken process failed',
          'wisdom-awaken',
          { 
            error: error instanceof Error ? error.message : String(error),
            lastRun: this.lastAwakenRun
          }
        );
      }
    }, this.config.awakenDormantInterval * 60 * 1000);
  }

  /**
   * Reinforce wisdom in high-value memories with time weighting
   */
  async reinforceWisdom(
    session?: UserSession,
    targetMemoryIds?: string[]
  ): Promise<MemoryReinforcementResult[]> {
    const startTime = Date.now();
    const operationId = this.generateOperationId('reinforce');
    
    this.wisdomLogger.debug(
      'Starting wisdom reinforcement cycle',
      'wisdom-reinforcement',
      {
        operationId,
        targetMemoryIds: targetMemoryIds?.length || 'all',
        threshold: this.config.reinforcementThreshold
      }
    );

    try {
      // Security check if session provided
      if (session) {
        const securityResult = await securityMiddleware.checkSecurity({
          session,
          requestId: operationId,
          origin: 'wisdom-forge',
          operation: 'wisdom_reinforcement',
          target: 'memory-engine',
          brandAffinity: ['JRVI']
        });

        if (!securityResult.allowed) {
          throw new Error(`Security check failed: ${securityResult.reason}`);
        }
      }

      // Route through strategy kernel
      const reinforceRequest = createOperationRequest(
        OperationType.MEMORY_UPDATE,
        'wisdom-forge',
        'reinforce-wisdom',
        {
          operationId,
          targetMemoryIds,
          config: this.config
        },
        {
          brandAffinity: ['JRVI'],
          priority: Priority.LOW,
          requiresApproval: false,
          metadata: {
            operation: 'wisdom-reinforcement',
            automated: !session
          }
        }
      );

      const kernelResult = await strategyKernel.route(reinforceRequest);
      
      if (!kernelResult.success) {
        throw new Error(`Kernel routing failed: ${kernelResult.error}`);
      }

      // Get candidate memories
      const candidates = this.getCandidateMemoriesForReinforcement(targetMemoryIds);
      const results: MemoryReinforcementResult[] = [];

      for (const memory of candidates) {
        try {
          const result = await this.reinforceMemoryWisdom(memory, kernelResult.auditLogId);
          results.push(result);
          
          if (result.success) {
            this.metrics.reinforcedMemories++;
          }
        } catch (error) {
          this.wisdomLogger.warn(
            `Failed to reinforce memory: ${memory.id}`,
            'wisdom-reinforcement',
            {
              memoryId: memory.id,
              error: error instanceof Error ? error.message : String(error)
            }
          );
          
          results.push({
            memoryId: memory.id,
            oldWisdom: memory.wisdom,
            newWisdom: memory.wisdom,
            reinforcementFactor: 0,
            timeWeight: 0,
            associationBonus: 0,
            success: false
          });
        }
      }

      this.lastReinforcementRun = new Date();
      this.updateMetrics();

      // Generate insights from reinforcement patterns
      await this.generateReinforcementInsights(results);

      const processingTime = Date.now() - startTime;
      
      this.wisdomLogger.audit(
        `Wisdom reinforcement completed: ${results.filter(r => r.success).length}/${results.length} memories reinforced`,
        'wisdom-reinforcement',
        {
          operationId,
          totalCandidates: candidates.length,
          successfulReinforcements: results.filter(r => r.success).length,
          totalWisdomGained: results.reduce((sum, r) => sum + (r.newWisdom - r.oldWisdom), 0),
          processingTime,
          auditLogId: kernelResult.auditLogId
        },
        {
          tags: ['wisdom-reinforcement', 'memory-enhancement'],
          brandAffinity: ['JRVI']
        }
      );

      return results;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.wisdomLogger.error(
        `Wisdom reinforcement failed: ${errorMessage}`,
        'wisdom-reinforcement',
        {
          operationId,
          error: errorMessage,
          processingTime: Date.now() - startTime
        }
      );

      throw error;
    }
  }

  /**
   * Awaken dormant memories and create new connections
   */
  async awakenDormant(
    session?: UserSession,
    maxMemoriesToAwaken: number = 10
  ): Promise<DormantMemoryResult[]> {
    const startTime = Date.now();
    const operationId = this.generateOperationId('awaken');
    
    this.wisdomLogger.debug(
      'Starting dormant memory awakening cycle',
      'wisdom-awaken',
      {
        operationId,
        maxMemories: maxMemoriesToAwaken,
        dormancyPeriod: this.config.dormancyPeriodHours
      }
    );

    try {
      // Security check if session provided
      if (session) {
        const securityResult = await securityMiddleware.checkSecurity({
          session,
          requestId: operationId,
          origin: 'wisdom-forge',
          operation: 'awaken_dormant',
          target: 'memory-engine',
          brandAffinity: ['JRVI']
        });

        if (!securityResult.allowed) {
          throw new Error(`Security check failed: ${securityResult.reason}`);
        }
      }

      // Route through strategy kernel
      const awakenRequest = createOperationRequest(
        OperationType.MEMORY_UPDATE,
        'wisdom-forge',
        'awaken-dormant',
        {
          operationId,
          maxMemories: maxMemoriesToAwaken,
          config: this.config
        },
        {
          brandAffinity: ['JRVI'],
          priority: Priority.LOW,
          requiresApproval: false,
          metadata: {
            operation: 'dormant-awakening',
            automated: !session
          }
        }
      );

      const kernelResult = await strategyKernel.route(awakenRequest);
      
      if (!kernelResult.success) {
        throw new Error(`Kernel routing failed: ${kernelResult.error}`);
      }

      // Find dormant memories
      const dormantMemories = this.findDormantMemories(maxMemoriesToAwaken);
      const results: DormantMemoryResult[] = [];

      for (const memory of dormantMemories) {
        try {
          const result = await this.awakenMemory(memory, kernelResult.auditLogId);
          results.push(result);
          
          if (result.success) {
            this.metrics.awakenedMemories++;
          }
        } catch (error) {
          this.wisdomLogger.warn(
            `Failed to awaken memory: ${memory.id}`,
            'wisdom-awaken',
            {
              memoryId: memory.id,
              error: error instanceof Error ? error.message : String(error)
            }
          );
          
          results.push({
            memoryId: memory.id,
            dormancyDuration: this.calculateDormancyDuration(memory),
            awakenStrength: 0,
            reactivationBonus: 0,
            newConnections: [],
            success: false
          });
        }
      }

      this.lastAwakenRun = new Date();
      this.updateMetrics();

      // Generate insights from awakening patterns
      await this.generateAwakenInsights(results);

      const processingTime = Date.now() - startTime;
      
      this.wisdomLogger.audit(
        `Dormant memory awakening completed: ${results.filter(r => r.success).length}/${results.length} memories awakened`,
        'wisdom-awaken',
        {
          operationId,
          totalDormant: dormantMemories.length,
          successfulAwakenings: results.filter(r => r.success).length,
          newConnections: results.reduce((sum, r) => sum + r.newConnections.length, 0),
          processingTime,
          auditLogId: kernelResult.auditLogId
        },
        {
          tags: ['wisdom-awaken', 'memory-reactivation'],
          brandAffinity: ['JRVI']
        }
      );

      return results;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.wisdomLogger.error(
        `Dormant awakening failed: ${errorMessage}`,
        'wisdom-awaken',
        {
          operationId,
          error: errorMessage,
          processingTime: Date.now() - startTime
        }
      );

      throw error;
    }
  }

  /**
   * Get candidate memories for reinforcement
   */
  private getCandidateMemoriesForReinforcement(targetMemoryIds?: string[]): MemoryEntry[] {
    if (targetMemoryIds) {
      return targetMemoryIds
        .map(id => cltmCore.retrieveMemories({ keywords: [id], maxResults: 1 })[0])
        .filter(Boolean);
    }

    // Get memories that meet reinforcement criteria
    const allMemories = cltmCore.retrieveMemories({
      minScore: this.config.reinforcementThreshold,
      includeDecayed: false,
      maxResults: 100
    });

    return allMemories
      .filter(memory => {
        const timeSinceAccess = Date.now() - memory.lastAccessed.getTime();
        const hoursIdle = timeSinceAccess / (1000 * 60 * 60);
        
        // Consider memories that haven't been accessed recently but have high potential
        return hoursIdle > 24 && memory.wisdom < this.config.maxWisdomGain && memory.score > 0.5;
      })
      .sort((a, b) => (b.score * (1 - b.decay)) - (a.score * (1 - a.decay)))
      .slice(0, 20); // Limit to top 20 candidates
  }

  /**
   * Reinforce wisdom in a specific memory
   */
  private async reinforceMemoryWisdom(
    memory: MemoryEntry, 
    auditLogId?: string
  ): Promise<MemoryReinforcementResult> {
    const oldWisdom = memory.wisdom;
    
    // Calculate time weight
    const timeSinceCreation = Date.now() - memory.timestamp.getTime();
    const daysSinceCreation = timeSinceCreation / (1000 * 60 * 60 * 24);
    const timeWeight = Math.min(1.0, daysSinceCreation / 30); // Max weight after 30 days
    
    // Calculate association bonus
    const associationStrength = memory.associations.length * 0.1;
    const associationBonus = Math.min(0.3, associationStrength * this.config.associationStrengthMultiplier);
    
    // Calculate reinforcement factor
    const baseReinforcement = memory.score * timeWeight;
    const reinforcementFactor = Math.min(
      this.config.maxWisdomGain,
      baseReinforcement + associationBonus
    );
    
    // Apply wisdom gain
    const newWisdom = Math.min(1.0, oldWisdom + reinforcementFactor);
    
    // Update memory
    const success = cltmCore.updateMemory(memory.id, {
      metadata: {
        ...memory.metadata,
        confidence: Math.min(1.0, memory.metadata.confidence + reinforcementFactor * 0.1),
        relevance: Math.min(1.0, memory.metadata.relevance + reinforcementFactor * 0.05)
      }
    });

    if (success) {
      memory.wisdom = newWisdom;
      memory.decay = Math.max(0, memory.decay - this.config.decayResistanceBonus * reinforcementFactor);
      this.metrics.totalWisdomAccumulated += (newWisdom - oldWisdom);
    }
    
    return {
      memoryId: memory.id,
      oldWisdom,
      newWisdom,
      reinforcementFactor,
      timeWeight,
      associationBonus,
      success,
      auditLogId
    };
  }

  /**
   * Find dormant memories that can be awakened
   */
  private findDormantMemories(maxCount: number): MemoryEntry[] {
    const now = Date.now();
    const dormancyThreshold = this.config.dormancyPeriodHours * 60 * 60 * 1000;
    
    const allMemories = cltmCore.retrieveMemories({
      includeDecayed: true,
      maxResults: 1000
    });
    
    return allMemories
      .filter(memory => {
        const timeSinceAccess = now - memory.lastAccessed.getTime();
        return timeSinceAccess > dormancyThreshold && 
               memory.wisdom > 0.3 && 
               memory.decay < 0.8;
      })
      .sort((a, b) => b.wisdom - a.wisdom)
      .slice(0, maxCount);
  }

  /**
   * Awaken a dormant memory
   */
  private async awakenMemory(
    memory: MemoryEntry,
    auditLogId?: string
  ): Promise<DormantMemoryResult> {
    const dormancyDuration = this.calculateDormancyDuration(memory);
    
    // Calculate awakening strength based on dormancy and wisdom
    const awakenStrength = Math.min(1.0, (memory.wisdom * 0.8) + (dormancyDuration / 168) * 0.2); // 168 hours = 1 week
    
    // Calculate reactivation bonus
    const reactivationBonus = awakenStrength * 0.3;
    
    // Find potential new connections
    const newConnections = await this.findNewConnections(memory);
    
    // Update memory
    const success = cltmCore.updateMemory(memory.id, {
      metadata: {
        ...memory.metadata,
        relevance: Math.min(1.0, memory.metadata.relevance + reactivationBonus)
      }
    });

    if (success) {
      // Reduce decay
      memory.decay = Math.max(0, memory.decay - reactivationBonus);
      memory.lastAccessed = new Date();
      memory.accessCount++;
      
      // Create new associations
      for (const connectionId of newConnections) {
        cltmCore.createAssociation(memory.id, connectionId, awakenStrength);
      }
    }
    
    return {
      memoryId: memory.id,
      dormancyDuration,
      awakenStrength,
      reactivationBonus,
      newConnections,
      success,
      auditLogId
    };
  }

  /**
   * Find new potential connections for a memory
   */
  private async findNewConnections(memory: MemoryEntry): Promise<string[]> {
    // Find memories with similar content or tags
    const candidates = cltmCore.retrieveMemories({
      keywords: memory.content.split(' ').slice(0, 5), // Use first 5 words
      tags: memory.tags,
      maxResults: 10
    });
    
    return candidates
      .filter(candidate => 
        candidate.id !== memory.id && 
        !memory.associations.includes(candidate.id) &&
        candidate.score > 0.5
      )
      .slice(0, 3)
      .map(candidate => candidate.id);
  }

  /**
   * Calculate dormancy duration in hours
   */
  private calculateDormancyDuration(memory: MemoryEntry): number {
    const timeSinceAccess = Date.now() - memory.lastAccessed.getTime();
    return timeSinceAccess / (1000 * 60 * 60);
  }

  /**
   * Generate insights from reinforcement patterns
   */
  private async generateReinforcementInsights(results: MemoryReinforcementResult[]): Promise<void> {
    const successful = results.filter(r => r.success);
    
    if (successful.length > 5) {
      const avgWisdomGain = successful.reduce((sum, r) => sum + (r.newWisdom - r.oldWisdom), 0) / successful.length;
      
      if (avgWisdomGain > 0.1) {
        const insight: WisdomInsight = {
          id: this.generateInsightId(),
          type: 'PATTERN',
          description: `High wisdom reinforcement pattern detected. Average gain: ${avgWisdomGain.toFixed(3)}`,
          confidence: 0.8,
          relatedMemories: successful.map(r => r.memoryId),
          wisdomValue: avgWisdomGain * successful.length,
          timestamp: new Date(),
          actionRecommendations: [
            'Continue current reinforcement strategies',
            'Consider increasing reinforcement frequency',
            'Monitor long-term wisdom accumulation trends'
          ]
        };
        
        this.insights.set(insight.id, insight);
        
        this.wisdomLogger.info(
          'Wisdom reinforcement insight generated',
          'wisdom-insights',
          {
            insightId: insight.id,
            type: insight.type,
            confidence: insight.confidence,
            relatedMemories: insight.relatedMemories.length
          }
        );
      }
    }
  }

  /**
   * Generate insights from awakening patterns
   */
  private async generateAwakenInsights(results: DormantMemoryResult[]): Promise<void> {
    const successful = results.filter(r => r.success);
    
    if (successful.length > 3) {
      const totalConnections = successful.reduce((sum, r) => sum + r.newConnections.length, 0);
      
      if (totalConnections > successful.length * 2) {
        const insight: WisdomInsight = {
          id: this.generateInsightId(),
          type: 'EMERGENCE',
          description: `Strong memory connectivity emergence detected. ${totalConnections} new connections formed.`,
          confidence: 0.7,
          relatedMemories: successful.map(r => r.memoryId),
          wisdomValue: totalConnections * 0.1,
          timestamp: new Date(),
          actionRecommendations: [
            'Investigate newly formed memory clusters',
            'Consider reducing dormancy threshold',
            'Analyze connection patterns for insights'
          ]
        };
        
        this.insights.set(insight.id, insight);
        
        this.wisdomLogger.info(
          'Dormant awakening insight generated',
          'wisdom-insights',
          {
            insightId: insight.id,
            type: insight.type,
            confidence: insight.confidence,
            newConnections: totalConnections
          }
        );
      }
    }
  }

  /**
   * Update wisdom metrics
   */
  private updateMetrics(): void {
    const memoryStats = cltmCore.getMemoryStats();
    
    this.metrics.totalWisdomAccumulated = memoryStats.totalWisdom;
    this.metrics.memoryUtilization = memoryStats.averageScore;
    this.metrics.knowledgeConnectivity = memoryStats.associationCount / Math.max(1, memoryStats.totalMemories);
    
    // Calculate wisdom efficiency
    const totalMemories = memoryStats.totalMemories;
    this.metrics.wisdomEfficiency = totalMemories > 0 
      ? this.metrics.totalWisdomAccumulated / totalMemories 
      : 0;
    
    // Update temporal distribution
    const now = new Date();
    const hour = now.getHours();
    const timeKey = `${hour}:00`;
    
    if (!this.metrics.temporalDistribution[timeKey]) {
      this.metrics.temporalDistribution[timeKey] = 0;
    }
    this.metrics.temporalDistribution[timeKey]++;
  }

  /**
   * Get current wisdom metrics
   */
  getWisdomMetrics(): WisdomMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Get wisdom insights
   */
  getWisdomInsights(limit: number = 20): WisdomInsight[] {
    return Array.from(this.insights.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<WisdomForgeConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart processes if needed
    if (newConfig.reinforcementInterval !== undefined) {
      this.startReinforcementProcess();
    }
    
    if (newConfig.awakenDormantInterval !== undefined) {
      this.startAwakenProcess();
    }
    
    this.wisdomLogger.audit(
      'Wisdom Forge configuration updated',
      'wisdom-config',
      { newConfig },
      {
        tags: ['wisdom-config', 'system-update'],
        brandAffinity: ['JRVI']
      }
    );
  }

  /**
   * Shutdown wisdom forge
   */
  shutdown(): void {
    if (this.reinforcementTimer) {
      clearInterval(this.reinforcementTimer);
    }
    
    if (this.awakenTimer) {
      clearInterval(this.awakenTimer);
    }
    
    this.wisdomLogger.info(
      'Wisdom Forge shutdown completed',
      'wisdom-shutdown',
      {
        totalWisdom: this.metrics.totalWisdomAccumulated,
        reinforcedMemories: this.metrics.reinforcedMemories,
        awakenedMemories: this.metrics.awakenedMemories
      }
    );
  }

  /**
   * Generate operation ID
   */
  private generateOperationId(operation: string): string {
    return `wisdom_${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Generate insight ID
   */
  private generateInsightId(): string {
    return `insight_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }
}

// Export singleton instance
export const wisdomForge = new WisdomForge();

export default wisdomForge;