/**
 * Swarm Hive - Consensus scoring and voting for logic promotion
 * Coordinates distributed evaluation and consensus building across the JRVI network
 */

import { logger } from '../utils/logging';
import { tokenKernel } from './tokenKernel';
import { tokenPromotion, PromotionProposal, QualityMetrics } from './tokenPromotion';

export interface SwarmEvaluator {
  id: string;
  agent: string;
  address: string;
  expertise: ExpertiseDomain[];
  reputation: number;
  totalEvaluations: number;
  accuracyScore: number;
  lastActive: Date;
  votingPower: number;
  specializations: string[];
  brandAffinity: string[];
  status: 'active' | 'inactive' | 'suspended';
}

export interface ExpertiseDomain {
  domain: 'security' | 'performance' | 'usability' | 'innovation' | 'documentation' | 'testing' | 'architecture';
  level: 'novice' | 'intermediate' | 'expert' | 'master';
  experience: number; // Years or evaluation count
  certifications: string[];
}

export interface ConsensusEvaluation {
  id: string;
  proposalId: string;
  evaluator: string;
  agent: string;
  evaluation: {
    overall: number; // 0-100
    dimensions: {
      technical: number;
      security: number;
      innovation: number;
      usability: number;
      documentation: number;
      performance: number;
    };
    confidence: number; // 0-100
    timeSpent: number; // Minutes
  };
  reasoning: string;
  evidence: EvaluationEvidence[];
  timestamp: Date;
  weight: number; // Calculated based on evaluator reputation and expertise
  traceId: string;
}

export interface EvaluationEvidence {
  type: 'code_analysis' | 'test_results' | 'security_scan' | 'performance_benchmark' | 'user_feedback';
  description: string;
  data: any;
  confidence: number;
  tools?: string[];
}

export interface ConsensusResult {
  proposalId: string;
  overallScore: number;
  consensusReached: boolean;
  participantCount: number;
  totalWeight: number;
  dimensionScores: {
    technical: number;
    security: number;
    innovation: number;
    usability: number;
    documentation: number;
    performance: number;
  };
  confidence: number;
  convergenceRate: number;
  outliers: string[]; // Evaluator IDs with significantly different scores
  recommendation: 'approve' | 'reject' | 'needs_revision';
  timestamp: Date;
  traceId: string;
}

export interface SwarmTask {
  id: string;
  type: 'logic_evaluation' | 'security_audit' | 'performance_analysis' | 'code_review';
  proposalId: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  requiredExpertise: ExpertiseDomain['domain'][];
  minEvaluators: number;
  maxEvaluators: number;
  deadline: Date;
  reward: number;
  assignedEvaluators: string[];
  completedEvaluations: string[];
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  created: Date;
  traceId: string;
}

export interface SwarmMetrics {
  totalEvaluators: number;
  activeEvaluators: number;
  pendingTasks: number;
  completedTasks: number;
  averageConsensusTime: number;
  averageAccuracy: number;
  consensusReachRate: number;
  expertiseCoverage: Record<string, number>;
}

class SwarmHive {
  private evaluators: Map<string, SwarmEvaluator> = new Map();
  private evaluations: Map<string, ConsensusEvaluation> = new Map();
  private consensusResults: Map<string, ConsensusResult> = new Map();
  private swarmTasks: Map<string, SwarmTask> = new Map();
  private evaluationHistory: ConsensusEvaluation[] = [];
  private swarmLogger = logger.createChildLogger('swarm-hive');

  constructor() {
    this.startSwarmCoordination();
  }

