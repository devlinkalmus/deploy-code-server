/**
 * Governor Kernel - Constitutional enforcement and high-level governance
 * Enforces JRVI Constitution and manages system-level governance decisions
 */

import { logger } from '../utils/logging';
import { strategyKernel, OperationType, Priority, createOperationRequest } from './strategy';

export interface ConstitutionalRule {
  id: string;
  name: string;
  description: string;
  category: 'core_principle' | 'logic_governance' | 'token_economy' | 'consensus' | 'security' | 'privacy';
  priority: 'critical' | 'high' | 'medium' | 'low';
  evaluationFunction: (context: OperationContext) => ConstitutionalEvaluation;
  active: boolean;
  version: string;
}

export interface OperationContext {
  operation: OperationType;
  origin: string;
  target: string;
  payload: any;
  brandAffinity: string[];
  metadata: Record<string, any>;
  traceId: string;
  timestamp: Date;
  agent?: string;
  logicId?: string;
  reason?: string;
}

export interface ConstitutionalEvaluation {
  compliant: boolean;
  violations: ConstitutionalViolation[];
  recommendations: string[];
  confidence: number;
  requiresReview: boolean;
}

export interface ConstitutionalViolation {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  evidence: any;
  remediation: string[];
}

export interface GovernanceProposal {
  id: string;
  type: 'constitutional_amendment' | 'rule_modification' | 'system_change' | 'emergency_action';
  title: string;
  description: string;
  proposer: string;
  requiredTokens: number;
  stakingPeriod: number;
  votingPeriod: number;
  status: 'draft' | 'proposed' | 'voting' | 'approved' | 'rejected' | 'implemented';
  votes: GovernanceVote[];
  created: Date;
  deadline: Date;
  traceId: string;
}

export interface GovernanceVote {
  voter: string;
  voteType: 'approve' | 'reject' | 'abstain';
  tokenWeight: number;
  timestamp: Date;
  reasoning?: string;
}

class GovernorKernel {
  private constitutionalRules: Map<string, ConstitutionalRule> = new Map();
  private activeProposals: Map<string, GovernanceProposal> = new Map();
  private governanceHistory: GovernanceProposal[] = [];
  private governorLogger = logger.createChildLogger('governor-kernel');

  constructor() {
    this.initializeConstitutionalRules();
    this.startGovernanceCleanup();
  }

  /**
   * Evaluate operation against constitutional requirements
   */
  async evaluateConstitutionalCompliance(context: OperationContext): Promise<ConstitutionalEvaluation> {
    this.governorLogger.audit(
      `Constitutional evaluation requested for ${context.operation}`,
      'constitutional-enforcement',
      {
        operation: context.operation,
        target: context.target,
        origin: context.origin,
        traceId: context.traceId
      },
      {
        tags: ['constitutional-evaluation', context.operation],
        brandAffinity: context.brandAffinity,
        lineage: [context.traceId]
      }
    );

    const violations: ConstitutionalViolation[] = [];
    const recommendations: string[] = [];
    let overallCompliance = true;
    let totalConfidence = 0;
    let requiresReview = false;

    // Evaluate against all active constitutional rules
    for (const [ruleId, rule] of this.constitutionalRules) {
      if (!rule.active) continue;

      try {
        const evaluation = rule.evaluationFunction(context);
        
        if (!evaluation.compliant) {
          overallCompliance = false;
          violations.push(...evaluation.violations);
        }
        
        recommendations.push(...evaluation.recommendations);
        totalConfidence += evaluation.confidence;
        
        if (evaluation.requiresReview) {
          requiresReview = true;
        }

        this.governorLogger.debug(
          `Rule ${ruleId} evaluation: ${evaluation.compliant ? 'COMPLIANT' : 'VIOLATION'}`,
          'constitutional-evaluation',
          {
            ruleId,
            compliant: evaluation.compliant,
            violations: evaluation.violations.length,
            traceId: context.traceId
          }
        );

      } catch (error) {
        this.governorLogger.error(
          `Error evaluating constitutional rule ${ruleId}: ${error}`,
          'constitutional-evaluation',
          {
            ruleId,
            error: error instanceof Error ? error.message : String(error),
            traceId: context.traceId
          }
        );
        
        // Treat evaluation errors as requiring review
        requiresReview = true;
      }
    }

    const averageConfidence = this.constitutionalRules.size > 0 ? 
      totalConfidence / this.constitutionalRules.size : 0;

    const result: ConstitutionalEvaluation = {
      compliant: overallCompliance,
      violations,
      recommendations,
      confidence: averageConfidence,
      requiresReview
    };

    this.governorLogger.audit(
      `Constitutional evaluation completed: ${overallCompliance ? 'COMPLIANT' : 'VIOLATIONS FOUND'}`,
      'constitutional-enforcement',
      {
        compliant: overallCompliance,
        violationCount: violations.length,
        confidence: averageConfidence,
        requiresReview,
        traceId: context.traceId
      },
      {
        tags: ['constitutional-result', overallCompliance ? 'compliant' : 'violation'],
        brandAffinity: context.brandAffinity,
        lineage: [context.traceId]
      }
    );

    return result;
  }

