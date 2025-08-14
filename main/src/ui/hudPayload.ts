/**
 * HUD Payload - Data structures and utilities for HUD data transmission
 * Handles serialization, compression, and transmission of HUD data to UI components
 */

import { HUDPayloadData, SystemAlert, ConsensusVisualization, TokenVisualization } from './hudEnhancer';

export interface HUDPayloadEnvelope {
  version: string;
  timestamp: Date;
  traceId: string;
  checksum: string;
  compressed: boolean;
  data: HUDPayloadData | string; // String if compressed
  metadata: {
    size: number;
    compressionRatio?: number;
    generationTime: number;
    source: string;
  };
}

export interface HUDPayloadSubscription {
  id: string;
  filter?: HUDPayloadFilter;
  includeConsensusData: boolean;
  includeTokenData: boolean;
  includeSwarmData: boolean;
  includeAlerts: boolean;
  alertSeverityFilter?: SystemAlert['severity'][];
  maxAlerts: number;
  compressionEnabled: boolean;
}

export interface HUDPayloadFilter {
  proposalIds?: string[];
  alertTypes?: SystemAlert['type'][];
  minConsensusScore?: number;
  tokenAddresses?: string[];
  timeRange?: {
    start: Date;
    end: Date;
  };
}

export interface HUDPayloadDelta {
  timestamp: Date;
  traceId: string;
  changes: Array<{
    path: string;
    operation: 'add' | 'update' | 'delete';
    oldValue?: any;
    newValue?: any;
  }>;
  fullPayloadRequired: boolean;
}

export interface HUDPayloadStats {
  totalPayloads: number;
  averageSize: number;
  averageGenerationTime: number;
  compressionSavings: number;
  errorRate: number;
  subscriptionCount: number;
  deltaUpdateCount: number;
}

class HUDPayload {
  private static readonly VERSION = '1.0.0';
  private static readonly MAX_PAYLOAD_SIZE = 1024 * 1024; // 1MB
  private static readonly COMPRESSION_THRESHOLD = 10240; // 10KB

  private lastPayload: HUDPayloadData | null = null;
  private payloadStats: HUDPayloadStats = {
    totalPayloads: 0,
    averageSize: 0,
    averageGenerationTime: 0,
    compressionSavings: 0,
    errorRate: 0,
    subscriptionCount: 0,
    deltaUpdateCount: 0
  };

  /**
   * Create HUD payload envelope
   */
  createPayloadEnvelope(
    data: HUDPayloadData,
    options?: {
      compress?: boolean;
      generateChecksum?: boolean;
    }
  ): HUDPayloadEnvelope {
    const startTime = Date.now();
    const compress = options?.compress ?? true;
    const generateChecksum = options?.generateChecksum ?? true;

    let serializedData: string;
    let compressed = false;
    let compressionRatio: number | undefined;

    try {
      serializedData = JSON.stringify(data);
      
      // Compress if data is large enough and compression is enabled
      if (compress && serializedData.length > HUDPayload.COMPRESSION_THRESHOLD) {
        const compressedData = this.compressData(serializedData);
        if (compressedData.length < serializedData.length * 0.8) {
          compressionRatio = compressedData.length / serializedData.length;
          serializedData = compressedData;
          compressed = true;
        }
      }

      const checksum = generateChecksum ? this.generateChecksum(serializedData) : '';
      const generationTime = Date.now() - startTime;
      
      const envelope: HUDPayloadEnvelope = {
        version: HUDPayload.VERSION,
        timestamp: new Date(),
        traceId: data.traceId,
        checksum,
        compressed,
        data: compressed ? serializedData : data,
        metadata: {
          size: serializedData.length,
          compressionRatio,
          generationTime,
          source: 'hud-payload'
        }
      };

      // Update statistics
      this.updateStats(envelope, generationTime);

      return envelope;

    } catch (error) {
      this.payloadStats.errorRate = this.calculateErrorRate(1);
      throw new Error(`Failed to create payload envelope: ${error}`);
    }
  }

