/**
 * Unified Kernels - Central coordination of all kernel systems
 * Coordinates Strategy Kernel, Governor Kernel, Token Kernel, and Consensus Engine
 */

import { logger } from '../utils/logging';
import { strategyKernel, OperationRequest, OperationType, Priority, RouteResult } from './strategy';
import { governorKernel, OperationContext, ConstitutionalEvaluation } from './governor_kernel';

export interface UnifiedKernelConfig {
  enableConstitutionalEnforcement: boolean;
  enableTokenIntegration: boolean;
  enableConsensusValidation: boolean;
  enableAuditTrail: boolean;
  defaultBrandAffinity: string[];
}

export interface KernelOperationResult {
  success: boolean;
  result?: any;
  error?: string;
  constitutionalEvaluation?: ConstitutionalEvaluation;
  tokenTransaction?: any;
  consensusScore?: number;
  auditTrail: KernelAuditStep[];
  processingTime: number;
  traceId: string;
}

export interface KernelAuditStep {
  step: 'constitutional_check' | 'token_validation' | 'consensus_evaluation' | 'strategy_routing' | 'final_approval';
  timestamp: Date;
  status: 'started' | 'completed' | 'failed' | 'skipped';
  details: Record<string, any>;
  processingTime?: number;
}

export interface LogicPromotionRequest {
  logicId: string;
  agent: string;
  reason: string;
  logicModule: {
    code: string;
    documentation: string;
    tests: any[];
    dependencies: string[];
    metadata: Record<string, any>;
  };
  tokenStake: number;
  brandAffinity: string[];
  priority: Priority;
}

export interface LogicDemotionRequest {
  logicId: string;
  agent: string;
  reason: string;
  evidence: any[];
  brandAffinity: string[];
}

class UnifiedKernels {
  private config: UnifiedKernelConfig;
  private kernelLogger = logger.createChildLogger('unified-kernels');
  private operationHistory: Map<string, KernelOperationResult> = new Map();
  private promotionRequests: Map<string, LogicPromotionRequest> = new Map();
  private demotionRequests: Map<string, LogicDemotionRequest> = new Map();

  constructor(config: Partial<UnifiedKernelConfig> = {}) {
    this.config = {
      enableConstitutionalEnforcement: true,
      enableTokenIntegration: true,
      enableConsensusValidation: true,
      enableAuditTrail: true,
      defaultBrandAffinity: ['JRVI'],
      ...config
    };

    this.kernelLogger.info(
      'Unified Kernels initialized',
      'unified-kernels',
      { config: this.config }
    );
  }

