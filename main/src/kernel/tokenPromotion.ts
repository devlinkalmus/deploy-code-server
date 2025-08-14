/**
 * Token Promotion - Logic promotion/demotion with token integration
 * Manages token-based promotion proposals and voting for logic modules
 */

import { logger } from '../utils/logging';
import { tokenKernel, TokenAccount, StakePosition } from './tokenKernel';
import { unifiedKernels, LogicPromotionRequest, LogicDemotionRequest } from './kernels';
import { Priority } from './strategy';

export interface PromotionProposal {
  id: string;
  logicId: string;
  proposer: string;
  agent: string;
  title: string;
  description: string;
  reason: string;
  logicModule: {
    code: string;
    documentation: string;
    tests: any[];
    dependencies: string[];
    metadata: Record<string, any>;
  };
  tokenRequirement: number;
  proposerStake: number;
  supportingStakes: SupportingStake[];
  totalStaked: number;
  votingPeriod: number;
  votingEndTime: Date;
  votes: PromotionVote[];
  status: 'draft' | 'staking' | 'voting' | 'approved' | 'rejected' | 'implemented' | 'failed';
  consensusScore?: number;
  qualityMetrics: QualityMetrics;
  riskAssessment: RiskAssessment;
  created: Date;
  traceId: string;
  brandAffinity: string[];
}

export interface DemotionProposal {
  id: string;
  logicId: string;
  proposer: string;
  agent: string;
  reason: string;
  evidence: Evidence[];
  severity: 'minor' | 'major' | 'critical';
  affectedStakes: string[];
  votes: DemotionVote[];
  status: 'proposed' | 'voting' | 'approved' | 'rejected' | 'implemented';
  votingEndTime: Date;
  created: Date;
  traceId: string;
  brandAffinity: string[];
}

export interface SupportingStake {
  staker: string;
  agent: string;
  amount: number;
  reason: string;
  timestamp: Date;
  stakePositionId: string;
}

export interface PromotionVote {
  voter: string;
  voteType: 'approve' | 'reject' | 'abstain';
  tokenWeight: number;
  reasoning: string;
  qualityAssessment?: QualityAssessment;
  timestamp: Date;
}

export interface DemotionVote {
  voter: string;
  voteType: 'approve' | 'reject' | 'abstain';
  tokenWeight: number;
  reasoning: string;
  evidenceAssessment?: EvidenceAssessment;
  timestamp: Date;
}

export interface QualityMetrics {
  codeQuality: number;        // 0-100
  documentation: number;      // 0-100
  testCoverage: number;       // 0-100
  performance: number;        // 0-100
  security: number;           // 0-100
  innovation: number;         // 0-100
  overall: number;            // Calculated weighted average
}

export interface RiskAssessment {
  securityRisk: 'low' | 'medium' | 'high' | 'critical';
  performanceRisk: 'low' | 'medium' | 'high';
  compatibilityRisk: 'low' | 'medium' | 'high';
  maintenanceRisk: 'low' | 'medium' | 'high';
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  mitigationStrategies: string[];
}

export interface Evidence {
  type: 'performance_degradation' | 'security_vulnerability' | 'user_complaints' | 'system_errors' | 'policy_violation';
  description: string;
  data: any;
  severity: 'minor' | 'major' | 'critical';
  timestamp: Date;
  reporter: string;
}

export interface QualityAssessment {
  dimension: keyof QualityMetrics;
  score: number;
  feedback: string;
  reviewer: string;
}

export interface EvidenceAssessment {
  evidenceId: string;
  validity: 'valid' | 'invalid' | 'inconclusive';
  severity: 'minor' | 'major' | 'critical';
  feedback: string;
  reviewer: string;
}

class TokenPromotion {
  private promotionProposals: Map<string, PromotionProposal> = new Map();
  private demotionProposals: Map<string, DemotionProposal> = new Map();
  private proposalHistory: Array<PromotionProposal | DemotionProposal> = [];
  private promotionLogger = logger.createChildLogger('token-promotion');

  constructor() {
    this.startProposalCleanup();
  }

