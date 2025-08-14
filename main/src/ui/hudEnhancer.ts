/**
 * HUD Enhancer - Enhanced HUD functionality for consensus scoring and system monitoring
 * Provides real-time updates and interactive elements for the JRVI dashboard
 */

import { logger } from '../utils/logging';
import { swarmHive, ConsensusResult, SwarmMetrics } from '../kernel/swarmHive';
import { tokenPromotion, PromotionProposal, DemotionProposal } from '../kernel/tokenPromotion';
import { tokenKernel, TokenAccount } from '../kernel/tokenKernel';
import { unifiedKernels } from '../kernel/kernels';

export interface HUDEnhancementConfig {
  refreshInterval: number; // milliseconds
  consensusThreshold: number;
  alertThresholds: {
    lowConsensus: number;
    highTokenVolatility: number;
    systemLoadWarning: number;
  };
  displayOptions: {
    showConsensusScores: boolean;
    showTokenMetrics: boolean;
    showSwarmActivity: boolean;
    showProposalAlerts: boolean;
  };
}

export interface HUDPayloadData {
  timestamp: Date;
  consensusData: {
    activeProposals: number;
    averageConsensusScore: number;
    consensusReachRate: number;
    pendingEvaluations: number;
  };
  tokenData: {
    totalSupply: number;
    circulatingSupply: number;
    stakingRatio: number;
    recentTransactions: number;
    topHolders: Array<{ address: string; balance: number; stakedBalance: number }>;
  };
  swarmData: {
    activeEvaluators: number;
    pendingTasks: number;
    averageResponseTime: number;
    expertiseCoverage: Record<string, number>;
  };
  systemAlerts: SystemAlert[];
  performanceMetrics: {
    consensusLatency: number;
    tokenTransactionThroughput: number;
    systemLoad: number;
    errorRate: number;
  };
  traceId: string;
}

export interface SystemAlert {
  id: string;
  type: 'consensus_warning' | 'token_alert' | 'security_notice' | 'system_degradation' | 'proposal_deadline';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  dismissed: boolean;
  actionRequired: boolean;
  relatedItems: string[];
  traceId: string;
}

export interface ConsensusVisualization {
  proposalId: string;
  proposalTitle: string;
  overallScore: number;
  consensusReached: boolean;
  participantCount: number;
  dimensionScores: {
    technical: number;
    security: number;
    innovation: number;
    usability: number;
    documentation: number;
    performance: number;
  };
  trend: 'improving' | 'stable' | 'declining';
  confidence: number;
  timeToConsensus?: number;
}

export interface TokenVisualization {
  accountBalance: number;
  stakedBalance: number;
  totalEarnings: number;
  recentTransactions: Array<{
    type: string;
    amount: number;
    timestamp: Date;
    description: string;
  }>;
  stakingPositions: Array<{
    logicId: string;
    amount: number;
    unlockTime: Date;
    rewards: number;
  }>;
  votingPower: number;
  reputation: number;
}

class HUDEnhancer {
  private config: HUDEnhancementConfig;
  private currentPayload: HUDPayloadData | null = null;
  private subscribers: Map<string, (payload: HUDPayloadData) => void> = new Map();
  private alerts: Map<string, SystemAlert> = new Map();
  private refreshTimer: NodeJS.Timeout | null = null;
  private hudLogger = logger.createChildLogger('hud-enhancer');

  constructor(config?: Partial<HUDEnhancementConfig>) {
    this.config = {
      refreshInterval: 5000, // 5 seconds
      consensusThreshold: 70,
      alertThresholds: {
        lowConsensus: 50,
        highTokenVolatility: 0.2, // 20% volatility
        systemLoadWarning: 80
      },
      displayOptions: {
        showConsensusScores: true,
        showTokenMetrics: true,
        showSwarmActivity: true,
        showProposalAlerts: true
      },
      ...config
    };

    this.startEnhancementLoop();
  }

  /**
   * Subscribe to HUD payload updates
   */
  subscribe(subscriberId: string, callback: (payload: HUDPayloadData) => void): void {
    this.subscribers.set(subscriberId, callback);
    
    // Send current payload immediately if available
    if (this.currentPayload) {
      callback(this.currentPayload);
    }

    this.hudLogger.debug(
      `HUD subscriber added: ${subscriberId}`,
      'hud-subscription',
      { subscriberId, totalSubscribers: this.subscribers.size }
    );
  }

  /**
   * Unsubscribe from HUD payload updates
   */
  unsubscribe(subscriberId: string): void {
    this.subscribers.delete(subscriberId);
    
    this.hudLogger.debug(
      `HUD subscriber removed: ${subscriberId}`,
      'hud-subscription',
      { subscriberId, totalSubscribers: this.subscribers.size }
    );
  }