  /**
   * Extract data from payload envelope
   */
  extractPayloadData(envelope: HUDPayloadEnvelope): HUDPayloadData {
    try {
      // Verify version compatibility
      if (!this.isVersionCompatible(envelope.version)) {
        throw new Error(`Incompatible payload version: ${envelope.version}`);
      }

      // Verify checksum if present
      if (envelope.checksum) {
        const dataToCheck = typeof envelope.data === 'string' ? envelope.data : JSON.stringify(envelope.data);
        const calculatedChecksum = this.generateChecksum(dataToCheck);
        if (calculatedChecksum !== envelope.checksum) {
          throw new Error('Payload checksum verification failed');
        }
      }

      let data: HUDPayloadData;

      if (envelope.compressed && typeof envelope.data === 'string') {
        // Decompress and parse
        const decompressedData = this.decompressData(envelope.data);
        data = JSON.parse(decompressedData);
      } else if (typeof envelope.data === 'object') {
        // Data is already an object
        data = envelope.data as HUDPayloadData;
      } else {
        // Parse JSON string
        data = JSON.parse(envelope.data as string);
      }

      return data;

    } catch (error) {
      this.payloadStats.errorRate = this.calculateErrorRate(1);
      throw new Error(`Failed to extract payload data: ${error}`);
    }
  }

  /**
   * Filter payload data based on subscription preferences
   */
  filterPayloadData(
    data: HUDPayloadData,
    subscription: HUDPayloadSubscription
  ): Partial<HUDPayloadData> {
    const filtered: Partial<HUDPayloadData> = {
      timestamp: data.timestamp,
      traceId: data.traceId
    };

    // Include consensus data if requested
    if (subscription.includeConsensusData) {
      filtered.consensusData = data.consensusData;
    }

    // Include token data if requested
    if (subscription.includeTokenData) {
      filtered.tokenData = data.tokenData;
    }

    // Include swarm data if requested
    if (subscription.includeSwarmData) {
      filtered.swarmData = data.swarmData;
    }

    // Include alerts with filtering
    if (subscription.includeAlerts) {
      let alerts = data.systemAlerts;

      // Filter by severity if specified
      if (subscription.alertSeverityFilter && subscription.alertSeverityFilter.length > 0) {
        alerts = alerts.filter(alert => subscription.alertSeverityFilter!.includes(alert.severity));
      }

      // Filter by type if specified
      if (subscription.filter?.alertTypes && subscription.filter.alertTypes.length > 0) {
        alerts = alerts.filter(alert => subscription.filter!.alertTypes!.includes(alert.type));
      }

      // Limit number of alerts
      alerts = alerts.slice(0, subscription.maxAlerts);

      filtered.systemAlerts = alerts;
    }

    // Always include performance metrics
    filtered.performanceMetrics = data.performanceMetrics;

    return filtered;
  }

  /**
   * Generate delta update between two payloads
   */
  generateDelta(oldPayload: HUDPayloadData, newPayload: HUDPayloadData): HUDPayloadDelta {
    const changes: HUDPayloadDelta['changes'] = [];
    
    try {
      // Compare consensus data
      if (JSON.stringify(oldPayload.consensusData) !== JSON.stringify(newPayload.consensusData)) {
        changes.push({
          path: 'consensusData',
          operation: 'update',
          oldValue: oldPayload.consensusData,
          newValue: newPayload.consensusData
        });
      }

      // Compare token data
      if (JSON.stringify(oldPayload.tokenData) !== JSON.stringify(newPayload.tokenData)) {
        changes.push({
          path: 'tokenData',
          operation: 'update',
          oldValue: oldPayload.tokenData,
          newValue: newPayload.tokenData
        });
      }

      // Compare swarm data
      if (JSON.stringify(oldPayload.swarmData) !== JSON.stringify(newPayload.swarmData)) {
        changes.push({
          path: 'swarmData',
          operation: 'update',
          oldValue: oldPayload.swarmData,
          newValue: newPayload.swarmData
        });
      }

      // Compare alerts (more detailed comparison)
      const alertChanges = this.compareAlerts(oldPayload.systemAlerts, newPayload.systemAlerts);
      changes.push(...alertChanges);

      // Compare performance metrics
      if (JSON.stringify(oldPayload.performanceMetrics) !== JSON.stringify(newPayload.performanceMetrics)) {
        changes.push({
          path: 'performanceMetrics',
          operation: 'update',
          oldValue: oldPayload.performanceMetrics,
          newValue: newPayload.performanceMetrics
        });
      }

      const fullPayloadRequired = changes.length > 10 || 
        changes.some(c => c.path === 'consensusData' || c.path === 'tokenData');

      this.payloadStats.deltaUpdateCount++;

      return {
        timestamp: newPayload.timestamp,
        traceId: newPayload.traceId,
        changes,
        fullPayloadRequired
      };

    } catch (error) {
      return {
        timestamp: newPayload.timestamp,
        traceId: newPayload.traceId,
        changes: [],
        fullPayloadRequired: true
      };
    }
  }