  /**
   * Process any operation through the unified kernel system
   */
  async processOperation(request: OperationRequest): Promise<KernelOperationResult> {
    const startTime = Date.now();
    const traceId = this.generateTraceId();
    const auditTrail: KernelAuditStep[] = [];

    this.kernelLogger.audit(
      `Processing operation through unified kernels: ${request.type}`,
      'unified-kernels',
      {
        operation: request.type,
        target: request.target,
        origin: request.origin,
        traceId
      },
      {
        tags: ['unified-operation', request.type],
        brandAffinity: request.brandAffinity,
        lineage: [traceId]
      }
    );

    try {
      // Step 1: Constitutional enforcement
      let constitutionalEvaluation: ConstitutionalEvaluation | undefined;
      if (this.config.enableConstitutionalEnforcement) {
        const constitutionalStep = this.startAuditStep('constitutional_check', auditTrail);
        
        const context: OperationContext = {
          operation: request.type,
          origin: request.origin,
          target: request.target,
          payload: request.payload,
          brandAffinity: request.brandAffinity,
          metadata: request.metadata,
          traceId,
          timestamp: new Date(),
          agent: request.metadata?.agent,
          logicId: request.metadata?.logicId,
          reason: request.metadata?.reason
        };

        constitutionalEvaluation = await governorKernel.evaluateConstitutionalCompliance(context);
        
        if (!constitutionalEvaluation.compliant) {
          const criticalViolations = constitutionalEvaluation.violations.filter(v => v.severity === 'critical');
          if (criticalViolations.length > 0) {
            this.completeAuditStep(constitutionalStep, 'failed', {
              violations: criticalViolations.length,
              reason: 'Critical constitutional violations'
            });

            const result: KernelOperationResult = {
              success: false,
              error: `Constitutional violations: ${criticalViolations.map(v => v.description).join(', ')}`,
              constitutionalEvaluation,
              auditTrail,
              processingTime: Date.now() - startTime,
              traceId
            };

            this.operationHistory.set(traceId, result);
            return result;
          }
        }

        this.completeAuditStep(constitutionalStep, 'completed', {
          compliant: constitutionalEvaluation.compliant,
          violations: constitutionalEvaluation.violations.length
        });
      }

      // Step 2: Token validation (if token operations involved)
      let tokenTransaction: any;
      if (this.config.enableTokenIntegration && this.isTokenOperation(request)) {
        const tokenStep = this.startAuditStep('token_validation', auditTrail);
        
        // This would integrate with tokenKernel when implemented
        tokenTransaction = await this.validateTokenOperation(request, traceId);
        
        this.completeAuditStep(tokenStep, 'completed', {
          tokenTransaction: tokenTransaction ? 'processed' : 'none'
        });
      }

      // Step 3: Consensus evaluation (for logic promotion/demotion)
      let consensusScore: number | undefined;
      if (this.config.enableConsensusValidation && this.isConsensusOperation(request)) {
        const consensusStep = this.startAuditStep('consensus_evaluation', auditTrail);
        
        // This would integrate with consensus engine when implemented
        consensusScore = await this.evaluateConsensus(request, traceId);
        
        this.completeAuditStep(consensusStep, 'completed', {
          consensusScore
        });
      }

      // Step 4: Strategy kernel routing
      const strategyStep = this.startAuditStep('strategy_routing', auditTrail);
      
      const strategyResult = await strategyKernel.route(request);
      
      this.completeAuditStep(strategyStep, strategyResult.success ? 'completed' : 'failed', {
        success: strategyResult.success,
        fallbackUsed: strategyResult.fallbackUsed,
        processingTime: strategyResult.processingTime
      });

      // Step 5: Final approval and logging
      const finalStep = this.startAuditStep('final_approval', auditTrail);
      
      const result: KernelOperationResult = {
        success: strategyResult.success,
        result: strategyResult.result,
        error: strategyResult.error,
        constitutionalEvaluation,
        tokenTransaction,
        consensusScore,
        auditTrail,
        processingTime: Date.now() - startTime,
        traceId
      };

      this.completeAuditStep(finalStep, 'completed', {
        overallSuccess: result.success
      });

      // Store operation history
      this.operationHistory.set(traceId, result);

      this.kernelLogger.audit(
        `Unified kernel operation completed: ${strategyResult.success ? 'SUCCESS' : 'FAILED'}`,
        'unified-kernels',
        {
          operation: request.type,
          success: result.success,
          processingTime: result.processingTime,
          traceId,
          auditSteps: auditTrail.length
        },
        {
          tags: ['unified-complete', result.success ? 'success' : 'failure'],
          brandAffinity: request.brandAffinity,
          lineage: [traceId]
        }
      );

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.kernelLogger.error(
        `Unified kernel operation failed: ${errorMessage}`,
        'unified-kernels',
        {
          operation: request.type,
          error: errorMessage,
          traceId,
          processingTime: Date.now() - startTime
        }
      );

      const result: KernelOperationResult = {
        success: false,
        error: errorMessage,
        auditTrail,
        processingTime: Date.now() - startTime,
        traceId
      };

      this.operationHistory.set(traceId, result);
      return result;
    }
  }

  /**
   * Request logic module promotion with full kernel validation
   */
  async requestLogicPromotion(request: LogicPromotionRequest): Promise<KernelOperationResult> {
    const traceId = this.generateTraceId();
    
    this.kernelLogger.audit(
      `Logic promotion requested: ${request.logicId}`,
      'logic-promotion',
      {
        logicId: request.logicId,
        agent: request.agent,
        reason: request.reason,
        tokenStake: request.tokenStake,
        traceId
      },
      {
        tags: ['logic-promotion', 'promotion-request'],
        brandAffinity: request.brandAffinity,
        lineage: [traceId]
      }
    );

    // Store promotion request for tracking
    this.promotionRequests.set(traceId, request);

    // Create operation request for unified processing
    const operationRequest: OperationRequest = {
      id: traceId,
      type: OperationType.LOGIC_UPDATE,
      origin: request.agent,
      target: 'logic-engine',
      payload: {
        logicId: request.logicId,
        logicModule: request.logicModule,
        operation: 'promote',
        tokenStake: request.tokenStake
      },
      brandAffinity: request.brandAffinity,
      priority: request.priority,
      requiresApproval: true,
      metadata: {
        agent: request.agent,
        logicId: request.logicId,
        reason: request.reason,
        tokenStake: request.tokenStake,
        promotionRequest: true
      },
      timestamp: new Date(),
      lineage: [traceId]
    };

    return await this.processOperation(operationRequest);
  }

  /**
   * Request logic module demotion with full kernel validation
   */
  async requestLogicDemotion(request: LogicDemotionRequest): Promise<KernelOperationResult> {
    const traceId = this.generateTraceId();
    
    this.kernelLogger.audit(
      `Logic demotion requested: ${request.logicId}`,
      'logic-demotion',
      {
        logicId: request.logicId,
        agent: request.agent,
        reason: request.reason,
        evidenceCount: request.evidence.length,
        traceId
      },
      {
        tags: ['logic-demotion', 'demotion-request'],
        brandAffinity: request.brandAffinity,
        lineage: [traceId]
      }
    );

    // Store demotion request for tracking
    this.demotionRequests.set(traceId, request);

    // Create operation request for unified processing
    const operationRequest: OperationRequest = {
      id: traceId,
      type: OperationType.LOGIC_UPDATE,
      origin: request.agent,
      target: 'logic-engine',
      payload: {
        logicId: request.logicId,
        operation: 'demote',
        evidence: request.evidence
      },
      brandAffinity: request.brandAffinity,
      priority: Priority.HIGH,
      requiresApproval: true,
      metadata: {
        agent: request.agent,
        logicId: request.logicId,
        reason: request.reason,
        demotionRequest: true
      },
      timestamp: new Date(),
      lineage: [traceId]
    };

    return await this.processOperation(operationRequest);
  }