  /**
   * Register evaluator in the swarm
   */
  async registerEvaluator(
    address: string,
    evaluatorInfo: {
      agent: string;
      expertise: ExpertiseDomain[];
      specializations: string[];
      brandAffinity?: string[];
    }
  ): Promise<string> {
    const traceId = this.generateTraceId();
    
    // Validate evaluator account
    const account = await tokenKernel.getAccount(address);
    if (!account) {
      throw new Error(`Evaluator account ${address} not found`);
    }

    // Check minimum token requirement for evaluators
    if (!tokenKernel.canParticipateInGovernance(address)) {
      throw new Error(`Evaluator ${address} does not meet minimum token requirement`);
    }

    const evaluator: SwarmEvaluator = {
      id: this.generateId(),
      agent: evaluatorInfo.agent,
      address,
      expertise: evaluatorInfo.expertise,
      reputation: 100, // Starting reputation
      totalEvaluations: 0,
      accuracyScore: 0,
      lastActive: new Date(),
      votingPower: account.votingPower,
      specializations: evaluatorInfo.specializations,
      brandAffinity: evaluatorInfo.brandAffinity || ['JRVI'],
      status: 'active'
    };

    this.evaluators.set(evaluator.id, evaluator);

    this.swarmLogger.audit(
      `Evaluator registered: ${evaluatorInfo.agent}`,
      'evaluator-registration',
      {
        evaluatorId: evaluator.id,
        address,
        agent: evaluatorInfo.agent,
        expertise: evaluatorInfo.expertise.map(e => `${e.domain}:${e.level}`),
        specializations: evaluatorInfo.specializations,
        traceId
      },
      {
        tags: ['evaluator-registration', 'swarm-member'],
        brandAffinity: evaluator.brandAffinity,
        lineage: [traceId]
      }
    );

    return evaluator.id;
  }

  /**
   * Submit evaluation for a proposal
   */
  async submitEvaluation(
    evaluatorId: string,
    proposalId: string,
    evaluation: {
      overall: number;
      dimensions: ConsensusEvaluation['evaluation']['dimensions'];
      confidence: number;
      timeSpent: number;
      reasoning: string;
      evidence: EvaluationEvidence[];
    }
  ): Promise<string> {
    const evaluator = this.evaluators.get(evaluatorId);
    if (!evaluator) {
      throw new Error(`Evaluator ${evaluatorId} not found`);
    }

    if (evaluator.status !== 'active') {
      throw new Error(`Evaluator ${evaluatorId} is not active`);
    }

    // Check if evaluator already submitted evaluation for this proposal
    const existingEvaluation = Array.from(this.evaluations.values())
      .find(e => e.evaluator === evaluatorId && e.proposalId === proposalId);
    
    if (existingEvaluation) {
      throw new Error(`Evaluator ${evaluatorId} has already evaluated proposal ${proposalId}`);
    }

    const traceId = this.generateTraceId();
    
    // Calculate evaluation weight based on evaluator reputation and expertise relevance
    const weight = this.calculateEvaluationWeight(evaluator, proposalId);

    const consensusEvaluation: ConsensusEvaluation = {
      id: this.generateId(),
      proposalId,
      evaluator: evaluatorId,
      agent: evaluator.agent,
      evaluation: {
        overall: Math.max(0, Math.min(100, evaluation.overall)),
        dimensions: evaluation.dimensions,
        confidence: Math.max(0, Math.min(100, evaluation.confidence)),
        timeSpent: evaluation.timeSpent
      },
      reasoning: evaluation.reasoning,
      evidence: evaluation.evidence,
      timestamp: new Date(),
      weight,
      traceId
    };

    this.evaluations.set(consensusEvaluation.id, consensusEvaluation);
    this.evaluationHistory.push(consensusEvaluation);

    // Update evaluator stats
    evaluator.totalEvaluations += 1;
    evaluator.lastActive = new Date();

    // Reward evaluator with tokens
    await this.rewardEvaluator(evaluator, consensusEvaluation);

    this.swarmLogger.audit(
      `Evaluation submitted: ${evaluator.agent} for proposal ${proposalId}`,
      'consensus-evaluation',
      {
        evaluationId: consensusEvaluation.id,
        evaluatorId,
        proposalId,
        overallScore: evaluation.overall,
        confidence: evaluation.confidence,
        timeSpent: evaluation.timeSpent,
        weight,
        traceId
      },
      {
        tags: ['consensus-evaluation', 'swarm-evaluation'],
        brandAffinity: evaluator.brandAffinity,
        lineage: [traceId]
      }
    );

    // Check if consensus can be calculated
    await this.checkConsensusStatus(proposalId);

    return consensusEvaluation.id;
  }