  /**
   * Validate payload data integrity
   */
  validatePayload(data: HUDPayloadData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      // Check required fields
      if (!data.timestamp) errors.push('Missing timestamp');
      if (!data.traceId) errors.push('Missing traceId');
      
      // Validate consensus data
      if (data.consensusData) {
        if (typeof data.consensusData.activeProposals !== 'number') {
          errors.push('Invalid consensusData.activeProposals');
        }
        if (typeof data.consensusData.averageConsensusScore !== 'number' || 
            data.consensusData.averageConsensusScore < 0 || 
            data.consensusData.averageConsensusScore > 100) {
          errors.push('Invalid consensusData.averageConsensusScore');
        }
      }

      // Validate token data
      if (data.tokenData) {
        if (typeof data.tokenData.totalSupply !== 'number' || data.tokenData.totalSupply < 0) {
          errors.push('Invalid tokenData.totalSupply');
        }
        if (typeof data.tokenData.circulatingSupply !== 'number' || data.tokenData.circulatingSupply < 0) {
          errors.push('Invalid tokenData.circulatingSupply');
        }
      }

      // Validate alerts
      if (data.systemAlerts) {
        for (let i = 0; i < data.systemAlerts.length; i++) {
          const alert = data.systemAlerts[i];
          if (!alert.id) errors.push(`Alert ${i}: Missing id`);
          if (!alert.type) errors.push(`Alert ${i}: Missing type`);
          if (!alert.severity) errors.push(`Alert ${i}: Missing severity`);
          if (!alert.timestamp) errors.push(`Alert ${i}: Missing timestamp`);
        }
      }

      // Validate performance metrics
      if (data.performanceMetrics) {
        const metrics = data.performanceMetrics;
        if (typeof metrics.consensusLatency !== 'number' || metrics.consensusLatency < 0) {
          errors.push('Invalid performanceMetrics.consensusLatency');
        }
        if (typeof metrics.systemLoad !== 'number' || metrics.systemLoad < 0 || metrics.systemLoad > 100) {
          errors.push('Invalid performanceMetrics.systemLoad');
        }
      }

      return {
        valid: errors.length === 0,
        errors
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`Validation error: ${error}`]
      };
    }
  }

  /**
   * Get payload statistics
   */
  getStats(): HUDPayloadStats {
    return { ...this.payloadStats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.payloadStats = {
      totalPayloads: 0,
      averageSize: 0,
      averageGenerationTime: 0,
      compressionSavings: 0,
      errorRate: 0,
      subscriptionCount: 0,
      deltaUpdateCount: 0
    };
  }

  private compressData(data: string): string {
    // Simplified compression - in real implementation would use proper compression library
    try {
      // Simple compression using base64 encoding of shortened JSON
      const compressed = Buffer.from(data).toString('base64');
      return compressed.length < data.length ? compressed : data;
    } catch {
      return data;
    }
  }

  private decompressData(data: string): string {
    // Simplified decompression
    try {
      return Buffer.from(data, 'base64').toString('utf-8');
    } catch {
      return data;
    }
  }

  private generateChecksum(data: string): string {
    // Simple checksum - in real implementation would use proper hashing
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private isVersionCompatible(version: string): boolean {
    // Simple version check - major version must match
    const [major] = version.split('.');
    const [currentMajor] = HUDPayload.VERSION.split('.');
    return major === currentMajor;
  }

  private compareAlerts(oldAlerts: SystemAlert[], newAlerts: SystemAlert[]): HUDPayloadDelta['changes'] {
    const changes: HUDPayloadDelta['changes'] = [];
    
    const oldAlertIds = new Set(oldAlerts.map(a => a.id));
    const newAlertIds = new Set(newAlerts.map(a => a.id));

    // Find new alerts
    for (const alert of newAlerts) {
      if (!oldAlertIds.has(alert.id)) {
        changes.push({
          path: `systemAlerts.${alert.id}`,
          operation: 'add',
          newValue: alert
        });
      }
    }

    // Find removed alerts
    for (const alert of oldAlerts) {
      if (!newAlertIds.has(alert.id)) {
        changes.push({
          path: `systemAlerts.${alert.id}`,
          operation: 'delete',
          oldValue: alert
        });
      }
    }

    // Find updated alerts
    for (const newAlert of newAlerts) {
      const oldAlert = oldAlerts.find(a => a.id === newAlert.id);
      if (oldAlert && JSON.stringify(oldAlert) !== JSON.stringify(newAlert)) {
        changes.push({
          path: `systemAlerts.${newAlert.id}`,
          operation: 'update',
          oldValue: oldAlert,
          newValue: newAlert
        });
      }
    }

    return changes;
  }

  private updateStats(envelope: HUDPayloadEnvelope, generationTime: number): void {
    this.payloadStats.totalPayloads++;
    
    // Update average size
    const newSize = envelope.metadata.size;
    this.payloadStats.averageSize = 
      (this.payloadStats.averageSize * (this.payloadStats.totalPayloads - 1) + newSize) / 
      this.payloadStats.totalPayloads;

    // Update average generation time
    this.payloadStats.averageGenerationTime = 
      (this.payloadStats.averageGenerationTime * (this.payloadStats.totalPayloads - 1) + generationTime) / 
      this.payloadStats.totalPayloads;

    // Update compression savings
    if (envelope.compressed && envelope.metadata.compressionRatio) {
      const savings = 1 - envelope.metadata.compressionRatio;
      this.payloadStats.compressionSavings = 
        (this.payloadStats.compressionSavings * (this.payloadStats.totalPayloads - 1) + savings) / 
        this.payloadStats.totalPayloads;
    }
  }

  private calculateErrorRate(newErrors: number): number {
    const totalAttempts = this.payloadStats.totalPayloads + newErrors;
    return totalAttempts > 0 ? (newErrors / totalAttempts) * 100 : 0;
  }
}

// Singleton instance
export const hudPayload = new HUDPayload();

// Helper functions for creating specialized payloads
export function createConsensusPayload(visualizations: ConsensusVisualization[]): Partial<HUDPayloadData> {
  return {
    timestamp: new Date(),
    traceId: `consensus-${Date.now()}`,
    consensusData: {
      activeProposals: visualizations.length,
      averageConsensusScore: visualizations.reduce((sum, v) => sum + v.overallScore, 0) / visualizations.length,
      consensusReachRate: (visualizations.filter(v => v.consensusReached).length / visualizations.length) * 100,
      pendingEvaluations: visualizations.filter(v => !v.consensusReached).length
    }
  };
}

export function createTokenPayload(tokenViz: TokenVisualization): Partial<HUDPayloadData> {
  return {
    timestamp: new Date(),
    traceId: `token-${Date.now()}`,
    tokenData: {
      totalSupply: 0, // Would be filled from token kernel
      circulatingSupply: 0,
      stakingRatio: (tokenViz.stakedBalance / (tokenViz.accountBalance + tokenViz.stakedBalance)) * 100,
      recentTransactions: tokenViz.recentTransactions.length,
      topHolders: []
    }
  };
}

export function createAlertPayload(alerts: SystemAlert[]): Partial<HUDPayloadData> {
  return {
    timestamp: new Date(),
    traceId: `alert-${Date.now()}`,
    systemAlerts: alerts
  };
}

export default hudPayload;