  /**
   * Get operation history
   */
  getOperationHistory(options?: {
    limit?: number;
    operation?: OperationType;
    success?: boolean;
    timeRange?: { start: Date; end: Date };
  }): KernelOperationResult[] {
    let results = Array.from(this.operationHistory.values());

    if (options?.operation) {
      // This would need operation type in the result, currently not stored
      // results = results.filter(r => r.operation === options.operation);
    }

    if (options?.success !== undefined) {
      results = results.filter(r => r.success === options.success);
    }

    if (options?.timeRange) {
      // This would need timestamp in the result
      // results = results.filter(r => r.timestamp >= options.timeRange!.start && r.timestamp <= options.timeRange!.end);
    }

    results.sort((a, b) => b.processingTime - a.processingTime);

    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Get promotion requests
   */
  getPromotionRequests(): LogicPromotionRequest[] {
    return Array.from(this.promotionRequests.values());
  }

  /**
   * Get demotion requests
   */
  getDemotionRequests(): LogicDemotionRequest[] {
    return Array.from(this.demotionRequests.values());
  }

  /**
   * Get unified kernel statistics
   */
  getKernelStats(): {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    promotionRequests: number;
    demotionRequests: number;
    averageProcessingTime: number;
    constitutionalViolations: number;
  } {
    const operations = Array.from(this.operationHistory.values());
    const successful = operations.filter(op => op.success);
    const failed = operations.filter(op => !op.success);
    const avgProcessingTime = operations.length > 0 
      ? operations.reduce((sum, op) => sum + op.processingTime, 0) / operations.length 
      : 0;
    
    const constitutionalViolations = operations.reduce((count, op) => 
      count + (op.constitutionalEvaluation?.violations.length || 0), 0
    );

    return {
      totalOperations: operations.length,
      successfulOperations: successful.length,
      failedOperations: failed.length,
      promotionRequests: this.promotionRequests.size,
      demotionRequests: this.demotionRequests.size,
      averageProcessingTime: avgProcessingTime,
      constitutionalViolations
    };
  }

  private isTokenOperation(request: OperationRequest): boolean {
    return request.payload?.tokenStake || 
           request.payload?.tokenReward || 
           request.metadata?.tokenTransaction;
  }

  private isConsensusOperation(request: OperationRequest): boolean {
    return request.type === OperationType.LOGIC_UPDATE || 
           request.metadata?.promotionRequest || 
           request.metadata?.demotionRequest;
  }

  private async validateTokenOperation(request: OperationRequest, traceId: string): Promise<any> {
    // This will integrate with tokenKernel when implemented
    this.kernelLogger.debug(
      'Token operation validation - placeholder',
      'token-validation',
      { traceId, operation: request.type }
    );
    
    return { validated: true, placeholder: true };
  }

  private async evaluateConsensus(request: OperationRequest, traceId: string): Promise<number> {
    // This will integrate with consensus engine when implemented
    this.kernelLogger.debug(
      'Consensus evaluation - placeholder',
      'consensus-evaluation',
      { traceId, operation: request.type }
    );
    
    return 0.75; // Placeholder score
  }

  private startAuditStep(step: KernelAuditStep['step'], auditTrail: KernelAuditStep[]): KernelAuditStep {
    const auditStep: KernelAuditStep = {
      step,
      timestamp: new Date(),
      status: 'started',
      details: {}
    };
    
    auditTrail.push(auditStep);
    return auditStep;
  }

  private completeAuditStep(
    auditStep: KernelAuditStep, 
    status: 'completed' | 'failed' | 'skipped', 
    details: Record<string, any>
  ): void {
    auditStep.status = status;
    auditStep.details = { ...auditStep.details, ...details };
    auditStep.processingTime = Date.now() - auditStep.timestamp.getTime();
  }

  private generateTraceId(): string {
    return 'uk-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 6);
  }
}

// Singleton instance
export const unifiedKernels = new UnifiedKernels();

// Helper functions for creating requests
export function createLogicPromotionRequest(
  logicId: string,
  agent: string,
  reason: string,
  logicModule: LogicPromotionRequest['logicModule'],
  tokenStake: number,
  options: {
    brandAffinity?: string[];
    priority?: Priority;
  } = {}
): LogicPromotionRequest {
  return {
    logicId,
    agent,
    reason,
    logicModule,
    tokenStake,
    brandAffinity: options.brandAffinity || ['JRVI'],
    priority: options.priority || Priority.MEDIUM
  };
}

export function createLogicDemotionRequest(
  logicId: string,
  agent: string,
  reason: string,
  evidence: any[],
  options: {
    brandAffinity?: string[];
  } = {}
): LogicDemotionRequest {
  return {
    logicId,
    agent,
    reason,
    evidence,
    brandAffinity: options.brandAffinity || ['JRVI']
  };
}

export default unifiedKernels;