  /**
   * Submit logic promotion proposal with token staking
   */
  async submitPromotionProposal(
    proposer: string,
    proposal: {
      logicId: string;
      agent: string;
      title: string;
      description: string;
      reason: string;
      logicModule: PromotionProposal['logicModule'];
      brandAffinity?: string[];
      priority?: Priority;
    }
  ): Promise<string> {
    const traceId = this.generateTraceId();
    
    // Get proposer account to validate token balance
    const proposerAccount = await tokenKernel.getAccount(proposer);
    if (!proposerAccount) {
      throw new Error(`Proposer account ${proposer} not found`);
    }

    // Calculate required token stake based on proposal complexity and risk
    const tokenRequirement = this.calculateTokenRequirement(proposal);
    
    if (proposerAccount.balance < tokenRequirement) {
      throw new Error(
        `Insufficient tokens for proposal. Required: ${tokenRequirement}, Available: ${proposerAccount.balance}`
      );
    }

    // Perform initial quality assessment
    const qualityMetrics = this.assessLogicQuality(proposal.logicModule);
    const riskAssessment = this.assessRisk(proposal.logicModule);

    // Create promotion proposal
    const promotionProposal: PromotionProposal = {
      id: this.generateId(),
      logicId: proposal.logicId,
      proposer,
      agent: proposal.agent,
      title: proposal.title,
      description: proposal.description,
      reason: proposal.reason,
      logicModule: proposal.logicModule,
      tokenRequirement,
      proposerStake: 0, // Will be set when staking
      supportingStakes: [],
      totalStaked: 0,
      votingPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
      votingEndTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      votes: [],
      status: 'staking',
      qualityMetrics,
      riskAssessment,
      created: new Date(),
      traceId,
      brandAffinity: proposal.brandAffinity || ['JRVI']
    };

    this.promotionProposals.set(promotionProposal.id, promotionProposal);

    this.promotionLogger.audit(
      `Promotion proposal submitted: ${proposal.logicId}`,
      'promotion-proposal',
      {
        proposalId: promotionProposal.id,
        logicId: proposal.logicId,
        proposer,
        agent: proposal.agent,
        tokenRequirement,
        qualityScore: qualityMetrics.overall,
        riskLevel: riskAssessment.overallRisk,
        traceId
      },
      {
        tags: ['promotion-proposal', 'logic-promotion'],
        brandAffinity: promotionProposal.brandAffinity,
        lineage: [traceId]
      }
    );

    return promotionProposal.id;
  }

