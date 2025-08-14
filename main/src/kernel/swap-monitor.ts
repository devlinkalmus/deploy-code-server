/**
 * JRVI Swap Monitor System
 * Handles kernel and component swap operations with audit compliance
 * Phase 12 implementation for live swap monitoring and manual swap events
 */

import { personaRouter } from '../persona/router';

export interface SwapEvent {
  id: string;
  traceId: string;
  timestamp: Date;
  type: 'kernel' | 'component';
  action: 'swap_initiated' | 'swap_approved' | 'swap_completed' | 'swap_failed' | 'swap_rolled_back';
  source: {
    id: string;
    version: string;
    persona: string;
  };
  target: {
    id: string;
    version: string;
    persona: string;
  };
  rationale: string;
  initiator: {
    type: 'user' | 'audit' | 'system';
    userId?: string;
    auditRule?: string;
  };
  approvals: SwapApproval[];
  status: 'pending' | 'approved' | 'active' | 'completed' | 'failed' | 'rolled_back';
  constitutional_check: boolean;
  retention_expires: Date;
}

export interface SwapApproval {
  approver: string;
  timestamp: Date;
  decision: 'approved' | 'rejected';
  reason: string;
}

export interface ComponentStatus {
  id: string;
  name: string;
  version: string;
  status: 'active' | 'inactive' | 'swapping' | 'failed' | 'maintenance';
  health: 'healthy' | 'warning' | 'critical';
  lastSwap?: Date;
  persona: string;
  dependencies: string[];
  metrics: {
    uptime: number;
    swapCount: number;
    failureRate: number;
  };
}

export interface KernelStatus {
  id: string;
  name: string;
  version: string;
  status: 'active' | 'inactive' | 'swapping' | 'failed' | 'maintenance';
  health: 'healthy' | 'warning' | 'critical';
  lastSwap?: Date;
  persona: string;
  components: string[];
  metrics: {
    uptime: number;
    swapCount: number;
    failureRate: number;
    memoryUsage: number;
  };
}

export interface SwapSnapshot {
  id: string;
  timestamp: Date;
  traceId: string;
  persona: string;
  kernelStates: Record<string, any>;
  componentStates: Record<string, any>;
  systemState: any;
  checksum: string;
}

export class SwapMonitor {
  private swapHistory: SwapEvent[] = [];
  private snapshots: SwapSnapshot[] = [];
  private kernelStatuses: Map<string, KernelStatus> = new Map();
  private componentStatuses: Map<string, ComponentStatus> = new Map();
  private retentionDays: number = 90;

  constructor() {
    this.initializeStatuses();
    this.setupCleanupSchedule();
  }

  /**
   * Initialize default kernel and component statuses
   */
  private initializeStatuses(): void {
    // Initialize kernel statuses for each brand
    const brands = personaRouter.getAvailableBrands();
    brands.forEach(brand => {
      this.kernelStatuses.set(`${brand.id}_kernel`, {
        id: `${brand.id}_kernel`,
        name: `${brand.name} Kernel`,
        version: '1.0.0',
        status: 'active',
        health: 'healthy',
        persona: brand.id,
        components: [`${brand.id}_logic`, `${brand.id}_memory`, `${brand.id}_rag`],
        metrics: {
          uptime: 100,
          swapCount: 0,
          failureRate: 0,
          memoryUsage: Math.random() * 50 + 10 // 10-60%
        }
      });

      // Initialize component statuses for each brand
      const components = [`${brand.id}_logic`, `${brand.id}_memory`, `${brand.id}_rag`];
      components.forEach(componentId => {
        this.componentStatuses.set(componentId, {
          id: componentId,
          name: componentId.replace('_', ' ').toUpperCase(),
          version: '1.0.0',
          status: 'active',
          health: 'healthy',
          persona: brand.id,
          dependencies: [],
          metrics: {
            uptime: 100,
            swapCount: 0,
            failureRate: 0
          }
        });
      });
    });
  }