  /**
   * Calculate consensus for a proposal
   */
  async calculateConsensus(proposalId: string): Promise<ConsensusResult | null> {
    const evaluations = Array.from(this.evaluations.values())
      .filter(e => e.proposalId === proposalId);

    if (evaluations.length < 3) {
      return null; // Need minimum evaluations for consensus
    }

    const traceId = this.generateTraceId();
    const totalWeight = evaluations.reduce((sum, e) => sum + e.weight, 0);
    
    // Calculate weighted average scores
    const overallScore = this.calculateWeightedAverage(
      evaluations.map(e => ({ value: e.evaluation.overall, weight: e.weight }))
    );

    const dimensionScores = {
      technical: this.calculateWeightedAverage(
        evaluations.map(e => ({ value: e.evaluation.dimensions.technical, weight: e.weight }))
      ),
      security: this.calculateWeightedAverage(
        evaluations.map(e => ({ value: e.evaluation.dimensions.security, weight: e.weight }))
      ),
      innovation: this.calculateWeightedAverage(
        evaluations.map(e => ({ value: e.evaluation.dimensions.innovation, weight: e.weight }))
      ),
      usability: this.calculateWeightedAverage(
        evaluations.map(e => ({ value: e.evaluation.dimensions.usability, weight: e.weight }))
      ),
      documentation: this.calculateWeightedAverage(
        evaluations.map(e => ({ value: e.evaluation.dimensions.documentation, weight: e.weight }))
      ),
      performance: this.calculateWeightedAverage(
        evaluations.map(e => ({ value: e.evaluation.dimensions.performance, weight: e.weight }))
      )
    };

    // Calculate consensus confidence and convergence
    const { consensusReached, confidence, convergenceRate, outliers } = 
      this.analyzeConsensus(evaluations, overallScore);

    // Determine recommendation
    const recommendation = this.determineRecommendation(overallScore, dimensionScores, consensusReached);

    const consensusResult: ConsensusResult = {
      proposalId,
      overallScore,
      consensusReached,
      participantCount: evaluations.length,
      totalWeight,
      dimensionScores,
      confidence,
      convergenceRate,
      outliers,
      recommendation,
      timestamp: new Date(),
      traceId
    };

    this.consensusResults.set(proposalId, consensusResult);

    this.swarmLogger.audit(
      `Consensus calculated for proposal ${proposalId}: ${recommendation} (${overallScore.toFixed(1)})`,
      'consensus-result',
      {
        proposalId,
        overallScore,
        recommendation,
        consensusReached,
        participantCount: evaluations.length,
        confidence,
        convergenceRate,
        traceId
      },
      {
        tags: ['consensus-result', recommendation],
        brandAffinity: ['JRVI'],
        lineage: [traceId]
      }
    );

    // Update evaluator accuracy scores based on consensus
    await this.updateEvaluatorAccuracy(evaluations, consensusResult);

    return consensusResult;
  }

  /**
   * Get consensus result for proposal
   */
  getConsensusResult(proposalId: string): ConsensusResult | null {
    return this.consensusResults.get(proposalId) || null;
  }

  /**
   * Get available evaluators for a task
   */
  getAvailableEvaluators(
    requiredExpertise: ExpertiseDomain['domain'][],
    excludeEvaluators?: string[]
  ): SwarmEvaluator[] {
    return Array.from(this.evaluators.values())
      .filter(evaluator => {
        if (evaluator.status !== 'active') return false;
        if (excludeEvaluators?.includes(evaluator.id)) return false;
        
        // Check if evaluator has required expertise
        const evaluatorDomains = evaluator.expertise.map(e => e.domain);
        return requiredExpertise.some(domain => evaluatorDomains.includes(domain));
      })
      .sort((a, b) => {
        // Sort by reputation and voting power
        const scoreA = a.reputation * 0.7 + a.votingPower * 0.3;
        const scoreB = b.reputation * 0.7 + b.votingPower * 0.3;
        return scoreB - scoreA;
      });
  }

