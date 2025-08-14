/**
 * RAGM Plugin - RAG Memory Integration Plugin
 * Integrates RAG engine with CLTM (Cognitive Long-Term Memory) system
 */

import { RAGPlugin } from './rag_core';
import { cltmCore, MemoryEntry, MemoryType, SecurityLevel } from '../memory/cltm_core';
import { MemorySearchUtils, MemoryAnalyzer } from '../memory/cltm_utils';

export class RAGMPlugin extends RAGPlugin {
  id = 'ragm_plugin';
  name = 'RAGM - RAG Memory Integration';
  version = '1.0.0';
  capabilities = [
    'memory_integration',
    'contextual_retrieval',
    'memory_synthesis',
    'adaptive_learning',
    'knowledge_consolidation'
  ];

  private isInitialized = false;
  private memoryCache: Map<string, MemoryEntry[]> = new Map();
  private cacheConfig: CacheConfig = {
    maxSize: 1000,
    ttl: 300000, // 5 minutes
    enabled: true
  };

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    console.log('[RAGM] Initializing RAG Memory Integration plugin...');
    
    try {
      // Verify CLTM core is available
      if (!cltmCore) {
        throw new Error('CLTM core not available');
      }

      // Initialize memory cache
      this.initializeCache();

      this.isInitialized = true;
      console.log('[RAGM] Plugin initialized successfully');

    } catch (error) {
      console.error('[RAGM] Failed to initialize plugin:', error);
      throw error;
    }
  }

  async process(input: RAGMInput, context: any): Promise<RAGMOutput> {
    const startTime = Date.now();

    if (!this.isInitialized) {
      throw new Error('RAGM plugin not initialized');
    }

    try {
      let result: RAGMOutput;

      switch (input.operation) {
        case 'retrieve':
          result = await this.handleMemoryRetrieval(input);
          break;
        case 'store':
          result = await this.handleMemoryStorage(input);
          break;
        case 'synthesize':
          result = await this.handleMemorySynthesis(input);
          break;
        case 'learn':
          result = await this.handleAdaptiveLearning(input);
          break;
        case 'consolidate':
          result = await this.handleKnowledgeConsolidation(input);
          break;
        default:
          throw new Error(`Unknown operation: ${input.operation}`);
      }

      const processingTime = Date.now() - startTime;
      result.metadata.processingTime = processingTime;

      return result;

    } catch (error) {
      console.error('[RAGM] Processing failed:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    console.log('[RAGM] Cleaning up RAG Memory Integration plugin...');
    
    this.clearCache();
    this.isInitialized = false;
    
    console.log('[RAGM] Plugin cleanup completed');
  }

  // Operation handlers

  private async handleMemoryRetrieval(input: RAGMInput): Promise<RAGMOutput> {
    const { query, options } = input.data;
    const cacheKey = this.generateCacheKey(query, options);

    // Check cache first
    if (this.cacheConfig.enabled && this.memoryCache.has(cacheKey)) {
      const cachedMemories = this.memoryCache.get(cacheKey)!;
      return {
        success: true,
        operation: 'retrieve',
        result: {
          memories: cachedMemories,
          source: 'cache',
          totalFound: cachedMemories.length
        },
        metadata: {
          processingTime: 0,
          cacheHit: true,
          memorySource: 'cache'
        }
      };
    }

    // Retrieve from CLTM
    const memoryQuery = this.buildMemoryQuery(query, options);
    const memories = cltmCore.retrieveMemories(memoryQuery);

    // Apply RAG-specific filtering and ranking
    const rankedMemories = await this.rankMemoriesForRAG(memories, query, options);

    // Cache the results
    if (this.cacheConfig.enabled) {
      this.cacheMemories(cacheKey, rankedMemories);
    }

    return {
      success: true,
      operation: 'retrieve',
      result: {
        memories: rankedMemories,
        source: 'cltm',
        totalFound: rankedMemories.length,
        query: memoryQuery
      },
      metadata: {
        processingTime: 0,
        cacheHit: false,
        memorySource: 'cltm',
        rankingApplied: true
      }
    };
  }

  private async handleMemoryStorage(input: RAGMInput): Promise<RAGMOutput> {
    const { content, type, metadata, tags, context } = input.data;

    // Enhance metadata with RAG context
    const enhancedMetadata = {
      ...metadata,
      source: 'rag_interaction',
      ragContext: context,
      timestamp: new Date(),
      confidence: metadata?.confidence || 0.7
    };

    // Store in CLTM
    const memoryId = cltmCore.storeMemory(
      content,
      type || MemoryType.CONTEXTUAL,
      enhancedMetadata,
      tags || [],
      metadata?.parentId
    );

    // Invalidate relevant cache entries
    this.invalidateRelatedCache(tags || []);

    return {
      success: true,
      operation: 'store',
      result: {
        memoryId,
        stored: true,
        type: type || MemoryType.CONTEXTUAL
      },
      metadata: {
        processingTime: 0,
        cacheInvalidated: true,
        memoryLocation: 'cltm'
      }
    };
  }

  private async handleMemorySynthesis(input: RAGMInput): Promise<RAGMOutput> {
    const { memories, synthesisType, context } = input.data;

    let synthesizedContent: string;
    let confidence: number;

    switch (synthesisType) {
      case 'summarize':
        ({ content: synthesizedContent, confidence } = await this.synthesizeSummary(memories));
        break;
      case 'compare':
        ({ content: synthesizedContent, confidence } = await this.synthesizeComparison(memories));
        break;
      case 'integrate':
        ({ content: synthesizedContent, confidence } = await this.synthesizeIntegration(memories, context));
        break;
      default:
        ({ content: synthesizedContent, confidence } = await this.synthesizeGeneral(memories));
    }

    return {
      success: true,
      operation: 'synthesize',
      result: {
        synthesizedContent,
        confidence,
        sourceMemories: memories.length,
        synthesisType
      },
      metadata: {
        processingTime: 0,
        synthesisMethod: synthesisType,
        qualityScore: confidence
      }
    };
  }

  private async handleAdaptiveLearning(input: RAGMInput): Promise<RAGMOutput> {
    const { interaction, feedback, outcome } = input.data;

    // Analyze the interaction for learning opportunities
    const learningInsights = await this.analyzeInteractionForLearning(interaction, feedback, outcome);

    // Update memory scores and associations based on learning
    const updatedMemories = await this.applyLearningInsights(learningInsights);

    // Store learning metadata
    const learningMemoryId = cltmCore.storeMemory(
      `Learning from RAG interaction: ${interaction.query}`,
      MemoryType.EPISODIC,
      {
        source: 'rag_learning',
        confidence: learningInsights.confidence,
        relevance: 0.8,
        context: {
          learningType: 'adaptive',
          feedback,
          outcome,
          insights: learningInsights
        },
        brandAffinity: [],
        securityLevel: SecurityLevel.PRIVATE,
        version: 1
      },
      ['learning', 'rag', 'adaptive']
    );

    return {
      success: true,
      operation: 'learn',
      result: {
        learningMemoryId,
        insights: learningInsights,
        updatedMemories: updatedMemories.length,
        adaptations: learningInsights.adaptations
      },
      metadata: {
        processingTime: 0,
        learningType: 'adaptive',
        confidenceGain: learningInsights.confidence
      }
    };
  }

  private async handleKnowledgeConsolidation(input: RAGMInput): Promise<RAGMOutput> {
    const { domain, threshold } = input.data;

    // Find memories in the specified domain
    const domainMemories = cltmCore.retrieveMemories({
      tags: domain ? [domain] : undefined,
      minScore: threshold || 0.5,
      includeDecayed: false
    });

    // Analyze for consolidation opportunities
    const consolidationOpportunities = await this.identifyConsolidationOpportunities(domainMemories);

    // Perform consolidation
    const consolidatedMemories = await this.performConsolidation(consolidationOpportunities);

    return {
      success: true,
      operation: 'consolidate',
      result: {
        domain,
        analyzedMemories: domainMemories.length,
        opportunities: consolidationOpportunities.length,
        consolidatedMemories: consolidatedMemories.length,
        consolidationSummary: consolidatedMemories.map(cm => ({
          id: cm.id,
          sourceCount: cm.sourceMemories.length,
          confidence: cm.confidence
        }))
      },
      metadata: {
        processingTime: 0,
        consolidationMethod: 'similarity_clustering',
        qualityImprovement: this.calculateQualityImprovement(consolidatedMemories)
      }
    };
  }

  // Helper methods

  private buildMemoryQuery(query: string, options: any): any {
    const baseQuery: any = {
      keywords: this.extractKeywords(query),
      maxResults: options?.maxResults || 10,
      minScore: options?.minScore || 0.3,
      includeDecayed: options?.includeDecayed || false
    };

    // Add RAG-specific enhancements
    if (options?.types) {
      baseQuery.types = options.types;
    }

    if (options?.tags) {
      baseQuery.tags = options.tags;
    }

    if (options?.timeRange) {
      baseQuery.timeRange = options.timeRange;
    }

    if (options?.brandAffinity) {
      baseQuery.brandAffinity = options.brandAffinity;
    }

    return baseQuery;
  }

  private async rankMemoriesForRAG(memories: MemoryEntry[], query: string, options: any): Promise<MemoryEntry[]> {
    // Calculate RAG-specific relevance scores
    const scoredMemories = memories.map(memory => ({
      memory,
      ragScore: this.calculateRAGRelevance(memory, query, options)
    }));

    // Sort by RAG score
    scoredMemories.sort((a, b) => b.ragScore - a.ragScore);

    // Apply diversity filtering to avoid redundant results
    const diverseMemories = this.applyDiversityFiltering(scoredMemories, options?.diversityThreshold || 0.7);

    return diverseMemories.map(item => item.memory);
  }

  private calculateRAGRelevance(memory: MemoryEntry, query: string, options: any): number {
    let score = memory.score * (1 - memory.decay);

    // Boost based on wisdom
    score += memory.wisdom * 0.2;

    // Boost based on recency for RAG
    const ageBonus = this.calculateAgeBonus(memory.timestamp);
    score += ageBonus * 0.1;

    // Boost based on access frequency
    score += Math.log(memory.accessCount + 1) * 0.05;

    // Content relevance to query
    const contentRelevance = this.calculateContentRelevance(memory.content, query);
    score += contentRelevance * 0.3;

    return Math.min(score, 1.0);
  }

  private applyDiversityFiltering(scoredMemories: Array<{ memory: MemoryEntry; ragScore: number }>, threshold: number): Array<{ memory: MemoryEntry; ragScore: number }> {
    const diverse: Array<{ memory: MemoryEntry; ragScore: number }> = [];
    
    for (const candidate of scoredMemories) {
      let isDiverse = true;
      
      for (const existing of diverse) {
        const similarity = this.calculateMemorySimilarity(candidate.memory, existing.memory);
        if (similarity > threshold) {
          isDiverse = false;
          break;
        }
      }
      
      if (isDiverse) {
        diverse.push(candidate);
      }
    }
    
    return diverse;
  }

  private async synthesizeSummary(memories: MemoryEntry[]): Promise<{ content: string; confidence: number }> {
    const keyPoints = memories.map(memory => memory.content.substring(0, 200));
    const content = `Summary of ${memories.length} related memories:\n\n${keyPoints.join('\n\n')}`;
    const confidence = Math.min(memories.reduce((sum, m) => sum + m.score, 0) / memories.length, 1.0);

    return { content, confidence };
  }

  private async synthesizeComparison(memories: MemoryEntry[]): Promise<{ content: string; confidence: number }> {
    if (memories.length < 2) {
      return { content: 'Insufficient memories for comparison', confidence: 0.3 };
    }

    const content = `Comparison of ${memories.length} memories:\n\n` +
      memories.map((memory, index) => `${index + 1}. ${memory.content.substring(0, 150)}`).join('\n\n');
    
    const confidence = Math.min(memories.reduce((sum, m) => sum + m.score, 0) / memories.length, 1.0);

    return { content, confidence };
  }

  private async synthesizeIntegration(memories: MemoryEntry[], context: any): Promise<{ content: string; confidence: number }> {
    const content = `Integrated knowledge from ${memories.length} sources:\n\n` +
      memories.map(memory => `• ${memory.content.substring(0, 100)}`).join('\n') +
      `\n\nContext: ${JSON.stringify(context)}`;
    
    const confidence = Math.min(memories.reduce((sum, m) => sum + m.score * m.wisdom, 0) / memories.length, 1.0);

    return { content, confidence };
  }

  private async synthesizeGeneral(memories: MemoryEntry[]): Promise<{ content: string; confidence: number }> {
    return this.synthesizeSummary(memories);
  }

  private async analyzeInteractionForLearning(interaction: any, feedback: any, outcome: any): Promise<LearningInsights> {
    return {
      confidence: 0.7,
      adaptations: [
        'Update memory relevance scores based on usage',
        'Strengthen associations between successful memory combinations'
      ],
      patterns: ['High-wisdom memories correlate with better outcomes'],
      recommendations: ['Increase weight of recently accessed memories']
    };
  }

  private async applyLearningInsights(insights: LearningInsights): Promise<MemoryEntry[]> {
    // This would implement actual learning application
    // For now, return empty array as placeholder
    return [];
  }

  private async identifyConsolidationOpportunities(memories: MemoryEntry[]): Promise<ConsolidationOpportunity[]> {
    const clusters = MemoryAnalyzer.clusterMemories(memories, 5);
    
    return clusters
      .filter(cluster => cluster.memories.length > 1)
      .map(cluster => ({
        id: cluster.id,
        memories: cluster.memories,
        similarity: cluster.avgScore,
        consolidationValue: cluster.avgWisdom
      }));
  }

  private async performConsolidation(opportunities: ConsolidationOpportunity[]): Promise<ConsolidatedMemory[]> {
    return opportunities.map(opportunity => ({
      id: `consolidated_${opportunity.id}`,
      sourceMemories: opportunity.memories,
      confidence: opportunity.consolidationValue,
      content: `Consolidated memory from ${opportunity.memories.length} sources`
    }));
  }

  // Utility methods

  private initializeCache(): void {
    if (this.cacheConfig.enabled) {
      // Set up cache cleanup timer
      setInterval(() => {
        this.cleanupExpiredCache();
      }, this.cacheConfig.ttl);
    }
  }

  private generateCacheKey(query: string, options: any): string {
    return `${query}_${JSON.stringify(options)}`.replace(/[^\w]/g, '_');
  }

  private cacheMemories(key: string, memories: MemoryEntry[]): void {
    if (this.memoryCache.size >= this.cacheConfig.maxSize) {
      // Remove oldest entry
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
      }
    }

    this.memoryCache.set(key, memories);
  }

  private invalidateRelatedCache(tags: string[]): void {
    // Remove cache entries that might be affected by new memory
    for (const [key, _] of this.memoryCache) {
      if (tags.some(tag => key.includes(tag))) {
        this.memoryCache.delete(key);
      }
    }
  }

  private clearCache(): void {
    this.memoryCache.clear();
  }

  private cleanupExpiredCache(): void {
    // In a real implementation, this would check timestamps
    // For now, just ensure we don't exceed max size
    if (this.memoryCache.size > this.cacheConfig.maxSize) {
      const keysToDelete = Array.from(this.memoryCache.keys()).slice(0, this.memoryCache.size - this.cacheConfig.maxSize);
      keysToDelete.forEach(key => this.memoryCache.delete(key));
    }
  }

  private extractKeywords(query: string): string[] {
    return query.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  private calculateAgeBonus(timestamp: Date): number {
    const ageHours = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60);
    return Math.max(0, 1 - (ageHours / (24 * 30))); // Bonus decreases over 30 days
  }

  private calculateContentRelevance(content: string, query: string): number {
    const contentWords = new Set(content.toLowerCase().split(/\s+/));
    const queryWords = new Set(query.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...queryWords].filter(word => contentWords.has(word)));
    return intersection.size / queryWords.size;
  }

  private calculateMemorySimilarity(memory1: MemoryEntry, memory2: MemoryEntry): number {
    const content1Words = new Set(memory1.content.toLowerCase().split(/\s+/));
    const content2Words = new Set(memory2.content.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...content1Words].filter(word => content2Words.has(word)));
    const union = new Set([...content1Words, ...content2Words]);
    
    return intersection.size / union.size;
  }

  private calculateQualityImprovement(consolidatedMemories: ConsolidatedMemory[]): number {
    return consolidatedMemories.reduce((sum, cm) => sum + cm.confidence, 0) / consolidatedMemories.length;
  }
}

// Supporting interfaces

interface RAGMInput {
  operation: 'retrieve' | 'store' | 'synthesize' | 'learn' | 'consolidate';
  data: any;
}

interface RAGMOutput {
  success: boolean;
  operation: string;
  result: any;
  metadata: any;
}

interface CacheConfig {
  maxSize: number;
  ttl: number;
  enabled: boolean;
}

interface LearningInsights {
  confidence: number;
  adaptations: string[];
  patterns: string[];
  recommendations: string[];
}

interface ConsolidationOpportunity {
  id: string;
  memories: MemoryEntry[];
  similarity: number;
  consolidationValue: number;
}

interface ConsolidatedMemory {
  id: string;
  sourceMemories: MemoryEntry[];
  confidence: number;
  content: string;
}

// Export plugin instance
export const ragmPlugin = new RAGMPlugin();