  /**
   * Get current HUD payload
   */
  getCurrentPayload(): HUDPayloadData | null {
    return this.currentPayload;
  }

  /**
   * Generate consensus visualization data
   */
  async generateConsensusVisualization(userAddress?: string): Promise<ConsensusVisualization[]> {
    const activeProposals = tokenPromotion.getActivePromotions();
    const visualizations: ConsensusVisualization[] = [];

    for (const proposal of activeProposals) {
      const consensusResult = swarmHive.getConsensusResult(proposal.id);
      
      if (consensusResult) {
        // Calculate trend based on evaluation history
        const evaluations = swarmHive.getProposalEvaluations(proposal.id);
        const trend = this.calculateScoreTrend(evaluations);
        
        visualizations.push({
          proposalId: proposal.id,
          proposalTitle: proposal.title,
          overallScore: consensusResult.overallScore,
          consensusReached: consensusResult.consensusReached,
          participantCount: consensusResult.participantCount,
          dimensionScores: consensusResult.dimensionScores,
          trend,
          confidence: consensusResult.confidence,
          timeToConsensus: this.calculateTimeToConsensus(proposal, consensusResult)
        });
      } else {
        // Proposal without consensus yet
        visualizations.push({
          proposalId: proposal.id,
          proposalTitle: proposal.title,
          overallScore: proposal.qualityMetrics.overall,
          consensusReached: false,
          participantCount: proposal.votes.length,
          dimensionScores: {
            technical: proposal.qualityMetrics.codeQuality,
            security: proposal.qualityMetrics.security,
            innovation: proposal.qualityMetrics.innovation,
            usability: 0, // Not in original quality metrics
            documentation: proposal.qualityMetrics.documentation,
            performance: proposal.qualityMetrics.performance
          },
          trend: 'stable',
          confidence: 0
        });
      }
    }

    return visualizations.sort((a, b) => b.overallScore - a.overallScore);
  }

  /**
   * Generate token visualization data for user
   */
  async generateTokenVisualization(userAddress: string): Promise<TokenVisualization | null> {
    const account = await tokenKernel.getAccount(userAddress);
    if (!account) return null;

    const stakePositions = tokenKernel.getStakePositions(userAddress);
    const transactions = tokenKernel.getTransactionHistory(userAddress, { limit: 10 });

    return {
      accountBalance: account.balance,
      stakedBalance: account.stakedBalance,
      totalEarnings: account.earnedTotal,
      recentTransactions: transactions.map(tx => ({
        type: tx.type,
        amount: tx.amount,
        timestamp: tx.timestamp,
        description: tx.reason
      })),
      stakingPositions: stakePositions.map(pos => ({
        logicId: pos.logicId,
        amount: pos.amount,
        unlockTime: pos.unlockTime,
        rewards: pos.rewards
      })),
      votingPower: account.votingPower,
      reputation: account.reputation
    };
  }

  /**
   * Create system alert
   */
  createAlert(
    type: SystemAlert['type'],
    severity: SystemAlert['severity'],
    title: string,
    message: string,
    options?: {
      actionRequired?: boolean;
      relatedItems?: string[];
    }
  ): string {
    const alert: SystemAlert = {
      id: this.generateId(),
      type,
      severity,
      title,
      message,
      timestamp: new Date(),
      dismissed: false,
      actionRequired: options?.actionRequired || false,
      relatedItems: options?.relatedItems || [],
      traceId: this.generateTraceId()
    };

    this.alerts.set(alert.id, alert);

    this.hudLogger.audit(
      `System alert created: ${title}`,
      'system-alert',
      {
        alertId: alert.id,
        type,
        severity,
        actionRequired: alert.actionRequired,
        traceId: alert.traceId
      },
      {
        tags: ['system-alert', type, severity],
        brandAffinity: ['JRVI'],
        lineage: [alert.traceId]
      }
    );

    // Trigger immediate payload update for critical alerts
    if (severity === 'critical') {
      this.updatePayload();
    }

    return alert.id;
  }

  /**
   * Dismiss alert
   */
  dismissAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.dismissed = true;
    
    this.hudLogger.audit(
      `System alert dismissed: ${alert.title}`,
      'alert-dismissal',
      {
        alertId,
        type: alert.type,
        severity: alert.severity,
        traceId: alert.traceId
      },
      {
        tags: ['alert-dismissed'],
        brandAffinity: ['JRVI'],
        lineage: [alert.traceId]
      }
    );

