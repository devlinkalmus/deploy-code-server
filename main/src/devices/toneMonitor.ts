/**
 * Device Tone Monitor for JRVI Phase 11
 * Handles real-time device tone monitoring and emotion context sync
 */

import { 
  ToneAnalysis, 
  EmotionReading, 
  EmotionType, 
  ToneContext, 
  ToneRecommendation,
  DeviceEvent,
  DeviceEventType,
  AuditInfo
} from './types';
import { personaRouter } from '../persona/router';
import { enforceKernel } from '../kernel';
import logger from '../logger';

export interface ToneMonitorConfig {
  enabled: boolean;
  realTimeSync: boolean;
  analysisInterval: number;
  emotionConfidenceThreshold: number;
  maxHistoryEntries: number;
  auditAll: boolean;
}

export class DeviceToneMonitor {
  private config: ToneMonitorConfig;
  private analysisHistory: ToneAnalysis[] = [];
  private emotionPatterns: Map<string, EmotionReading[]> = new Map();
  private activeMonitoring: Map<string, NodeJS.Timeout> = new Map();
  private contextCache: Map<string, ToneContext> = new Map();

  constructor(config: Partial<ToneMonitorConfig> = {}) {
    this.config = {
      enabled: true,
      realTimeSync: true,
      analysisInterval: 5000, // 5 seconds
      emotionConfidenceThreshold: 0.7,
      maxHistoryEntries: 1000,
      auditAll: true,
      ...config
    };

    if (this.config.enabled) {
      this.initializeMonitoring();
    }
  }

  /**
   * Initialize tone monitoring system
   */
  private initializeMonitoring(): void {
    try {
      logger.log('DeviceToneMonitor: Initializing tone monitoring system', { config: this.config });
      
      // Start global monitoring if real-time sync is enabled
      if (this.config.realTimeSync) {
        this.startGlobalMonitoring();
      }

      // Enforce kernel compliance
      enforceKernel({ persona: 'SYSTEM_TONE_MONITOR' });
    } catch (error) {
      logger.error('DeviceToneMonitor: Failed to initialize monitoring', { error });
      throw error;
    }
  }

  /**
   * Start monitoring a specific device
   */
  startDeviceMonitoring(deviceId: string, persona: string): void {
    try {
      if (!this.config.enabled) {
        logger.warn('DeviceToneMonitor: Monitoring disabled, skipping device monitoring start', { deviceId });
        return;
      }

      // Stop existing monitoring for this device
      this.stopDeviceMonitoring(deviceId);

      // Start new monitoring
      const monitoringInterval = setInterval(() => {
        this.performToneAnalysis(deviceId, persona);
      }, this.config.analysisInterval);

      this.activeMonitoring.set(deviceId, monitoringInterval);

      logger.log('DeviceToneMonitor: Started monitoring device', { 
        deviceId, 
        persona, 
        interval: this.config.analysisInterval 
      });

      // Log audit event
      this.logAuditEvent(deviceId, 'monitoring_started', persona, { 
        interval: this.config.analysisInterval 
      });

    } catch (error) {
      logger.error('DeviceToneMonitor: Failed to start device monitoring', { deviceId, persona, error });
    }
  }

  /**
   * Stop monitoring a specific device
   */
  stopDeviceMonitoring(deviceId: string): void {
    const interval = this.activeMonitoring.get(deviceId);
    if (interval) {
      clearInterval(interval);
      this.activeMonitoring.delete(deviceId);
      logger.log('DeviceToneMonitor: Stopped monitoring device', { deviceId });
    }
  }

  /**
   * Handle device tone analysis
   */
  async handleDeviceTone(
    deviceId: string, 
    rawToneData: any, 
    persona: string,
    traceId: string
  ): Promise<ToneAnalysis> {
    try {
      // Enforce kernel compliance
      enforceKernel({ persona });

      const timestamp = new Date();
      
      // Extract emotions from raw tone data
      const emotions = this.extractEmotions(rawToneData, deviceId);
      
      // Build tone context
      const context = this.buildToneContext(deviceId, persona, emotions);
      
      // Calculate confidence
      const confidence = this.calculateConfidence(emotions);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(emotions, context, persona);

      const analysis: ToneAnalysis = {
        deviceId,
        timestamp,
        traceId,
        persona,
        emotions,
        context,
        confidence,
        recommendations
      };

      // Store analysis
      this.storeAnalysis(analysis);

      // Process recommendations if confidence is high enough
      if (confidence >= this.config.emotionConfidenceThreshold) {
        await this.processRecommendations(analysis);
      }

      // Real-time sync if enabled
      if (this.config.realTimeSync) {
        this.syncEmotionContext(analysis);
      }

      // Audit logging
      this.logAuditEvent(deviceId, 'tone_analyzed', persona, {
        emotions: emotions.map(e => ({ emotion: e.emotion, intensity: e.intensity })),
        confidence,
        recommendationCount: recommendations.length
      });

      logger.log('DeviceToneMonitor: Completed tone analysis', {
        deviceId,
        persona,
        traceId,
        emotionCount: emotions.length,
        confidence,
        recommendationCount: recommendations.length
      });

      return analysis;

    } catch (error) {
      logger.error('DeviceToneMonitor: Failed to handle device tone', { 
        deviceId, 
        persona, 
        traceId, 
        error 
      });
      throw error;
    }
  }

