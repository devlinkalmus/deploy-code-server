/**
 * Swarm Consensus Analytics - SwarmHive
 * Tracks node join/validation status and consensus metrics for JRVI Phase 7
 */

export interface SwarmNode {
  id: string;
  status: 'active' | 'joining' | 'validating' | 'inactive' | 'failed';
  joinedAt: Date;
  lastSeen: Date;
  validationScore: number;
  consensusParticipation: number;
  failureCount: number;
  nodeType: 'validator' | 'worker' | 'observer';
  metadata: {
    version: string;
    capabilities: string[];
    performance: NodePerformance;
  };
}

export interface NodePerformance {
  responseTime: number;
  throughput: number;
  errorRate: number;
  uptime: number;
}

export interface ConsensusMetrics {
  totalNodes: number;
  activeNodes: number;
  consensusHealth: number;
  averageValidationScore: number;
  networkLatency: number;
  consensusTime: number;
  failedValidations: number;
}

export interface SwarmEvent {
  timestamp: Date;
  type: 'node_join' | 'node_leave' | 'validation_success' | 'validation_failure' | 'consensus_reached' | 'consensus_failed';
  nodeId: string;
  details: any;
}

export class SwarmHive {
  private nodes: Map<string, SwarmNode> = new Map();
  private events: SwarmEvent[] = [];
  private consensusThreshold: number = 0.67; // 67% consensus required
  private maxEventHistory: number = 1000;

  constructor(consensusThreshold?: number) {
    if (consensusThreshold) {
      this.consensusThreshold = consensusThreshold;
    }
  }

  /**
   * Add or update a node in the swarm
   */
  addNode(nodeData: Omit<SwarmNode, 'joinedAt' | 'lastSeen'>): string {
    const node: SwarmNode = {
      ...nodeData,
      joinedAt: new Date(),
      lastSeen: new Date()
    };

    this.nodes.set(node.id, node);
    this.logEvent('node_join', node.id, { nodeType: node.nodeType });
    
    return node.id;
  }

  /**
   * Update node status and performance
   */
  updateNodeStatus(nodeId: string, status: SwarmNode['status'], performance?: Partial<NodePerformance>): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;

    const oldStatus = node.status;
    node.status = status;
    node.lastSeen = new Date();

    if (performance) {
      node.metadata.performance = { ...node.metadata.performance, ...performance };
    }

    // Log status change event
    if (oldStatus !== status) {
      this.logEvent(
        status === 'failed' ? 'node_leave' : 'validation_success', 
        nodeId, 
        { oldStatus, newStatus: status }
      );
    }