  /**
   * Initiate a manual swap operation
   */
  async initiateSwap(
    type: 'kernel' | 'component',
    sourceId: string,
    targetVersion: string,
    rationale: string,
    initiator: SwapEvent['initiator']
  ): Promise<string> {
    const traceId = this.generateTraceId();
    const currentPersona = personaRouter.getCurrentBrand().id;

    // Create snapshot before swap
    const preSwapSnapshot = await this.createSnapshot(traceId, currentPersona);
    
    const swapEvent: SwapEvent = {
      id: this.generateEventId(),
      traceId,
      timestamp: new Date(),
      type,
      action: 'swap_initiated',
      source: {
        id: sourceId,
        version: this.getEntityVersion(sourceId),
        persona: currentPersona
      },
      target: {
        id: sourceId,
        version: targetVersion,
        persona: currentPersona
      },
      rationale,
      initiator,
      approvals: [],
      status: 'pending',
      constitutional_check: await this.performConstitutionalCheck(type, sourceId, rationale),
      retention_expires: new Date(Date.now() + this.retentionDays * 24 * 60 * 60 * 1000)
    };

    this.swapHistory.push(swapEvent);
    this.logAuditEvent('swap_initiated', swapEvent);

    // Auto-approve if constitutional check passes and initiator is system
    if (swapEvent.constitutional_check && initiator.type === 'system') {
      await this.approveSwap(swapEvent.id, 'system', 'Auto-approved system swap');
    }

    return swapEvent.id;
  }

  /**
   * Approve a pending swap operation
   */
  async approveSwap(eventId: string, approverId: string, reason: string): Promise<boolean> {
    const event = this.swapHistory.find(e => e.id === eventId);
    if (!event || event.status !== 'pending') {
      return false;
    }

    const approval: SwapApproval = {
      approver: approverId,
      timestamp: new Date(),
      decision: 'approved',
      reason
    };

    event.approvals.push(approval);
    event.status = 'approved';
    event.action = 'swap_approved';

    this.logAuditEvent('swap_approved', event);

    // Execute the swap
    await this.executeSwap(event);

    return true;
  }

  /**
   * Execute the approved swap
   */
  private async executeSwap(event: SwapEvent): Promise<void> {
    try {
      event.status = 'active';
      event.action = 'swap_initiated';

      // Update entity status
      const entityStatus = event.type === 'kernel' 
        ? this.kernelStatuses.get(event.source.id)
        : this.componentStatuses.get(event.source.id);

      if (entityStatus) {
        entityStatus.status = 'swapping';
        entityStatus.version = event.target.version;
        entityStatus.lastSwap = new Date();
        entityStatus.metrics.swapCount++;
      }

      // Simulate swap execution (in real implementation, this would perform actual swap)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Complete the swap
      event.status = 'completed';
      event.action = 'swap_completed';

      if (entityStatus) {
        entityStatus.status = 'active';
        entityStatus.health = 'healthy';
      }

      // Create post-swap snapshot
      const postSwapSnapshot = await this.createSnapshot(event.traceId, event.source.persona);

      this.logAuditEvent('swap_completed', event);

    } catch (error) {
      event.status = 'failed';
      event.action = 'swap_failed';
      
      const entityStatus = event.type === 'kernel' 
        ? this.kernelStatuses.get(event.source.id)
        : this.componentStatuses.get(event.source.id);

      if (entityStatus) {
        entityStatus.status = 'failed';
        entityStatus.health = 'critical';
        entityStatus.metrics.failureRate++;
      }

      this.logAuditEvent('swap_failed', { ...event, error });
    }
  }

  /**
   * Create a system snapshot
   */
  async createSnapshot(traceId: string, persona: string): Promise<SwapSnapshot> {
    const snapshot: SwapSnapshot = {
      id: this.generateSnapshotId(),
      timestamp: new Date(),
      traceId,
      persona,
      kernelStates: {},
      componentStates: {},
      systemState: {
        currentPersona: persona,
        activeBrands: personaRouter.getAvailableBrands().length,
        timestamp: new Date().toISOString()
      },
      checksum: ''
    };

    // Capture kernel states
    this.kernelStatuses.forEach((status, id) => {
      snapshot.kernelStates[id] = { ...status };
    });

    // Capture component states
    this.componentStatuses.forEach((status, id) => {
      snapshot.componentStates[id] = { ...status };
    });

    // Generate checksum
    snapshot.checksum = this.generateChecksum(snapshot);

    this.snapshots.push(snapshot);
    return snapshot;
  }

