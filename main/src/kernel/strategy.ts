/**
 * Strategy Kernel - Approval and routing system for all logic/memory/plugin changes
 * Enforces JRVI Core Principles and maintains audit trails
 */

import { logger, LogEntry, LogLevel } from '../utils/logging';
import { MemoryEntry, MemoryType } from '../memory/cltm_core';

export interface StrategyKernelConfig {
  enableApprovalChain: boolean;
  enableAuditTrail: boolean;
  enableFallback: boolean;
  freezeMode: boolean;
  maxRetryAttempts: number;
  timeoutMs: number;
  defaultBrandAffinity: string[];
}

export interface OperationRequest {
  id: string;
  type: OperationType;
  origin: string;
  target: string;
  payload: any;
  brandAffinity: string[];
  priority: Priority;
  requiresApproval: boolean;
  metadata: Record<string, any>;
  timestamp: Date;
  lineage?: string[];
  source?: string;
}

export enum OperationType {
  LOGIC_UPDATE = 'logic_update',
  MEMORY_CREATE = 'memory_create',
  MEMORY_UPDATE = 'memory_update',
  MEMORY_DELETE = 'memory_delete',
  PLUGIN_INSTALL = 'plugin_install',
  PLUGIN_UPDATE = 'plugin_update',
  PLUGIN_DISABLE = 'plugin_disable',
  KERNEL_ROUTE = 'kernel_route',
  BRAND_SWITCH = 'brand_switch',
  SECURITY_CHANGE = 'security_change'
}

export enum Priority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4,
  EMERGENCY = 5
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

export interface ApprovalEntry {
  requestId: string;
  status: ApprovalStatus;
  approver: string;
  timestamp: Date;
  reason?: string;
  conditions?: string[];
}

export interface RouteResult {
  success: boolean;
  result?: any;
  error?: string;
  fallbackUsed: boolean;
  processingTime: number;
  auditLogId: string;
}

export interface KernelAuditEntry {
  id: string;
  requestId: string;
  operation: OperationType;
  origin: string;
  target: string;
  status: 'started' | 'approved' | 'rejected' | 'completed' | 'failed' | 'fallback';
  timestamp: Date;
  details: Record<string, any>;
  brandAffinity: string[];
  lineage?: string[];
}

class StrategyKernel {
  private config: StrategyKernelConfig;
  private pendingRequests: Map<string, OperationRequest> = new Map();
  private approvals: Map<string, ApprovalEntry> = new Map();
  private auditTrail: KernelAuditEntry[] = [];
  private fallbackHandlers: Map<OperationType, (request: OperationRequest) => any | Promise<any>> = new Map();
  private kernelLogger = logger.createChildLogger('strategy-kernel');

  constructor(config: Partial<StrategyKernelConfig> = {}) {
    this.config = {
      enableApprovalChain: true,
      enableAuditTrail: true,
      enableFallback: true,
      freezeMode: false,
      maxRetryAttempts: 3,
      timeoutMs: 30000,
      defaultBrandAffinity: ['JRVI'],
      ...config
    };

    this.initializeFallbackHandlers();
    this.startApprovalCleanup();
  }