  /**
   * Enforce constitutional compliance for operations
   */
  async enforceConstitution(context: OperationContext): Promise<boolean> {
    const evaluation = await this.evaluateConstitutionalCompliance(context);
    
    if (!evaluation.compliant) {
      // Log constitutional violations
      for (const violation of evaluation.violations) {
        this.governorLogger.security(
          `Constitutional violation: ${violation.description}`,
          'constitutional-enforcement',
          {
            ruleId: violation.ruleId,
            severity: violation.severity,
            operation: context.operation,
            target: context.target,
            traceId: context.traceId,
            remediation: violation.remediation
          },
          {
            tags: ['constitutional-violation', violation.severity],
            brandAffinity: context.brandAffinity,
            lineage: [context.traceId]
          }
        );
      }

      // Critical violations block operation immediately
      const hasCriticalViolations = evaluation.violations.some(v => v.severity === 'critical');
      if (hasCriticalViolations) {
        this.governorLogger.security(
          `Operation blocked due to critical constitutional violations`,
          'constitutional-enforcement',
          {
            operation: context.operation,
            target: context.target,
            traceId: context.traceId,
            violationCount: evaluation.violations.length
          },
          {
            tags: ['operation-blocked', 'critical-violation'],
            brandAffinity: context.brandAffinity,
            lineage: [context.traceId]
          }
        );
        
        return false;
      }
    }

    return true;
  }

  /**
   * Submit governance proposal
   */
  async submitGovernanceProposal(
    proposal: Omit<GovernanceProposal, 'id' | 'status' | 'votes' | 'created' | 'traceId'>
  ): Promise<string> {
    const traceId = this.generateTraceId();
    const proposalId = this.generateId();
    
    const fullProposal: GovernanceProposal = {
      ...proposal,
      id: proposalId,
      status: 'proposed',
      votes: [],
      created: new Date(),
      traceId
    };

    this.activeProposals.set(proposalId, fullProposal);

    this.governorLogger.audit(
      `Governance proposal submitted: ${proposal.title}`,
      'governance',
      {
        proposalId,
        type: proposal.type,
        proposer: proposal.proposer,
        requiredTokens: proposal.requiredTokens,
        traceId
      },
      {
        tags: ['governance-proposal', proposal.type],
        brandAffinity: ['JRVI'],
        lineage: [traceId]
      }
    );

    return proposalId;
  }