  /**
   * Get current system status
   */
  getSystemStatus(): {
    kernels: KernelStatus[];
    components: ComponentStatus[];
    activeSwaps: SwapEvent[];
    recentHistory: SwapEvent[];
  } {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return {
      kernels: Array.from(this.kernelStatuses.values()),
      components: Array.from(this.componentStatuses.values()),
      activeSwaps: this.swapHistory.filter(e => ['pending', 'approved', 'active'].includes(e.status)),
      recentHistory: this.swapHistory
        .filter(e => e.timestamp >= last24Hours)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10)
    };
  }

  /**
   * Export swap history (for compliance)
   */
  exportSwapHistory(startDate?: Date, endDate?: Date): SwapEvent[] {
    let filtered = this.swapHistory;

    if (startDate) {
      filtered = filtered.filter(e => e.timestamp >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter(e => e.timestamp <= endDate);
    }

    return filtered.map(event => ({
      ...event,
      // Ensure sensitive data is preserved for audit
      _exported: new Date(),
      _retention_policy: '90_days_minimum'
    }));
  }

  /**
   * Get replay data for logic replay system
   */
  getReplayData(snapshotId: string): SwapSnapshot | null {
    return this.snapshots.find(s => s.id === snapshotId) || null;
  }

  /**
   * Perform constitutional compliance check
   */
  private async performConstitutionalCheck(
    type: 'kernel' | 'component',
    entityId: string,
    rationale: string
  ): Promise<boolean> {
    // JRVI Constitution and Core Principles compliance check
    
    // 1. Check if swap aligns with brand principles
    const currentBrand = personaRouter.getCurrentBrand();
    if (!entityId.startsWith(currentBrand.id)) {
      return false; // Cross-brand swaps require special approval
    }

    // 2. Check rationale completeness
    if (!rationale || rationale.length < 10) {
      return false; // Insufficient rationale
    }

    // 3. Check for AlphaOmega exclusion compliance
    if (rationale.toLowerCase().includes('alphaomega') || entityId.includes('ALPHAOMEGA')) {
      return false; // AlphaOmega explicitly excluded
    }

    // 4. Audit compliance check
    const auditTrail = personaRouter.getAuditTrail();
    const recentSwaps = this.swapHistory
      .filter(e => e.timestamp > new Date(Date.now() - 60 * 60 * 1000)) // Last hour
      .length;

    if (recentSwaps > 5) {
      return false; // Too many swaps in short period
    }

    return true;
  }

  /**
   * Log audit event
   */
  private logAuditEvent(action: string, data: any): void {
    // Integration with existing audit system
    console.log(`[SWAP-AUDIT][${new Date().toISOString()}] ${action}:`, {
      action,
      timestamp: new Date(),
      data: {
        eventId: data.id,
        traceId: data.traceId,
        type: data.type,
        status: data.status,
        persona: data.source?.persona,
        constitutional_check: data.constitutional_check
      }
    });
  }

  /**
   * Utility functions
   */
  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `swap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSnapshotId(): string {
    return `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getEntityVersion(entityId: string): string {
    const kernelStatus = this.kernelStatuses.get(entityId);
    const componentStatus = this.componentStatuses.get(entityId);
    return kernelStatus?.version || componentStatus?.version || '1.0.0';
  }

  private generateChecksum(snapshot: SwapSnapshot): string {
    const data = JSON.stringify({
      kernelStates: snapshot.kernelStates,
      componentStates: snapshot.componentStates,
      systemState: snapshot.systemState
    });
    
    // Simple checksum (in production, use proper cryptographic hash)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Setup cleanup schedule for expired records
   */
  private setupCleanupSchedule(): void {
    // Clean up expired records every hour
    setInterval(() => {
      const now = new Date();
      
      // Remove expired swap events
      this.swapHistory = this.swapHistory.filter(event => event.retention_expires > now);
      
      // Remove old snapshots (keep last 100 or within retention period)
      this.snapshots = this.snapshots
        .filter(snapshot => snapshot.timestamp > new Date(now.getTime() - this.retentionDays * 24 * 60 * 60 * 1000))
        .slice(-100);
        
    }, 60 * 60 * 1000); // Every hour
  }
}

// Export singleton instance
export const swapMonitor = new SwapMonitor();