    return true;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): SystemAlert[] {
    return Array.from(this.alerts.values())
      .filter(alert => !alert.dismissed)
      .sort((a, b) => {
        // Sort by severity, then by timestamp
        const severityOrder = { critical: 4, error: 3, warning: 2, info: 1 };
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        if (severityDiff !== 0) return severityDiff;
        return b.timestamp.getTime() - a.timestamp.getTime();
      });
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<HUDEnhancementConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart enhancement loop with new interval if changed
    if (newConfig.refreshInterval && this.refreshTimer) {
      this.stopEnhancementLoop();
      this.startEnhancementLoop();
    }

    this.hudLogger.info(
      'HUD enhancement configuration updated',
      'hud-config',
      { config: this.config }
    );
  }

  /**
   * Get enhancement statistics
   */
  getEnhancementStats(): {
    subscriberCount: number;
    activeAlerts: number;
    lastUpdateTime: Date | null;
    averageUpdateLatency: number;
    totalAlertsGenerated: number;
  } {
    const activeAlerts = this.getActiveAlerts();
    
    return {
      subscriberCount: this.subscribers.size,
      activeAlerts: activeAlerts.length,
      lastUpdateTime: this.currentPayload?.timestamp || null,
      averageUpdateLatency: 0, // Would track in real implementation
      totalAlertsGenerated: this.alerts.size
    };
  }

  private async updatePayload(): Promise<void> {
    try {
      const traceId = this.generateTraceId();
      const startTime = Date.now();

      // Collect data from all systems
      const [
        consensusData,
        tokenData,
        swarmData,
        kernelStats
      ] = await Promise.all([
        this.collectConsensusData(),
        this.collectTokenData(),
        this.collectSwarmData(),
        unifiedKernels.getKernelStats()
      ]);

      // Generate alerts based on current data
      await this.generateSystemAlerts(consensusData, tokenData, swarmData);

      // Calculate performance metrics
      const performanceMetrics = {
        consensusLatency: this.calculateConsensusLatency(),
        tokenTransactionThroughput: this.calculateTokenThroughput(),
        systemLoad: this.calculateSystemLoad(kernelStats),
        errorRate: this.calculateErrorRate(kernelStats)
      };

      const payload: HUDPayloadData = {
        timestamp: new Date(),
        consensusData,
        tokenData,
        swarmData,
        systemAlerts: this.getActiveAlerts(),
        performanceMetrics,
        traceId
      };

      this.currentPayload = payload;

      // Notify all subscribers
      for (const [subscriberId, callback] of this.subscribers) {
        try {
          callback(payload);
        } catch (error) {
          this.hudLogger.error(
            `Error notifying HUD subscriber ${subscriberId}: ${error}`,
            'hud-notification',
            { subscriberId, error: error instanceof Error ? error.message : String(error) }
          );
        }
      }

      const updateTime = Date.now() - startTime;
      
      this.hudLogger.debug(
        `HUD payload updated`,
        'hud-update',
        {
          updateTime,
          subscriberCount: this.subscribers.size,
          alertCount: payload.systemAlerts.length,
          traceId
        }
      );

    } catch (error) {
      this.hudLogger.error(
        `Failed to update HUD payload: ${error}`,
        'hud-update',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  private async collectConsensusData(): Promise<HUDPayloadData['consensusData']> {
    const activeProposals = tokenPromotion.getActivePromotions();
    const swarmMetrics = swarmHive.getSwarmMetrics();
    
    const consensusResults = activeProposals
      .map(p => swarmHive.getConsensusResult(p.id))
      .filter(r => r !== null) as ConsensusResult[];
    
    const averageConsensusScore = consensusResults.length > 0
      ? consensusResults.reduce((sum, r) => sum + r.overallScore, 0) / consensusResults.length
      : 0;

    return {
      activeProposals: activeProposals.length,
      averageConsensusScore,
      consensusReachRate: swarmMetrics.consensusReachRate * 100,
      pendingEvaluations: swarmMetrics.pendingTasks
    };
  }

  private async collectTokenData(): Promise<HUDPayloadData['tokenData']> {
    const tokenStats = tokenKernel.getTokenEconomyStats();
    
    return {
      totalSupply: tokenStats.totalSupply,
      circulatingSupply: tokenStats.circulatingSupply,
      stakingRatio: tokenStats.stakingRatio * 100,
      recentTransactions: tokenStats.totalTransactions, // Could filter by time
      topHolders: tokenStats.topHolders
    };
  }

  private async collectSwarmData(): Promise<HUDPayloadData['swarmData']> {
    const swarmMetrics = swarmHive.getSwarmMetrics();
    
    return {
      activeEvaluators: swarmMetrics.activeEvaluators,
      pendingTasks: swarmMetrics.pendingTasks,
      averageResponseTime: swarmMetrics.averageConsensusTime,
      expertiseCoverage: swarmMetrics.expertiseCoverage
    };
  }

  private async generateSystemAlerts(
    consensusData: HUDPayloadData['consensusData'],
    tokenData: HUDPayloadData['tokenData'],
    swarmData: HUDPayloadData['swarmData']
  ): Promise<void> {
    // Low consensus alert
    if (consensusData.averageConsensusScore < this.config.alertThresholds.lowConsensus) {
      this.createAlert(
        'consensus_warning',
        'warning',
        'Low Consensus Scores',
        `Average consensus score is ${consensusData.averageConsensusScore.toFixed(1)}, below threshold of ${this.config.alertThresholds.lowConsensus}`,
        { actionRequired: true }
      );
    }

    // High staking ratio alert
    if (tokenData.stakingRatio > 90) {
      this.createAlert(
        'token_alert',
        'warning',
        'High Staking Ratio',
        `${tokenData.stakingRatio.toFixed(1)}% of tokens are staked, which may reduce liquidity`,
        { actionRequired: false }
      );
    }

    // Low evaluator count alert
    if (swarmData.activeEvaluators < 5) {
      this.createAlert(
        'consensus_warning',
        'error',
        'Low Evaluator Count',
        `Only ${swarmData.activeEvaluators} active evaluators available for consensus`,
        { actionRequired: true }
      );
    }

    // Proposal deadline alerts
    const activeProposals = tokenPromotion.getActivePromotions();
    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    for (const proposal of activeProposals) {
      if (proposal.votingEndTime < oneDayFromNow && proposal.votingEndTime > now) {
        this.createAlert(
          'proposal_deadline',
          'info',
          'Proposal Deadline Approaching',
          `Proposal "${proposal.title}" voting ends in less than 24 hours`,
          { relatedItems: [proposal.id] }
        );
      }
    }
  }

  private calculateScoreTrend(evaluations: any[]): 'improving' | 'stable' | 'declining' {
    if (evaluations.length < 3) return 'stable';
    
    const recent = evaluations.slice(0, 3).map(e => e.evaluation.overall);
    const older = evaluations.slice(-3).map(e => e.evaluation.overall);
    
    const recentAvg = recent.reduce((sum, score) => sum + score, 0) / recent.length;
    const olderAvg = older.reduce((sum, score) => sum + score, 0) / older.length;
    
    const difference = recentAvg - olderAvg;
    
    if (difference > 5) return 'improving';
    if (difference < -5) return 'declining';
    return 'stable';
  }

  private calculateTimeToConsensus(proposal: PromotionProposal, consensusResult: ConsensusResult): number {
    if (!consensusResult.consensusReached) return 0;
    
    const startTime = proposal.created.getTime();
    const endTime = consensusResult.timestamp.getTime();
    
    return Math.floor((endTime - startTime) / (1000 * 60 * 60)); // Hours
  }

  private calculateConsensusLatency(): number {
    // Simplified calculation - would track actual latencies in real implementation
    return Math.random() * 100 + 50; // 50-150ms
  }

  private calculateTokenThroughput(): number {
    // Simplified calculation - would track actual throughput
    return Math.random() * 50 + 10; // 10-60 transactions per minute
  }

  private calculateSystemLoad(kernelStats: any): number {
    // Simplified calculation based on operation counts
    const totalOps = kernelStats.totalOperations;
    const failedOps = kernelStats.failedOperations;
    
    return Math.min(100, (totalOps / 1000) * 100 + (failedOps / totalOps) * 50);
  }

  private calculateErrorRate(kernelStats: any): number {
    if (kernelStats.totalOperations === 0) return 0;
    return (kernelStats.failedOperations / kernelStats.totalOperations) * 100;
  }

  private startEnhancementLoop(): void {
    this.refreshTimer = setInterval(() => {
      this.updatePayload();
    }, this.config.refreshInterval);

    // Initial update
    this.updatePayload();

    this.hudLogger.info(
      'HUD enhancement loop started',
      'hud-enhancer',
      { refreshInterval: this.config.refreshInterval }
    );
  }

  private stopEnhancementLoop(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    this.hudLogger.info(
      'HUD enhancement loop stopped',
      'hud-enhancer'
    );
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  private generateTraceId(): string {
    return 'hud-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 6);
  }
}

// Singleton instance
export const hudEnhancer = new HUDEnhancer();

export default hudEnhancer;