  /**
   * Extract emotions from raw tone data
   */
  private extractEmotions(rawToneData: any, deviceId: string): EmotionReading[] {
    const emotions: EmotionReading[] = [];

    try {
      // Mock emotion extraction - in real implementation, this would use ML/AI
      const mockEmotions = [
        {
          emotion: EmotionType.FOCUSED,
          intensity: 0.8,
          confidence: 0.85,
          duration: 120000, // 2 minutes
          triggers: ['device_interaction', 'task_completion']
        },
        {
          emotion: EmotionType.SATISFIED,
          intensity: 0.6,
          confidence: 0.75,
          duration: 60000, // 1 minute
          triggers: ['positive_feedback', 'successful_action']
        }
      ];

      // Filter emotions by confidence threshold
      return mockEmotions.filter(emotion => 
        emotion.confidence >= this.config.emotionConfidenceThreshold
      );

    } catch (error) {
      logger.error('DeviceToneMonitor: Failed to extract emotions', { deviceId, error });
      return emotions;
    }
  }

  /**
   * Build tone context for analysis
   */
  private buildToneContext(deviceId: string, persona: string, emotions: EmotionReading[]): ToneContext {
    const cached = this.contextCache.get(deviceId);
    const previousTone = cached?.previousTone;

    const context: ToneContext = {
      environment: 'device_interaction',
      interactions: this.getDeviceInteractionCount(deviceId),
      previousTone,
      brandContext: persona,
      deviceContext: [deviceId, `${deviceId}_tone_analysis`]
    };

    this.contextCache.set(deviceId, context);
    return context;
  }

  /**
   * Calculate confidence score for emotion analysis
   */
  private calculateConfidence(emotions: EmotionReading[]): number {
    if (emotions.length === 0) return 0;

    const totalConfidence = emotions.reduce((sum, emotion) => sum + emotion.confidence, 0);
    return totalConfidence / emotions.length;
  }

  /**
   * Generate recommendations based on tone analysis
   */
  private generateRecommendations(
    emotions: EmotionReading[], 
    context: ToneContext, 
    persona: string
  ): ToneRecommendation[] {
    const recommendations: ToneRecommendation[] = [];

    for (const emotion of emotions) {
      if (emotion.emotion === EmotionType.FRUSTRATED) {
        recommendations.push({
          action: 'route_to_support',
          persona: 'JRVI',
          priority: 1,
          parameters: { emotion: emotion.emotion, intensity: emotion.intensity },
          reasoning: 'High frustration detected, route to support persona'
        });
      } else if (emotion.emotion === EmotionType.SATISFIED) {
        recommendations.push({
          action: 'maintain_current_interaction',
          persona,
          priority: 3,
          parameters: { emotion: emotion.emotion, intensity: emotion.intensity },
          reasoning: 'Positive emotion detected, maintain current interaction style'
        });
      }
    }

    return recommendations;
  }

  /**
   * Store tone analysis in history
   */
  private storeAnalysis(analysis: ToneAnalysis): void {
    this.analysisHistory.push(analysis);

    // Maintain history size limit
    if (this.analysisHistory.length > this.config.maxHistoryEntries) {
      this.analysisHistory = this.analysisHistory.slice(-this.config.maxHistoryEntries);
    }

    // Store emotion patterns for device
    const devicePatterns = this.emotionPatterns.get(analysis.deviceId) || [];
    devicePatterns.push(...analysis.emotions);
    this.emotionPatterns.set(analysis.deviceId, devicePatterns.slice(-100)); // Keep last 100 emotions
  }