  /**
   * Create evaluation task
   */
  async createSwarmTask(
    proposalId: string,
    taskType: SwarmTask['type'],
    options: {
      priority?: SwarmTask['priority'];
      requiredExpertise: ExpertiseDomain['domain'][];
      minEvaluators?: number;
      maxEvaluators?: number;
      deadline?: Date;
      reward?: number;
    }
  ): Promise<string> {
    const traceId = this.generateTraceId();
    
    const swarmTask: SwarmTask = {
      id: this.generateId(),
      type: taskType,
      proposalId,
      priority: options.priority || 'medium',
      requiredExpertise: options.requiredExpertise,
      minEvaluators: options.minEvaluators || 3,
      maxEvaluators: options.maxEvaluators || 10,
      deadline: options.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
      reward: options.reward || 50,
      assignedEvaluators: [],
      completedEvaluations: [],
      status: 'pending',
      created: new Date(),
      traceId
    };

    this.swarmTasks.set(swarmTask.id, swarmTask);

    // Auto-assign evaluators
    await this.assignEvaluatorsToTask(swarmTask.id);

    this.swarmLogger.audit(
      `Swarm task created: ${taskType} for proposal ${proposalId}`,
      'swarm-task',
      {
        taskId: swarmTask.id,
        type: taskType,
        proposalId,
        requiredExpertise: options.requiredExpertise,
        minEvaluators: swarmTask.minEvaluators,
        reward: swarmTask.reward,
        traceId
      },
      {
        tags: ['swarm-task', taskType],
        brandAffinity: ['JRVI'],
        lineage: [traceId]
      }
    );

    return swarmTask.id;
  }

  /**
   * Get swarm metrics
   */
  getSwarmMetrics(): SwarmMetrics {
    const evaluators = Array.from(this.evaluators.values());
    const activeEvaluators = evaluators.filter(e => e.status === 'active');
    const tasks = Array.from(this.swarmTasks.values());
    const pendingTasks = tasks.filter(t => ['pending', 'assigned', 'in_progress'].includes(t.status));
    const completedTasks = tasks.filter(t => t.status === 'completed');

    const consensusResults = Array.from(this.consensusResults.values());
    const consensusReachRate = consensusResults.length > 0 
      ? consensusResults.filter(r => r.consensusReached).length / consensusResults.length 
      : 0;

    const evaluationTimes = this.evaluationHistory.map(e => e.evaluation.timeSpent);
    const averageConsensusTime = evaluationTimes.length > 0 
      ? evaluationTimes.reduce((sum, time) => sum + time, 0) / evaluationTimes.length 
      : 0;

    const accuracyScores = activeEvaluators.map(e => e.accuracyScore).filter(s => s > 0);
    const averageAccuracy = accuracyScores.length > 0 
      ? accuracyScores.reduce((sum, score) => sum + score, 0) / accuracyScores.length 
      : 0;

    const expertiseCoverage: Record<string, number> = {};
    const domains = ['security', 'performance', 'usability', 'innovation', 'documentation', 'testing', 'architecture'];
    
    for (const domain of domains) {
      expertiseCoverage[domain] = activeEvaluators.filter(e => 
        e.expertise.some(exp => exp.domain === domain)
      ).length;
    }

    return {
      totalEvaluators: evaluators.length,
      activeEvaluators: activeEvaluators.length,
      pendingTasks: pendingTasks.length,
      completedTasks: completedTasks.length,
      averageConsensusTime,
      averageAccuracy,
      consensusReachRate,
      expertiseCoverage
    };
  }

  /**
   * Get evaluator by ID
   */
  getEvaluator(evaluatorId: string): SwarmEvaluator | null {
    return this.evaluators.get(evaluatorId) || null;
  }