  /**
   * Main routing method - all operations must go through this
   */
  async route(request: OperationRequest): Promise<RouteResult> {
    const startTime = Date.now();
    const auditEntry = this.createAuditEntry(request, 'started');
    
    try {
      // Check if system is frozen
      if (this.config.freezeMode) {
        throw new Error('System is in freeze mode - no operations allowed');
      }

      // Validate request
      this.validateRequest(request);

      // Log the request
      this.kernelLogger.audit(
        `Operation request: ${request.type} on ${request.target}`,
        request.origin,
        {
          requestId: request.id,
          type: request.type,
          target: request.target,
          brandAffinity: request.brandAffinity
        },
        {
          tags: ['operation-request', request.type],
          brandAffinity: request.brandAffinity,
          lineage: request.lineage
        }
      );

      // Check if approval is required
      if (request.requiresApproval && this.config.enableApprovalChain) {
        const approved = await this.requestApproval(request);
        if (!approved) {
          this.updateAuditEntry(auditEntry.id, 'rejected', { reason: 'Approval denied' });
          throw new Error('Operation rejected by approval chain');
        }
        this.updateAuditEntry(auditEntry.id, 'approved');
      }

      // Route to appropriate handler
      const result = await this.executeOperation(request);
      
      this.updateAuditEntry(auditEntry.id, 'completed', { 
        result: typeof result === 'object' ? 'object' : result,
        resultType: typeof result
      });

      const processingTime = Date.now() - startTime;
      
      this.kernelLogger.info(
        `Operation completed: ${request.type}`,
        request.origin,
        {
          requestId: request.id,
          processingTime,
          success: true
        }
      );

      return {
        success: true,
        result,
        fallbackUsed: false,
        processingTime,
        auditLogId: auditEntry.id
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.kernelLogger.error(
        `Operation failed: ${request.type} - ${errorMessage}`,
        request.origin,
        {
          requestId: request.id,
          error: errorMessage,
          target: request.target
        }
      );

      // Try fallback if enabled
      if (this.config.enableFallback) {
        try {
          const fallbackResult = await this.executeFallback(request);
          this.updateAuditEntry(auditEntry.id, 'fallback', { 
            originalError: errorMessage,
            fallbackResult: typeof fallbackResult === 'object' ? 'object' : fallbackResult
          });

          const processingTime = Date.now() - startTime;
          
          return {
            success: true,
            result: fallbackResult,
            fallbackUsed: true,
            processingTime,
            auditLogId: auditEntry.id
          };
        } catch (fallbackError) {
          this.updateAuditEntry(auditEntry.id, 'failed', { 
            error: errorMessage,
            fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
          });
        }
      } else {
        this.updateAuditEntry(auditEntry.id, 'failed', { error: errorMessage });
      }

      const processingTime = Date.now() - startTime;
      
      return {
        success: false,
        error: errorMessage,
        fallbackUsed: false,
        processingTime,
        auditLogId: auditEntry.id
      };
    }
  }

  /**
   * Request approval for an operation
   */
  private async requestApproval(request: OperationRequest): Promise<boolean> {
    return new Promise((resolve) => {
      const approval: ApprovalEntry = {
        requestId: request.id,
        status: ApprovalStatus.PENDING,
        approver: 'system',
        timestamp: new Date()
      };

      this.approvals.set(request.id, approval);
      this.pendingRequests.set(request.id, request);

      // Auto-approve based on operation type and priority
      const shouldAutoApprove = this.shouldAutoApprove(request);
      
      if (shouldAutoApprove) {
        approval.status = ApprovalStatus.APPROVED;
        approval.approver = 'auto-approval';
        approval.reason = 'Auto-approved based on operation type and priority';
        
        this.kernelLogger.audit(
          `Operation auto-approved: ${request.type}`,
          'approval-system',
          {
            requestId: request.id,
            reason: approval.reason
          }
        );
        
        resolve(true);
      } else {
        // For now, auto-reject operations that need manual approval
        // In a real system, this would wait for human approval
        approval.status = ApprovalStatus.REJECTED;
        approval.reason = 'Manual approval required but not implemented';
        
        this.kernelLogger.audit(
          `Operation rejected - manual approval required: ${request.type}`,
          'approval-system',
          {
            requestId: request.id,
            reason: approval.reason
          }
        );
        
        resolve(false);
      }
    });
  }

  /**
   * Determine if operation should be auto-approved
   */
  private shouldAutoApprove(request: OperationRequest): boolean {
    // Auto-approve low-risk operations
    const lowRiskOperations = [
      OperationType.MEMORY_CREATE,
      OperationType.LOGIC_UPDATE,
      OperationType.KERNEL_ROUTE
    ];

    if (lowRiskOperations.includes(request.type) && request.priority <= Priority.MEDIUM) {
      return true;
    }

    // Auto-approve JRVI brand operations
    if (request.brandAffinity.includes('JRVI') && request.priority <= Priority.HIGH) {
      return true;
    }

    return false;
  }

  /**
   * Execute the actual operation
   */
  private async executeOperation(request: OperationRequest): Promise<any> {
    switch (request.type) {
      case OperationType.LOGIC_UPDATE:
        return this.handleLogicUpdate(request);
      
      case OperationType.MEMORY_CREATE:
        return this.handleMemoryCreate(request);
      
      case OperationType.MEMORY_UPDATE:
        return this.handleMemoryUpdate(request);
      
      case OperationType.PLUGIN_INSTALL:
        return this.handlePluginInstall(request);
      
      case OperationType.BRAND_SWITCH:
        return this.handleBrandSwitch(request);
      
      case OperationType.KERNEL_ROUTE:
        return this.handleKernelRoute(request);
      
      default:
        throw new Error(`Unsupported operation type: ${request.type}`);
    }
  }

  /**
   * Execute fallback operation
   */
  private async executeFallback(request: OperationRequest): Promise<any> {
    const fallbackHandler = this.fallbackHandlers.get(request.type);
    
    if (fallbackHandler) {
      this.kernelLogger.warn(
        `Executing fallback for: ${request.type}`,
        request.origin,
        { requestId: request.id }
      );
      
      return fallbackHandler(request);
    }
    
    throw new Error(`No fallback handler available for ${request.type}`);
  }

  /**
   * Operation handlers
   */
  private async handleLogicUpdate(request: OperationRequest): Promise<any> {
    // Simulate logic update with validation
    const { module, updates } = request.payload;
    
    this.kernelLogger.info(
      `Updating logic module: ${module}`,
      request.origin,
      { updates, requestId: request.id }
    );
    
    return { 
      module, 
      updated: true, 
      changes: updates,
      timestamp: new Date()
    };
  }

  private async handleMemoryCreate(request: OperationRequest): Promise<any> {
    const { content, type, metadata } = request.payload;
    
    this.kernelLogger.info(
      `Creating memory entry: ${type}`,
      request.origin,
      { contentLength: content?.length, requestId: request.id }
    );
    
    return {
      id: this.generateId(),
      content,
      type,
      metadata,
      created: new Date()
    };
  }

  private async handleMemoryUpdate(request: OperationRequest): Promise<any> {
    const { memoryId, updates } = request.payload;
    
    this.kernelLogger.info(
      `Updating memory: ${memoryId}`,
      request.origin,
      { updates, requestId: request.id }
    );
    
    return {
      memoryId,
      updated: true,
      changes: updates,
      timestamp: new Date()
    };
  }

  private async handlePluginInstall(request: OperationRequest): Promise<any> {
    const { pluginId, version } = request.payload;
    
    this.kernelLogger.info(
      `Installing plugin: ${pluginId} v${version}`,
      request.origin,
      { requestId: request.id }
    );
    
    return {
      pluginId,
      version,
      installed: true,
      timestamp: new Date()
    };
  }

  private async handleBrandSwitch(request: OperationRequest): Promise<any> {
    const { fromBrand, toBrand } = request.payload;
    
    this.kernelLogger.audit(
      `Brand switch: ${fromBrand} -> ${toBrand}`,
      request.origin,
      { fromBrand, toBrand, requestId: request.id },
      { tags: ['brand-switch'], brandAffinity: [toBrand] }
    );
    
    return {
      fromBrand,
      toBrand,
      switched: true,
      timestamp: new Date()
    };
  }

  private async handleKernelRoute(request: OperationRequest): Promise<any> {
    const { destination, data } = request.payload;
    
    this.kernelLogger.info(
      `Routing to: ${destination}`,
      request.origin,
      { destination, requestId: request.id }
    );
    
    return {
      destination,
      routed: true,
      data,
      timestamp: new Date()
    };
  }

  /**
   * Initialize fallback handlers
   */
  private initializeFallbackHandlers(): void {
    this.fallbackHandlers.set(OperationType.LOGIC_UPDATE, (request: OperationRequest) => {
      return { fallback: true, message: 'Logic update failed, using cached logic' };
    });

    this.fallbackHandlers.set(OperationType.MEMORY_CREATE, (request: OperationRequest) => {
      return { fallback: true, message: 'Memory creation failed, operation queued' };
    });

    this.fallbackHandlers.set(OperationType.PLUGIN_INSTALL, (request: OperationRequest) => {
      return { fallback: true, message: 'Plugin installation failed, using previous version' };
    });

    this.fallbackHandlers.set(OperationType.KERNEL_ROUTE, (request: OperationRequest) => {
      return { fallback: true, message: 'Routing failed, using default handler' };
    });
  }

  /**
   * Validation and utility methods
   */
  private validateRequest(request: OperationRequest): void {
    if (!request.id || !request.type || !request.origin || !request.target) {
      throw new Error('Invalid request: missing required fields');
    }

    if (!request.brandAffinity || request.brandAffinity.length === 0) {
      request.brandAffinity = this.config.defaultBrandAffinity;
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  private createAuditEntry(request: OperationRequest, status: KernelAuditEntry['status']): KernelAuditEntry {
    const entry: KernelAuditEntry = {
      id: this.generateId(),
      requestId: request.id,
      operation: request.type,
      origin: request.origin,
      target: request.target,
      status,
      timestamp: new Date(),
      details: {
        priority: request.priority,
        requiresApproval: request.requiresApproval,
        metadata: request.metadata
      },
      brandAffinity: request.brandAffinity,
      lineage: request.lineage
    };

    this.auditTrail.push(entry);
    return entry;
  }

  private updateAuditEntry(id: string, status: KernelAuditEntry['status'], details?: Record<string, any>): void {
    const entry = this.auditTrail.find(e => e.id === id);
    if (entry) {
      entry.status = status;
      if (details) {
        entry.details = { ...entry.details, ...details };
      }
    }
  }

  private startApprovalCleanup(): void {
    setInterval(() => {
      const now = new Date();
      const expiredTime = 10 * 60 * 1000; // 10 minutes

      for (const [requestId, approval] of this.approvals.entries()) {
        if (approval.status === ApprovalStatus.PENDING) {
          const age = now.getTime() - approval.timestamp.getTime();
          if (age > expiredTime) {
            approval.status = ApprovalStatus.EXPIRED;
            this.pendingRequests.delete(requestId);
            
            this.kernelLogger.warn(
              `Approval expired for request: ${requestId}`,
              'approval-cleanup'
            );
          }
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Public methods for system management
   */
  setFreezeMode(enabled: boolean): void {
    this.config.freezeMode = enabled;
    
    this.kernelLogger.security(
      `System freeze mode ${enabled ? 'enabled' : 'disabled'}`,
      'kernel-control',
      { freezeMode: enabled },
      { tags: ['freeze-mode', 'security'] }
    );
  }

  getAuditTrail(options?: {
    operation?: OperationType;
    origin?: string;
    timeRange?: { start: Date; end: Date };
    limit?: number;
  }): KernelAuditEntry[] {
    let filtered = [...this.auditTrail];

    if (options?.operation) {
      filtered = filtered.filter(entry => entry.operation === options.operation);
    }

    if (options?.origin) {
      filtered = filtered.filter(entry => entry.origin === options.origin);
    }

    if (options?.timeRange) {
      filtered = filtered.filter(entry => 
        entry.timestamp >= options.timeRange!.start && 
        entry.timestamp <= options.timeRange!.end
      );
    }

    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  getPendingApprovals(): ApprovalEntry[] {
    return Array.from(this.approvals.values())
      .filter(approval => approval.status === ApprovalStatus.PENDING);
  }

  getKernelStats(): {
    totalRequests: number;
    pendingApprovals: number;
    auditEntries: number;
    freezeMode: boolean;
    fallbacksEnabled: boolean;
  } {
    return {
      totalRequests: this.auditTrail.length,
      pendingApprovals: this.getPendingApprovals().length,
      auditEntries: this.auditTrail.length,
      freezeMode: this.config.freezeMode,
      fallbacksEnabled: this.config.enableFallback
    };
  }
}

// Singleton instance
export const strategyKernel = new StrategyKernel();

// Helper function to create operation requests
export function createOperationRequest(
  type: OperationType,
  origin: string,
  target: string,
  payload: any,
  options: {
    brandAffinity?: string[];
    priority?: Priority;
    requiresApproval?: boolean;
    metadata?: Record<string, any>;
    lineage?: string[];
    source?: string;
  } = {}
): OperationRequest {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
    type,
    origin,
    target,
    payload,
    brandAffinity: options.brandAffinity || ['JRVI'],
    priority: options.priority || Priority.MEDIUM,
    requiresApproval: options.requiresApproval || false,
    metadata: options.metadata || {},
    timestamp: new Date(),
    lineage: options.lineage,
    source: options.source
  };
}

export default strategyKernel;