  /**
   * Process recommendations from tone analysis
   */
  private async processRecommendations(analysis: ToneAnalysis): Promise<void> {
    for (const recommendation of analysis.recommendations) {
      try {
        // Route high-priority recommendations through persona router
        if (recommendation.priority <= 2) {
          const routingResult = personaRouter.routeRequest({
            keywords: [recommendation.action],
            userPreference: recommendation.persona,
            previousBrand: analysis.persona
          });

          logger.log('DeviceToneMonitor: Processed recommendation', {
            deviceId: analysis.deviceId,
            action: recommendation.action,
            routedTo: routingResult.id,
            priority: recommendation.priority
          });
        }
      } catch (error) {
        logger.error('DeviceToneMonitor: Failed to process recommendation', {
          deviceId: analysis.deviceId,
          recommendation,
          error
        });
      }
    }
  }

  /**
   * Sync emotion context with other systems
   */
  private syncEmotionContext(analysis: ToneAnalysis): void {
    try {
      // In real implementation, this would sync with external emotion context systems
      logger.log('DeviceToneMonitor: Syncing emotion context', {
        deviceId: analysis.deviceId,
        persona: analysis.persona,
        emotions: analysis.emotions.map(e => e.emotion),
        confidence: analysis.confidence
      });
    } catch (error) {
      logger.error('DeviceToneMonitor: Failed to sync emotion context', {
        deviceId: analysis.deviceId,
        error
      });
    }
  }

  /**
   * Perform periodic tone analysis
   */
  private async performToneAnalysis(deviceId: string, persona: string): Promise<void> {
    try {
      // Generate mock tone data for periodic analysis
      const mockToneData = {
        timestamp: new Date(),
        audioLevel: Math.random() * 100,
        emotionalMarkers: ['focused', 'active'],
        contextData: { deviceInteraction: true }
      };

      const traceId = `tone_${Date.now()}_${deviceId}`;
      await this.handleDeviceTone(deviceId, mockToneData, persona, traceId);

    } catch (error) {
      logger.error('DeviceToneMonitor: Failed periodic tone analysis', {
        deviceId,
        persona,
        error
      });
    }
  }

  /**
   * Start global monitoring across all devices
   */
  private startGlobalMonitoring(): void {
    logger.log('DeviceToneMonitor: Starting global real-time monitoring');
    // Global monitoring implementation would go here
  }

  /**
   * Get device interaction count for context
   */
  private getDeviceInteractionCount(deviceId: string): number {
    const patterns = this.emotionPatterns.get(deviceId);
    return patterns ? patterns.length : 0;
  }

  /**
   * Log audit event for compliance
   */
  private logAuditEvent(deviceId: string, action: string, persona: string, details: any): void {
    if (!this.config.auditAll) return;

    const auditInfo: AuditInfo = {
      persona,
      traceId: `audit_${Date.now()}_${deviceId}`,
      timestamp: new Date(),
      compliance: true,
      reviewRequired: false,
      tags: ['device_tone', 'monitoring', action]
    };

    logger.log('DeviceToneMonitor: Audit event logged', {
      deviceId,
      action,
      persona,
      details,
      auditInfo
    });
  }

  /**
   * Get tone analysis history
   */
  getAnalysisHistory(deviceId?: string): ToneAnalysis[] {
    if (deviceId) {
      return this.analysisHistory.filter(analysis => analysis.deviceId === deviceId);
    }
    return [...this.analysisHistory];
  }

  /**
   * Get emotion patterns for a device
   */
  getEmotionPatterns(deviceId: string): EmotionReading[] {
    return this.emotionPatterns.get(deviceId) || [];
  }

  /**
   * Get monitoring status
   */
  getMonitoringStatus(): {
    enabled: boolean;
    activeDevices: string[];
    totalAnalyses: number;
    averageConfidence: number;
  } {
    const averageConfidence = this.analysisHistory.length > 0 
      ? this.analysisHistory.reduce((sum, analysis) => sum + analysis.confidence, 0) / this.analysisHistory.length
      : 0;

    return {
      enabled: this.config.enabled,
      activeDevices: Array.from(this.activeMonitoring.keys()),
      totalAnalyses: this.analysisHistory.length,
      averageConfidence
    };
  }

  /**
   * Clean up resources
   */
  shutdown(): void {
    for (const [deviceId] of this.activeMonitoring) {
      this.stopDeviceMonitoring(deviceId);
    }
    this.activeMonitoring.clear();
    logger.log('DeviceToneMonitor: Shutdown completed');
  }
}

// Export singleton instance
export const deviceToneMonitor = new DeviceToneMonitor();