    return true;
  }

  /**
   * Record validation attempt
   */
  recordValidation(nodeId: string, success: boolean, validationData?: any): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;

    node.lastSeen = new Date();

    if (success) {
      node.validationScore = Math.min(node.validationScore + 0.1, 1.0);
      node.consensusParticipation += 1;
      this.logEvent('validation_success', nodeId, validationData);
    } else {
      node.validationScore = Math.max(node.validationScore - 0.2, 0);
      node.failureCount += 1;
      this.logEvent('validation_failure', nodeId, validationData);
    }

    return true;
  }

  /**
   * Get current consensus metrics
   */
  getConsensusMetrics(): ConsensusMetrics {
    const activeNodes = Array.from(this.nodes.values()).filter(
      node => node.status === 'active' || node.status === 'validating'
    );

    const totalValidationScore = activeNodes.reduce((sum, node) => sum + node.validationScore, 0);
    const averageValidationScore = activeNodes.length > 0 ? totalValidationScore / activeNodes.length : 0;

    const recentEvents = this.events.slice(-100);
    const failedValidations = recentEvents.filter(e => e.type === 'validation_failure').length;

    const networkLatency = activeNodes.reduce((sum, node) => sum + node.metadata.performance.responseTime, 0) / activeNodes.length || 0;

    return {
      totalNodes: this.nodes.size,
      activeNodes: activeNodes.length,
      consensusHealth: averageValidationScore,
      averageValidationScore,
      networkLatency,
      consensusTime: this.calculateAverageConsensusTime(),
      failedValidations
    };
  }

  /**
   * Get node join/validation status for analytics
   */
  getNodeAnalytics(): {
    nodeStatuses: Record<string, number>;
    performanceMetrics: NodePerformance[];
    recentJoins: SwarmNode[];
    topPerformers: SwarmNode[];
    problemNodes: SwarmNode[];
  } {
    const nodes = Array.from(this.nodes.values());
    
    // Count nodes by status
    const nodeStatuses: Record<string, number> = {};
    nodes.forEach(node => {
      nodeStatuses[node.status] = (nodeStatuses[node.status] || 0) + 1;
    });

    // Get performance metrics
    const performanceMetrics = nodes.map(node => node.metadata.performance);

    // Recent joins (last 24 hours)
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentJoins = nodes.filter(node => node.joinedAt > dayAgo);

    // Top performers (highest validation scores)
    const topPerformers = nodes
      .filter(node => node.status === 'active')
      .sort((a, b) => b.validationScore - a.validationScore)
      .slice(0, 10);

    // Problem nodes (high failure rate or low validation score)
    const problemNodes = nodes.filter(node => 
      node.failureCount > 5 || node.validationScore < 0.3
    );

    return {
      nodeStatuses,
      performanceMetrics,
      recentJoins,
      topPerformers,
      problemNodes
    };
  }

  /**
   * Get swarm events for a time range
   */
  getEventHistory(timeRange?: { start: Date; end: Date }): SwarmEvent[] {
    let events = [...this.events];

    if (timeRange) {
      events = events.filter(event => 
        event.timestamp >= timeRange.start && event.timestamp <= timeRange.end
      );
    }

    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Check if consensus can be reached with current active nodes
   */
  canReachConsensus(): boolean {
    const activeNodes = Array.from(this.nodes.values()).filter(
      node => node.status === 'active' || node.status === 'validating'
    );

    const eligibleNodes = activeNodes.filter(node => node.validationScore >= 0.5);
    const requiredNodes = Math.ceil(this.nodes.size * this.consensusThreshold);

    return eligibleNodes.length >= requiredNodes;
  }

  /**
   * Simulate consensus attempt
   */
  attemptConsensus(data: any): { success: boolean; participatingNodes: string[]; consensusTime: number } {
    const startTime = Date.now();
    const activeNodes = Array.from(this.nodes.values()).filter(
      node => (node.status === 'active' || node.status === 'validating') && node.validationScore >= 0.5
    );

    const participatingNodes = activeNodes.map(node => node.id);
    const success = this.canReachConsensus();

    // Update consensus participation
    activeNodes.forEach(node => {
      node.consensusParticipation += 1;
    });

    const consensusTime = Date.now() - startTime;

    this.logEvent(
      success ? 'consensus_reached' : 'consensus_failed',
      'system',
      { participatingNodes, consensusTime, data }
    );

    return { success, participatingNodes, consensusTime };
  }

  /**
   * Remove inactive nodes
   */
  cleanupInactiveNodes(inactiveThresholdHours: number = 24): number {
    const threshold = new Date(Date.now() - inactiveThresholdHours * 60 * 60 * 1000);
    let removedCount = 0;

    for (const [nodeId, node] of this.nodes) {
      if (node.lastSeen < threshold && node.status !== 'active') {
        this.nodes.delete(nodeId);
        this.logEvent('node_leave', nodeId, { reason: 'cleanup_inactive' });
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Export swarm state for analysis
   */
  exportSwarmState(): {
    timestamp: Date;
    nodes: SwarmNode[];
    metrics: ConsensusMetrics;
    recentEvents: SwarmEvent[];
  } {
    return {
      timestamp: new Date(),
      nodes: Array.from(this.nodes.values()),
      metrics: this.getConsensusMetrics(),
      recentEvents: this.events.slice(-100)
    };
  }

  private logEvent(type: SwarmEvent['type'], nodeId: string, details: any): void {
    const event: SwarmEvent = {
      timestamp: new Date(),
      type,
      nodeId,
      details
    };

    this.events.push(event);

    // Trim event history if too large
    if (this.events.length > this.maxEventHistory) {
      this.events = this.events.slice(-this.maxEventHistory);
    }
  }

  private calculateAverageConsensusTime(): number {
    const consensusEvents = this.events.filter(e => 
      e.type === 'consensus_reached' || e.type === 'consensus_failed'
    );

    if (consensusEvents.length === 0) return 0;

    const totalTime = consensusEvents.reduce((sum, event) => 
      sum + (event.details?.consensusTime || 0), 0
    );

    return totalTime / consensusEvents.length;
  }
}

// Singleton instance for global use
export const swarmHive = new SwarmHive();