  /**
   * Get evaluations for proposal
   */
  getProposalEvaluations(proposalId: string): ConsensusEvaluation[] {
    return Array.from(this.evaluations.values())
      .filter(e => e.proposalId === proposalId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private calculateEvaluationWeight(evaluator: SwarmEvaluator, proposalId: string): number {
    let weight = evaluator.reputation / 100; // Base weight from reputation
    
    // Bonus for expertise relevance (would need proposal details to determine)
    weight += evaluator.expertise.length * 0.1;
    
    // Bonus for voting power
    weight += Math.log(evaluator.votingPower + 1) * 0.05;
    
    // Penalty for inactivity
    const daysSinceActive = (Date.now() - evaluator.lastActive.getTime()) / (24 * 60 * 60 * 1000);
    if (daysSinceActive > 7) {
      weight *= 0.8;
    }

    return Math.max(0.1, Math.min(3.0, weight)); // Clamp between 0.1 and 3.0
  }

  private async rewardEvaluator(evaluator: SwarmEvaluator, evaluation: ConsensusEvaluation): Promise<void> {
    const baseReward = 5;
    const timeBonus = Math.min(evaluation.evaluation.timeSpent / 60, 2); // Up to 2x for time spent
    const confidenceBonus = evaluation.evaluation.confidence / 100;
    const evidenceBonus = evaluation.evidence.length * 0.5;
    
    const totalReward = Math.floor(baseReward * (1 + timeBonus + confidenceBonus + evidenceBonus));

    try {
      await tokenKernel.earnTokens(
        evaluator.address,
        'evaluation_quality',
        {
          agent: evaluator.agent,
          logicId: evaluation.proposalId,
          reason: `Consensus evaluation participation`,
          evidence: [{ evaluationId: evaluation.id, timeSpent: evaluation.evaluation.timeSpent }],
          qualityScore: evaluation.evaluation.confidence / 100
        }
      );
    } catch (error) {
      this.swarmLogger.error(
        `Failed to reward evaluator ${evaluator.id}: ${error}`,
        'evaluator-reward',
        { evaluatorId: evaluator.id, evaluationId: evaluation.id, error }
      );
    }
  }

  private calculateWeightedAverage(values: Array<{ value: number; weight: number }>): number {
    const totalWeight = values.reduce((sum, v) => sum + v.weight, 0);
    if (totalWeight === 0) return 0;
    
    const weightedSum = values.reduce((sum, v) => sum + (v.value * v.weight), 0);
    return weightedSum / totalWeight;
  }

  private analyzeConsensus(
    evaluations: ConsensusEvaluation[], 
    overallScore: number
  ): {
    consensusReached: boolean;
    confidence: number;
    convergenceRate: number;
    outliers: string[];
  } {
    const scores = evaluations.map(e => e.evaluation.overall);
    const standardDeviation = this.calculateStandardDeviation(scores);
    const threshold = 15; // Consensus reached if std dev < 15 points
    
    const consensusReached = standardDeviation < threshold;
    
    // Calculate confidence based on score clustering and evaluator confidence
    const avgEvaluatorConfidence = evaluations.reduce((sum, e) => sum + e.evaluation.confidence, 0) / evaluations.length;
    const scoreDispersion = standardDeviation / 100;
    const confidence = Math.max(0, Math.min(100, avgEvaluatorConfidence * (1 - scoreDispersion)));
    
    // Convergence rate - how quickly scores are converging
    const convergenceRate = Math.max(0, Math.min(100, (threshold - standardDeviation) / threshold * 100));
    
    // Identify outliers (scores > 2 standard deviations from mean)
    const outliers = evaluations
      .filter(e => Math.abs(e.evaluation.overall - overallScore) > 2 * standardDeviation)
      .map(e => e.evaluator);

    return {
      consensusReached,
      confidence,
      convergenceRate,
      outliers
    };
  }

  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    
    return Math.sqrt(avgSquaredDiff);
  }

  private determineRecommendation(
    overallScore: number,
    dimensionScores: ConsensusResult['dimensionScores'],
    consensusReached: boolean
  ): 'approve' | 'reject' | 'needs_revision' {
    if (!consensusReached) {
      return 'needs_revision';
    }

    // Check for critical failures in any dimension
    const criticalThreshold = 30;
    const hasкритicalFailures = Object.values(dimensionScores).some(score => score < criticalThreshold);
    
    if (hasृतcriticalFailures) {
      return 'reject';
    }

    // Overall score thresholds
    if (overallScore >= 75) {
      return 'approve';
    } else if (overallScore >= 60) {
      return 'needs_revision';
    } else {
      return 'reject';
    }
  }

  private async updateEvaluatorAccuracy(
    evaluations: ConsensusEvaluation[],
    consensusResult: ConsensusResult
  ): Promise<void> {
    const consensusScore = consensusResult.overallScore;
    
    for (const evaluation of evaluations) {
      const evaluator = this.evaluators.get(evaluation.evaluator);
      if (!evaluator) continue;

      // Calculate accuracy based on how close the evaluation was to consensus
      const scoreDifference = Math.abs(evaluation.evaluation.overall - consensusScore);
      const accuracy = Math.max(0, 100 - scoreDifference);
      
      // Update evaluator's running accuracy score
      const previousAccuracy = evaluator.accuracyScore;
      const evaluationCount = evaluator.totalEvaluations;
      
      if (evaluationCount === 1) {
        evaluator.accuracyScore = accuracy;
      } else {
        // Weighted average with more weight on recent evaluations
        const weight = 0.3; // 30% weight on new evaluation
        evaluator.accuracyScore = (previousAccuracy * (1 - weight)) + (accuracy * weight);
      }

      // Update reputation based on accuracy
      if (accuracy > 80) {
        evaluator.reputation = Math.min(1000, evaluator.reputation + 1);
      } else if (accuracy < 50) {
        evaluator.reputation = Math.max(0, evaluator.reputation - 2);
      }
    }
  }

  private async checkConsensusStatus(proposalId: string): Promise<void> {
    const evaluations = Array.from(this.evaluations.values())
      .filter(e => e.proposalId === proposalId);

    // Check if we have enough evaluations and can calculate consensus
    if (evaluations.length >= 3) {
      const consensusResult = await this.calculateConsensus(proposalId);
      
      if (consensusResult && consensusResult.consensusReached) {
        // Update proposal with consensus score
        const proposal = tokenPromotion.getPromotionProposal(proposalId);
        if (proposal) {
          proposal.consensusScore = consensusResult.overallScore;
        }
      }
    }
  }

  private async assignEvaluatorsToTask(taskId: string): Promise<void> {
    const task = this.swarmTasks.get(taskId);
    if (!task) return;

    const availableEvaluators = this.getAvailableEvaluators(task.requiredExpertise);
    const assignCount = Math.min(task.maxEvaluators, availableEvaluators.length);

    for (let i = 0; i < assignCount && i < availableEvaluators.length; i++) {
      task.assignedEvaluators.push(availableEvaluators[i].id);
    }

    if (task.assignedEvaluators.length >= task.minEvaluators) {
      task.status = 'assigned';
    }
  }

  private startSwarmCoordination(): void {
    setInterval(() => {
      // Check for task deadlines and cleanup
      const now = new Date();
      
      for (const [taskId, task] of this.swarmTasks) {
        if (task.status !== 'completed' && now > task.deadline) {
          task.status = 'failed';
          
          this.swarmLogger.warn(
            `Swarm task deadline exceeded: ${taskId}`,
            'swarm-coordination',
            {
              taskId,
              type: task.type,
              proposalId: task.proposalId,
              assignedEvaluators: task.assignedEvaluators.length,
              completedEvaluations: task.completedEvaluations.length
            }
          );
        }
      }

      // Update evaluator status based on activity
      for (const [evaluatorId, evaluator] of this.evaluators) {
        const daysSinceActive = (now.getTime() - evaluator.lastActive.getTime()) / (24 * 60 * 60 * 1000);
        
        if (daysSinceActive > 30 && evaluator.status === 'active') {
          evaluator.status = 'inactive';
          
          this.swarmLogger.info(
            `Evaluator marked inactive due to inactivity: ${evaluator.agent}`,
            'swarm-coordination',
            { evaluatorId, daysSinceActive }
          );
        }
      }
    }, 60000); // Check every minute
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  private generateTraceId(): string {
    return 'swarm-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 6);
  }
}

// Singleton instance
export const swarmHive = new SwarmHive();

export default swarmHive;