  /**
   * Vote on governance proposal
   */
  async voteOnProposal(
    proposalId: string,
    voter: string,
    voteType: 'approve' | 'reject' | 'abstain',
    tokenWeight: number,
    reasoning?: string
  ): Promise<boolean> {
    const proposal = this.activeProposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal ${proposalId} not found`);
    }

    if (proposal.status !== 'voting') {
      throw new Error(`Proposal ${proposalId} is not in voting status`);
    }

    if (new Date() > proposal.deadline) {
      proposal.status = 'rejected';
      throw new Error(`Proposal ${proposalId} voting period has expired`);
    }

    // Check if voter has already voted
    const existingVote = proposal.votes.find(v => v.voter === voter);
    if (existingVote) {
      throw new Error(`Voter ${voter} has already voted on proposal ${proposalId}`);
    }

    const vote: GovernanceVote = {
      voter,
      voteType,
      tokenWeight,
      timestamp: new Date(),
      reasoning
    };

    proposal.votes.push(vote);

    this.governorLogger.audit(
      `Governance vote cast: ${voteType} on ${proposal.title}`,
      'governance',
      {
        proposalId,
        voter,
        voteType,
        tokenWeight,
        reasoning,
        traceId: proposal.traceId
      },
      {
        tags: ['governance-vote', voteType],
        brandAffinity: ['JRVI'],
        lineage: [proposal.traceId]
      }
    );

    // Check if proposal has reached decision threshold
    this.evaluateProposalStatus(proposal);

    return true;
  }

  /**
   * Get active governance proposals
   */
  getActiveProposals(): GovernanceProposal[] {
    return Array.from(this.activeProposals.values())
      .filter(p => ['proposed', 'voting'].includes(p.status))
      .sort((a, b) => b.created.getTime() - a.created.getTime());
  }

  /**
   * Get governance history
   */
  getGovernanceHistory(limit?: number): GovernanceProposal[] {
    const history = [...this.governanceHistory]
      .sort((a, b) => b.created.getTime() - a.created.getTime());
    
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Get constitutional rules
   */
  getConstitutionalRules(): ConstitutionalRule[] {
    return Array.from(this.constitutionalRules.values());
  }

  /**
   * Initialize constitutional rules based on JRVI Constitution
   */
  private initializeConstitutionalRules(): void {
    // Core Principle Rules
    this.addConstitutionalRule({
      id: 'radical-virtue-alignment',
      name: 'Radical Virtue Alignment',
      description: 'All operations must align with beneficial outcomes for users and society',
      category: 'core_principle',
      priority: 'critical',
      evaluationFunction: (context) => this.evaluateRadicalVirtue(context),
      active: true,
      version: '1.0.0'
    });

    this.addConstitutionalRule({
      id: 'transparency-requirement',
      name: 'Transparency Requirement',
      description: 'Operations must be auditable and explainable',
      category: 'core_principle',
      priority: 'high',
      evaluationFunction: (context) => this.evaluateTransparency(context),
      active: true,
      version: '1.0.0'
    });

    // Logic Governance Rules
    this.addConstitutionalRule({
      id: 'logic-quality-standards',
      name: 'Logic Module Quality Standards',
      description: 'Logic modules must meet minimum performance and safety standards',
      category: 'logic_governance',
      priority: 'high',
      evaluationFunction: (context) => this.evaluateLogicQuality(context),
      active: true,
      version: '1.0.0'
    });

    // Security Rules
    this.addConstitutionalRule({
      id: 'security-first-principle',
      name: 'Security First Principle',
      description: 'Security considerations take precedence over functionality',
      category: 'security',
      priority: 'critical',
      evaluationFunction: (context) => this.evaluateSecurity(context),
      active: true,
      version: '1.0.0'
    });

    // Token Economy Rules
    this.addConstitutionalRule({
      id: 'merit-based-tokens',
      name: 'Merit-Based Token Distribution',
      description: 'Tokens must be earned through valuable contributions',
      category: 'token_economy',
      priority: 'high',
      evaluationFunction: (context) => this.evaluateTokenMerit(context),
      active: true,
      version: '1.0.0'
    });

    this.governorLogger.info(
      `Initialized ${this.constitutionalRules.size} constitutional rules`,
      'governor-kernel',
      { ruleCount: this.constitutionalRules.size }
    );
  }

  private addConstitutionalRule(rule: ConstitutionalRule): void {
    this.constitutionalRules.set(rule.id, rule);
  }

  // Constitutional evaluation functions
  private evaluateRadicalVirtue(context: OperationContext): ConstitutionalEvaluation {
    // Evaluate if operation aligns with beneficial outcomes
    const violations: ConstitutionalViolation[] = [];
    const recommendations: string[] = [];
    
    // Check for potentially harmful operations
    if (context.payload && typeof context.payload === 'object') {
      const payloadStr = JSON.stringify(context.payload).toLowerCase();
      const harmfulKeywords = ['exploit', 'hack', 'manipulate', 'deceive', 'harm'];
      
      for (const keyword of harmfulKeywords) {
        if (payloadStr.includes(keyword)) {
          violations.push({
            ruleId: 'radical-virtue-alignment',
            severity: 'critical',
            description: `Operation contains potentially harmful content: ${keyword}`,
            evidence: { keyword, context: context.payload },
            remediation: ['Remove harmful content', 'Provide beneficial alternative', 'Add safety checks']
          });
        }
      }
    }

    return {
      compliant: violations.length === 0,
      violations,
      recommendations,
      confidence: 0.8,
      requiresReview: violations.length > 0
    };
  }

  private evaluateTransparency(context: OperationContext): ConstitutionalEvaluation {
    const violations: ConstitutionalViolation[] = [];
    const recommendations: string[] = [];

    // Check for required audit fields
    if (!context.traceId) {
      violations.push({
        ruleId: 'transparency-requirement',
        severity: 'medium',
        description: 'Operation missing trace ID for audit trail',
        evidence: { context },
        remediation: ['Add trace ID to operation context']
      });
    }

    if (!context.reason && ['LOGIC_UPDATE', 'MEMORY_CREATE', 'PLUGIN_INSTALL'].includes(context.operation)) {
      recommendations.push('Add reason for operation to improve transparency');
    }

    return {
      compliant: violations.length === 0,
      violations,
      recommendations,
      confidence: 0.9,
      requiresReview: false
    };
  }

  private evaluateLogicQuality(context: OperationContext): ConstitutionalEvaluation {
    const violations: ConstitutionalViolation[] = [];
    const recommendations: string[] = [];

    if (context.operation === OperationType.LOGIC_UPDATE && context.payload) {
      // Check for required quality indicators
      if (!context.payload.tests) {
        violations.push({
          ruleId: 'logic-quality-standards',
          severity: 'high',
          description: 'Logic module update missing test suite',
          evidence: { payload: context.payload },
          remediation: ['Add comprehensive test suite', 'Validate functionality', 'Include edge case testing']
        });
      }

      if (!context.payload.documentation) {
        violations.push({
          ruleId: 'logic-quality-standards',
          severity: 'medium',
          description: 'Logic module update missing documentation',
          evidence: { payload: context.payload },
          remediation: ['Add comprehensive documentation', 'Include usage examples', 'Document expected behavior']
        });
      }
    }

    return {
      compliant: violations.length === 0,
      violations,
      recommendations,
      confidence: 0.85,
      requiresReview: violations.some(v => v.severity === 'high')
    };
  }

  private evaluateSecurity(context: OperationContext): ConstitutionalEvaluation {
    const violations: ConstitutionalViolation[] = [];
    const recommendations: string[] = [];

    // Check for security-sensitive operations
    const securitySensitive = [
      OperationType.SECURITY_CHANGE,
      OperationType.PLUGIN_INSTALL,
      OperationType.LOGIC_UPDATE
    ];

    if (securitySensitive.includes(context.operation)) {
      if (!context.metadata?.securityReview) {
        violations.push({
          ruleId: 'security-first-principle',
          severity: 'critical',
          description: 'Security-sensitive operation missing security review',
          evidence: { operation: context.operation, metadata: context.metadata },
          remediation: ['Conduct thorough security review', 'Document security analysis', 'Add security approval']
        });
      }
    }

    return {
      compliant: violations.length === 0,
      violations,
      recommendations,
      confidence: 0.95,
      requiresReview: violations.length > 0
    };
  }

  private evaluateTokenMerit(context: OperationContext): ConstitutionalEvaluation {
    const violations: ConstitutionalViolation[] = [];
    const recommendations: string[] = [];

    // This would integrate with token system to validate merit-based distribution
    // For now, basic validation
    if (context.payload?.tokenReward && !context.payload?.contribution) {
      violations.push({
        ruleId: 'merit-based-tokens',
        severity: 'medium',
        description: 'Token reward without clear contribution justification',
        evidence: { payload: context.payload },
        remediation: ['Document specific contribution', 'Provide merit justification', 'Link to performance metrics']
      });
    }

    return {
      compliant: violations.length === 0,
      violations,
      recommendations,
      confidence: 0.75,
      requiresReview: false
    };
  }

  private evaluateProposalStatus(proposal: GovernanceProposal): void {
    const totalTokens = proposal.votes.reduce((sum, vote) => sum + vote.tokenWeight, 0);
    const approveTokens = proposal.votes
      .filter(v => v.voteType === 'approve')
      .reduce((sum, vote) => sum + vote.tokenWeight, 0);

    // Simple majority for now (can be made configurable)
    const approvalThreshold = 0.5;
    const minimumParticipation = proposal.requiredTokens * 0.1;

    if (totalTokens >= minimumParticipation) {
      const approvalRatio = approveTokens / totalTokens;
      
      if (approvalRatio >= approvalThreshold) {
        proposal.status = 'approved';
        this.governanceHistory.push(proposal);
        this.activeProposals.delete(proposal.id);
        
        this.governorLogger.audit(
          `Governance proposal approved: ${proposal.title}`,
          'governance',
          {
            proposalId: proposal.id,
            approvalRatio,
            totalTokens,
            traceId: proposal.traceId
          },
          {
            tags: ['governance-approved'],
            brandAffinity: ['JRVI'],
            lineage: [proposal.traceId]
          }
        );
      }
    }
  }

  private startGovernanceCleanup(): void {
    setInterval(() => {
      const now = new Date();
      
      for (const [proposalId, proposal] of this.activeProposals) {
        if (proposal.status === 'voting' && now > proposal.deadline) {
          proposal.status = 'rejected';
          this.governanceHistory.push(proposal);
          this.activeProposals.delete(proposalId);
          
          this.governorLogger.audit(
            `Governance proposal expired: ${proposal.title}`,
            'governance',
            {
              proposalId,
              expiredAt: now,
              traceId: proposal.traceId
            },
            {
              tags: ['governance-expired'],
              brandAffinity: ['JRVI'],
              lineage: [proposal.traceId]
            }
          );
        }
      }
    }, 60000); // Check every minute
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  private generateTraceId(): string {
    return 'gov-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 6);
  }
}

// Singleton instance
export const governorKernel = new GovernorKernel();

export default governorKernel;