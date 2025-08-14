/**
 * Analytics Module Index
 * Exports all analytics functionality for JRVI Phase 7
 */

// Core analytics modules
export { swarmHive, SwarmHive, type SwarmNode, type ConsensusMetrics, type SwarmEvent } from './swarmHive';
export { 
  hudPayloadManager, 
  HUDPayloadManager, 
  type HUDPayload, 
  type SystemMetrics,
  type PluginMetrics,
  type AnalyticsData,
  type RetentionData,
  type PerformanceData
} from './hudPayload';
export { 
  hudEnhancer, 
  HUDEnhancer, 
  type EnhancedHUDState,
  type VisualizationData,
  type ChartData,
  type GraphData
} from './hudEnhancer';

// Utility functions for analytics
export const analyticsUtils = {
  /**
   * Generate time-based filters for retention logs
   */
  createTimeFilter: (hours: number) => ({
    start: new Date(Date.now() - hours * 60 * 60 * 1000),
    end: new Date()
  }),

  /**
   * Calculate performance score from metrics
   */
  calculatePerformanceScore: (metrics: SystemMetrics) => {
    const memoryScore = Math.min(metrics.memory.totalMemories / 1000, 1) * 0.3;
    const pluginScore = (metrics.plugins.activePlugins / metrics.plugins.totalPlugins) * 0.3;
    const swarmScore = metrics.swarm.consensusHealth * 0.2;
    const kernelScore = metrics.kernel.score * 0.2;
    
    return (memoryScore + pluginScore + swarmScore + kernelScore) * 100;
  },

  /**
   * Format metrics for display
   */
  formatMetric: (value: number, type: 'percentage' | 'number' | 'time' | 'bytes') => {
    switch (type) {
      case 'percentage':
        return `${(value * 100).toFixed(1)}%`;
      case 'number':
        return value.toLocaleString();
      case 'time':
        return `${value.toFixed(1)}ms`;
      case 'bytes':
        if (value > 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)}MB`;
        if (value > 1024) return `${(value / 1024).toFixed(1)}KB`;
        return `${value}B`;
      default:
        return value.toString();
    }
  },

  /**
   * Generate color based on health score
   */
  getHealthColor: (score: number) => {
    if (score >= 0.8) return '#10B981'; // green
    if (score >= 0.6) return '#F59E0B'; // yellow
    if (score >= 0.4) return '#F97316'; // orange
    return '#EF4444'; // red
  },

  /**
   * Create sparkline data from time series
   */
  createSparkline: (data: number[], maxPoints: number = 20) => {
    if (data.length <= maxPoints) return data;
    
    const step = Math.floor(data.length / maxPoints);
    const sparkline: number[] = [];
    
    for (let i = 0; i < data.length; i += step) {
      const segment = data.slice(i, i + step);
      const average = segment.reduce((sum, val) => sum + val, 0) / segment.length;
      sparkline.push(average);
    }
    
    return sparkline;
  }
};

// Re-export memory engine with analytics
export { memoryEngine } from '../../memory/engine';

// Analytics initialization
export const initializeAnalytics = async () => {
  try {
    // Import modules dynamically to avoid circular dependencies
    const { hudPayloadManager } = await import('./hudPayload');
    const { swarmHive } = await import('./swarmHive');
    const { hudEnhancer } = await import('./hudEnhancer');
    
    console.log('🚀 JRVI Phase 7 Analytics initialized');
    console.log(`📊 HUD Payload Manager: Ready`);
    console.log(`🕸️ Swarm Hive: Ready`);
    console.log(`✨ HUD Enhancer: Ready`);
    
    // Start real-time data generation for demo
    startDemoDataGeneration(hudPayloadManager, swarmHive);
    
    return {
      payloadManager: hudPayloadManager,
      swarmHive,
      enhancer: hudEnhancer
    };
  } catch (error) {
    console.error('Failed to initialize analytics:', error);
    return null;
  }
};

// Demo data generation for testing
const startDemoDataGeneration = (payloadManager: any, swarmHive: any) => {
  // Add some demo swarm nodes
  if (swarmHive) {
    swarmHive.addNode({
      id: 'node-001',
      status: 'active',
      validationScore: 0.9,
      consensusParticipation: 10,
      failureCount: 0,
      nodeType: 'validator',
      metadata: {
        version: '1.0.0',
        capabilities: ['validation', 'consensus'],
        performance: {
          responseTime: 15,
          throughput: 100,
          errorRate: 0.01,
          uptime: 0.99
        }
      }
    });

    swarmHive.addNode({
      id: 'node-002',
      status: 'validating',
      validationScore: 0.8,
      consensusParticipation: 8,
      failureCount: 1,
      nodeType: 'worker',
      metadata: {
        version: '1.0.0',
        capabilities: ['processing'],
        performance: {
          responseTime: 25,
          throughput: 80,
          errorRate: 0.02,
          uptime: 0.95
        }
      }
    });

    swarmHive.addNode({
      id: 'node-003',
      status: 'active',
      validationScore: 0.95,
      consensusParticipation: 15,
      failureCount: 0,
      nodeType: 'validator',
      metadata: {
        version: '1.0.0',
        capabilities: ['validation', 'consensus', 'monitoring'],
        performance: {
          responseTime: 10,
          throughput: 120,
          errorRate: 0.005,
          uptime: 0.999
        }
      }
    });

    // Simulate periodic activity
    setInterval(() => {
      // Simulate validation attempts
      const nodes = ['node-001', 'node-002', 'node-003'];
      const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
      const success = Math.random() > 0.1; // 90% success rate
      
      swarmHive.recordValidation(randomNode, success, {
        blockHeight: Math.floor(Math.random() * 1000000),
        transactionCount: Math.floor(Math.random() * 100)
      });

      // Add retention logs
      if (payloadManager) {
        payloadManager.addRetentionLog({
          type: Math.random() > 0.5 ? 'memory' : 'plugin',
          event: success ? 'operation_success' : 'operation_failure',
          tags: ['demo', 'periodic'],
          success,
          details: { randomValue: Math.random() }
        });
      }
    }, 5000); // Every 5 seconds

    console.log('🎭 Demo data generation started');
  }
};