  /**
   * Stake tokens in support of a promotion proposal
   */
  async stakeForProposal(
    proposalId: string,
    staker: string,
    amount: number,
    metadata: {
      agent: string;
      reason: string;
    }
  ): Promise<string> {
    const proposal = this.promotionProposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Promotion proposal ${proposalId} not found`);
    }

    if (proposal.status !== 'staking') {
      throw new Error(`Proposal ${proposalId} is not in staking phase`);
    }

    // Stake tokens through token kernel
    const stakePositionId = await tokenKernel.stakeTokens(
      staker,
      amount,
      'logic_support',
      {
        logicId: proposal.logicId,
        reason: `Support for logic promotion: ${metadata.reason}`,
        agent: metadata.agent
      }
    );

    // Add supporting stake to proposal
    const supportingStake: SupportingStake = {
      staker,
      agent: metadata.agent,
      amount,
      reason: metadata.reason,
      timestamp: new Date(),
      stakePositionId
    };

    if (staker === proposal.proposer) {
      proposal.proposerStake = amount;
    } else {
      proposal.supportingStakes.push(supportingStake);
    }

    proposal.totalStaked += amount;

    // Check if minimum staking requirement is met
    if (proposal.totalStaked >= proposal.tokenRequirement) {
      proposal.status = 'voting';
      proposal.votingEndTime = new Date(Date.now() + proposal.votingPeriod);
      
      this.promotionLogger.audit(
        `Promotion proposal moved to voting: ${proposal.logicId}`,
        'promotion-voting',
        {
          proposalId,
          totalStaked: proposal.totalStaked,
          tokenRequirement: proposal.tokenRequirement,
          traceId: proposal.traceId
        },
        {
          tags: ['promotion-voting', 'voting-phase'],
          brandAffinity: proposal.brandAffinity,
          lineage: [proposal.traceId]
        }
      );
    }

    this.promotionLogger.audit(
      `Tokens staked for promotion: ${amount} by ${staker}`,
      'promotion-staking',
      {
        proposalId,
        staker,
        amount,
        agent: metadata.agent,
        reason: metadata.reason,
        totalStaked: proposal.totalStaked,
        stakePositionId,
        traceId: proposal.traceId
      },
      {
        tags: ['promotion-stake', 'token-stake'],
        brandAffinity: proposal.brandAffinity,
        lineage: [proposal.traceId]
      }
    );

    return stakePositionId;
  }

  /**
   * Vote on promotion proposal
   */
  async voteOnPromotion(
    proposalId: string,
    voter: string,
    voteType: 'approve' | 'reject' | 'abstain',
    reasoning: string,
    qualityAssessments?: QualityAssessment[]
  ): Promise<boolean> {
    const proposal = this.promotionProposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Promotion proposal ${proposalId} not found`);
    }

    if (proposal.status !== 'voting') {
      throw new Error(`Proposal ${proposalId} is not in voting phase`);
    }

    if (new Date() > proposal.votingEndTime) {
      proposal.status = 'rejected';
      throw new Error(`Voting period for proposal ${proposalId} has ended`);
    }

    // Check if voter has already voted
    const existingVote = proposal.votes.find(v => v.voter === voter);
    if (existingVote) {
      throw new Error(`Voter ${voter} has already voted on proposal ${proposalId}`);
    }

    // Get voter's token weight
    const voterAccount = await tokenKernel.getAccount(voter);
    if (!voterAccount) {
      throw new Error(`Voter account ${voter} not found`);
    }

    // Check governance participation eligibility
    if (!tokenKernel.canParticipateInGovernance(voter)) {
      throw new Error(`Voter ${voter} does not meet governance token threshold`);
    }

    const vote: PromotionVote = {
      voter,
      voteType,
      tokenWeight: voterAccount.votingPower,
      reasoning,
      qualityAssessment: qualityAssessments?.[0], // For simplicity, take first assessment
      timestamp: new Date()
    };

    proposal.votes.push(vote);

    // Update quality metrics if assessments provided
    if (qualityAssessments && qualityAssessments.length > 0) {
      this.updateQualityMetrics(proposal, qualityAssessments);
    }

    this.promotionLogger.audit(
      `Vote cast on promotion: ${voteType} by ${voter}`,
      'promotion-voting',
      {
        proposalId,
        voter,
        voteType,
        tokenWeight: vote.tokenWeight,
        reasoning,
        traceId: proposal.traceId
      },
      {
        tags: ['promotion-vote', voteType],
        brandAffinity: proposal.brandAffinity,
        lineage: [proposal.traceId]
      }
    );

    // Check if voting is complete
    this.checkVotingComplete(proposal);

    return true;
  }

  /**
   * Submit logic demotion proposal
   */
  async submitDemotionProposal(
    proposer: string,
    demotion: {
      logicId: string;
      agent: string;
      reason: string;
      evidence: Evidence[];
      severity: 'minor' | 'major' | 'critical';
      brandAffinity?: string[];
    }
  ): Promise<string> {
    const traceId = this.generateTraceId();

    // Find affected stakes for this logic
    const allStakes = await this.getStakesForLogic(demotion.logicId);
    
    const demotionProposal: DemotionProposal = {
      id: this.generateId(),
      logicId: demotion.logicId,
      proposer,
      agent: demotion.agent,
      reason: demotion.reason,
      evidence: demotion.evidence,
      severity: demotion.severity,
      affectedStakes: allStakes.map(s => s.id),
      votes: [],
      status: 'voting',
      votingEndTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days for demotion
      created: new Date(),
      traceId,
      brandAffinity: demotion.brandAffinity || ['JRVI']
    };

    this.demotionProposals.set(demotionProposal.id, demotionProposal);

    this.promotionLogger.audit(
      `Demotion proposal submitted: ${demotion.logicId}`,
      'demotion-proposal',
      {
        proposalId: demotionProposal.id,
        logicId: demotion.logicId,
        proposer,
        agent: demotion.agent,
        severity: demotion.severity,
        evidenceCount: demotion.evidence.length,
        affectedStakes: allStakes.length,
        traceId
      },
      {
        tags: ['demotion-proposal', 'logic-demotion'],
        brandAffinity: demotionProposal.brandAffinity,
        lineage: [traceId]
      }
    );

    return demotionProposal.id;
  }

  /**
   * Vote on demotion proposal
   */
  async voteOnDemotion(
    proposalId: string,
    voter: string,
    voteType: 'approve' | 'reject' | 'abstain',
    reasoning: string,
    evidenceAssessments?: EvidenceAssessment[]
  ): Promise<boolean> {
    const proposal = this.demotionProposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Demotion proposal ${proposalId} not found`);
    }

    if (proposal.status !== 'voting') {
      throw new Error(`Proposal ${proposalId} is not in voting phase`);
    }

    if (new Date() > proposal.votingEndTime) {
      proposal.status = 'rejected';
      throw new Error(`Voting period for proposal ${proposalId} has ended`);
    }

    // Check if voter has already voted
    const existingVote = proposal.votes.find(v => v.voter === voter);
    if (existingVote) {
      throw new Error(`Voter ${voter} has already voted on proposal ${proposalId}`);
    }

    // Get voter's token weight
    const voterAccount = await tokenKernel.getAccount(voter);
    if (!voterAccount) {
      throw new Error(`Voter account ${voter} not found`);
    }

    if (!tokenKernel.canParticipateInGovernance(voter)) {
      throw new Error(`Voter ${voter} does not meet governance token threshold`);
    }

    const vote: DemotionVote = {
      voter,
      voteType,
      tokenWeight: voterAccount.votingPower,
      reasoning,
      evidenceAssessment: evidenceAssessments?.[0],
      timestamp: new Date()
    };

    proposal.votes.push(vote);

    this.promotionLogger.audit(
      `Vote cast on demotion: ${voteType} by ${voter}`,
      'demotion-voting',
      {
        proposalId,
        voter,
        voteType,
        tokenWeight: vote.tokenWeight,
        reasoning,
        traceId: proposal.traceId
      },
      {
        tags: ['demotion-vote', voteType],
        brandAffinity: proposal.brandAffinity,
        lineage: [proposal.traceId]
      }
    );

    // Check if voting is complete
    this.checkDemotionVotingComplete(proposal);

    return true;
  }

  /**
   * Get active promotion proposals
   */
  getActivePromotions(): PromotionProposal[] {
    return Array.from(this.promotionProposals.values())
      .filter(p => ['staking', 'voting'].includes(p.status))
      .sort((a, b) => b.created.getTime() - a.created.getTime());
  }

  /**
   * Get active demotion proposals
   */
  getActiveDemotions(): DemotionProposal[] {
    return Array.from(this.demotionProposals.values())
      .filter(p => p.status === 'voting')
      .sort((a, b) => b.created.getTime() - a.created.getTime());
  }

  /**
   * Get proposal by ID
   */
  getPromotionProposal(id: string): PromotionProposal | null {
    return this.promotionProposals.get(id) || null;
  }

  /**
   * Get demotion proposal by ID
   */
  getDemotionProposal(id: string): DemotionProposal | null {
    return this.demotionProposals.get(id) || null;
  }

  /**
   * Get proposal statistics
   */
  getProposalStats(): {
    activePromotions: number;
    activeDemotions: number;
    totalProposals: number;
    approvedPromotions: number;
    rejectedPromotions: number;
    totalTokensStaked: number;
    averageQualityScore: number;
  } {
    const promotions = Array.from(this.promotionProposals.values());
    const demotions = Array.from(this.demotionProposals.values());
    
    const totalTokensStaked = promotions.reduce((sum, p) => sum + p.totalStaked, 0);
    const qualityScores = promotions.map(p => p.qualityMetrics.overall).filter(s => s > 0);
    const averageQualityScore = qualityScores.length > 0 
      ? qualityScores.reduce((sum, s) => sum + s, 0) / qualityScores.length 
      : 0;

    return {
      activePromotions: promotions.filter(p => ['staking', 'voting'].includes(p.status)).length,
      activeDemotions: demotions.filter(d => d.status === 'voting').length,
      totalProposals: promotions.length + demotions.length,
      approvedPromotions: promotions.filter(p => p.status === 'approved').length,
      rejectedPromotions: promotions.filter(p => p.status === 'rejected').length,
      totalTokensStaked,
      averageQualityScore
    };
  }

  private calculateTokenRequirement(proposal: any): number {
    // Base requirement
    let requirement = 1000;
    
    // Increase based on complexity
    const codeLines = proposal.logicModule.code.split('\n').length;
    requirement += Math.floor(codeLines / 10) * 100;
    
    // Increase based on dependencies
    requirement += proposal.logicModule.dependencies.length * 200;
    
    // Minimum and maximum bounds
    return Math.max(500, Math.min(requirement, 10000));
  }

  private assessLogicQuality(logicModule: any): QualityMetrics {
    // Simplified quality assessment
    const codeQuality = Math.min(100, Math.max(0, 70 + Math.random() * 30));
    const documentation = logicModule.documentation ? 
      Math.min(100, logicModule.documentation.length / 10) : 0;
    const testCoverage = logicModule.tests ? 
      Math.min(100, logicModule.tests.length * 20) : 0;
    const performance = Math.min(100, Math.max(0, 60 + Math.random() * 40));
    const security = Math.min(100, Math.max(0, 75 + Math.random() * 25));
    const innovation = Math.min(100, Math.max(0, 50 + Math.random() * 50));
    
    const overall = (codeQuality * 0.25 + documentation * 0.15 + testCoverage * 0.2 + 
                    performance * 0.15 + security * 0.15 + innovation * 0.1);

    return {
      codeQuality,
      documentation,
      testCoverage,
      performance,
      security,
      innovation,
      overall
    };
  }

  private assessRisk(logicModule: any): RiskAssessment {
    // Simplified risk assessment
    const hasTests = logicModule.tests && logicModule.tests.length > 0;
    const hasDocumentation = logicModule.documentation && logicModule.documentation.length > 100;
    const dependencyCount = logicModule.dependencies.length;
    
    const securityRisk = dependencyCount > 5 ? 'high' : hasTests ? 'low' : 'medium';
    const performanceRisk = logicModule.code.includes('loop') ? 'medium' : 'low';
    const compatibilityRisk = dependencyCount > 10 ? 'high' : 'low';
    const maintenanceRisk = hasDocumentation ? 'low' : 'medium';
    
    const riskLevels = [securityRisk, performanceRisk, compatibilityRisk, maintenanceRisk];
    const overallRisk = riskLevels.includes('high') ? 'high' : 
                       riskLevels.includes('medium') ? 'medium' : 'low';

    return {
      securityRisk: securityRisk as any,
      performanceRisk: performanceRisk as any,
      compatibilityRisk: compatibilityRisk as any,
      maintenanceRisk: maintenanceRisk as any,
      overallRisk: overallRisk as any,
      mitigationStrategies: [
        'Comprehensive testing',
        'Security audit',
        'Performance monitoring',
        'Documentation updates'
      ]
    };
  }

  private updateQualityMetrics(proposal: PromotionProposal, assessments: QualityAssessment[]): void {
    // Update metrics based on community assessments
    for (const assessment of assessments) {
      if (assessment.dimension in proposal.qualityMetrics) {
        // Average with existing score, weighted by reviewer reputation
        const currentScore = proposal.qualityMetrics[assessment.dimension];
        const newScore = (currentScore + assessment.score) / 2;
        (proposal.qualityMetrics as any)[assessment.dimension] = newScore;
      }
    }
    
    // Recalculate overall score
    const metrics = proposal.qualityMetrics;
    proposal.qualityMetrics.overall = (
      metrics.codeQuality * 0.25 + 
      metrics.documentation * 0.15 + 
      metrics.testCoverage * 0.2 + 
      metrics.performance * 0.15 + 
      metrics.security * 0.15 + 
      metrics.innovation * 0.1
    );
  }

  private checkVotingComplete(proposal: PromotionProposal): void {
    const totalVotingPower = proposal.votes.reduce((sum, vote) => sum + vote.tokenWeight, 0);
    const approveVotingPower = proposal.votes
      .filter(v => v.voteType === 'approve')
      .reduce((sum, vote) => sum + vote.tokenWeight, 0);

    // Simple majority with minimum participation
    const minimumParticipation = proposal.totalStaked * 0.1;
    const approvalThreshold = 0.6; // 60% approval required

    if (totalVotingPower >= minimumParticipation) {
      const approvalRatio = approveVotingPower / totalVotingPower;
      
      if (approvalRatio >= approvalThreshold) {
        proposal.status = 'approved';
        this.proposalHistory.push(proposal);
        this.promotionProposals.delete(proposal.id);
        
        this.promotionLogger.audit(
          `Promotion proposal approved: ${proposal.logicId}`,
          'promotion-approved',
          {
            proposalId: proposal.id,
            approvalRatio,
            totalVotingPower,
            qualityScore: proposal.qualityMetrics.overall,
            traceId: proposal.traceId
          },
          {
            tags: ['promotion-approved', 'logic-promoted'],
            brandAffinity: proposal.brandAffinity,
            lineage: [proposal.traceId]
          }
        );
      }
    }
  }

  private checkDemotionVotingComplete(proposal: DemotionProposal): void {
    const totalVotingPower = proposal.votes.reduce((sum, vote) => sum + vote.tokenWeight, 0);
    const approveVotingPower = proposal.votes
      .filter(v => v.voteType === 'approve')
      .reduce((sum, vote) => sum + vote.tokenWeight, 0);

    const approvalThreshold = 0.5; // 50% approval for demotion
    const minimumParticipation = 1000; // Minimum voting power needed

    if (totalVotingPower >= minimumParticipation) {
      const approvalRatio = approveVotingPower / totalVotingPower;
      
      if (approvalRatio >= approvalThreshold) {
        proposal.status = 'approved';
        this.proposalHistory.push(proposal);
        this.demotionProposals.delete(proposal.id);
        
        // Slash affected stakes
        this.executeStakeSlashing(proposal);
        
        this.promotionLogger.audit(
          `Demotion proposal approved: ${proposal.logicId}`,
          'demotion-approved',
          {
            proposalId: proposal.id,
            approvalRatio,
            totalVotingPower,
            severity: proposal.severity,
            traceId: proposal.traceId
          },
          {
            tags: ['demotion-approved', 'logic-demoted'],
            brandAffinity: proposal.brandAffinity,
            lineage: [proposal.traceId]
          }
        );
      }
    }
  }

  private async executeStakeSlashing(proposal: DemotionProposal): Promise<void> {
    for (const stakeId of proposal.affectedStakes) {
      try {
        await tokenKernel.slashStake(stakeId, proposal.severity, {
          agent: proposal.agent,
          reason: `Logic demotion: ${proposal.reason}`,
          evidence: proposal.evidence,
          logicId: proposal.logicId
        });
      } catch (error) {
        this.promotionLogger.error(
          `Failed to slash stake ${stakeId}: ${error}`,
          'stake-slashing',
          { stakeId, proposalId: proposal.id, error }
        );
      }
    }
  }

  private async getStakesForLogic(logicId: string): Promise<StakePosition[]> {
    // This would query all stake positions for a specific logic
    // For now, return empty array
    return [];
  }

  private startProposalCleanup(): void {
    setInterval(() => {
      const now = new Date();
      
      // Clean up expired promotion proposals
      for (const [proposalId, proposal] of this.promotionProposals) {
        if (proposal.status === 'voting' && now > proposal.votingEndTime) {
          proposal.status = 'rejected';
          this.proposalHistory.push(proposal);
          this.promotionProposals.delete(proposalId);
          
          this.promotionLogger.audit(
            `Promotion proposal expired: ${proposal.logicId}`,
            'promotion-expired',
            {
              proposalId,
              logicId: proposal.logicId,
              traceId: proposal.traceId
            },
            {
              tags: ['promotion-expired'],
              brandAffinity: proposal.brandAffinity,
              lineage: [proposal.traceId]
            }
          );
        }
      }

      // Clean up expired demotion proposals
      for (const [proposalId, proposal] of this.demotionProposals) {
        if (proposal.status === 'voting' && now > proposal.votingEndTime) {
          proposal.status = 'rejected';
          this.proposalHistory.push(proposal);
          this.demotionProposals.delete(proposalId);
          
          this.promotionLogger.audit(
            `Demotion proposal expired: ${proposal.logicId}`,
            'demotion-expired',
            {
              proposalId,
              logicId: proposal.logicId,
              traceId: proposal.traceId
            },
            {
              tags: ['demotion-expired'],
              brandAffinity: proposal.brandAffinity,
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
    return 'prom-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 6);
  }
}

// Singleton instance
export const tokenPromotion = new TokenPromotion();

export default tokenPromotion;