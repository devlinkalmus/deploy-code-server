/**
 * CLTM Utilities
 * Helper functions for memory management, analysis, and optimization
 */

import { MemoryEntry, MemoryType, MemoryQuery, SecurityLevel, CLTMCore, cltmCore } from './cltm_core';

/**
 * Memory clustering and analysis utilities
 */
export class MemoryAnalyzer {
  /**
   * Cluster memories by semantic similarity
   */
  static clusterMemories(memories: MemoryEntry[], clusterCount: number = 5): MemoryCluster[] {
    if (memories.length === 0) return [];

    // Simple k-means clustering based on content similarity
    const clusters: MemoryCluster[] = [];
    
    // Initialize clusters with random centroids
    for (let i = 0; i < Math.min(clusterCount, memories.length); i++) {
      const centroid = memories[Math.floor(Math.random() * memories.length)];
      clusters.push({
        id: `cluster_${i}`,
        centroid: centroid.content,
        memories: [],
        avgScore: 0,
        avgWisdom: 0,
        commonTags: []
      });
    }

    // Assign memories to closest clusters
    memories.forEach(memory => {
      let bestCluster = 0;
      let bestSimilarity = -1;

      clusters.forEach((cluster, index) => {
        const similarity = this.calculateTextSimilarity(memory.content, cluster.centroid);
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestCluster = index;
        }
      });

      clusters[bestCluster].memories.push(memory);
    });

    // Calculate cluster statistics
    clusters.forEach(cluster => {
      if (cluster.memories.length > 0) {
        cluster.avgScore = cluster.memories.reduce((sum, m) => sum + m.score, 0) / cluster.memories.length;
        cluster.avgWisdom = cluster.memories.reduce((sum, m) => sum + m.wisdom, 0) / cluster.memories.length;
        cluster.commonTags = this.findCommonTags(cluster.memories);
      }
    });

    return clusters.filter(cluster => cluster.memories.length > 0);
  }

  /**
   * Find memory patterns and trends
   */
  static analyzeMemoryPatterns(memories: MemoryEntry[]): MemoryPatterns {
    const timeDistribution = this.analyzeTimeDistribution(memories);
    const typePatterns = this.analyzeTypePatterns(memories);
    const tagFrequency = this.analyzeTagFrequency(memories);
    const wisdomTrends = this.analyzeWisdomTrends(memories);
    const accessPatterns = this.analyzeAccessPatterns(memories);

    return {
      timeDistribution,
      typePatterns,
      tagFrequency,
      wisdomTrends,
      accessPatterns,
      totalAnalyzed: memories.length
    };
  }

  /**
   * Generate memory insights and recommendations
   */
  static generateInsights(memories: MemoryEntry[]): MemoryInsights {
    const patterns = this.analyzeMemoryPatterns(memories);
    const clusters = this.clusterMemories(memories);
    
    const insights: MemoryInsights = {
      recommendations: [],
      discoveries: [],
      warnings: [],
      optimization: this.generateOptimizationSuggestions(memories, patterns)
    };

    // Generate recommendations
    if (patterns.wisdomTrends.declining > 0.3) {
      insights.recommendations.push({
        type: 'wisdom_decline',
        priority: 'high',
        description: 'Wisdom accumulation is declining. Consider reviewing and updating older memories.',
        action: 'Review memories with high decay and low wisdom scores'
      });
    }

    // Generate discoveries
    const highWisdomMemories = memories.filter(m => m.wisdom > 0.8);
    if (highWisdomMemories.length > 0) {
      insights.discoveries.push({
        type: 'wisdom_hotspots',
        description: `Found ${highWisdomMemories.length} high-wisdom memories that could be leveraged for learning`,
        data: highWisdomMemories.slice(0, 5).map(m => ({ id: m.id, wisdom: m.wisdom, content: m.content.substring(0, 100) }))
      });
    }

    // Generate warnings
    const highDecayMemories = memories.filter(m => m.decay > 0.7);
    if (highDecayMemories.length > memories.length * 0.2) {
      insights.warnings.push({
        type: 'memory_decay',
        severity: 'warning',
        description: `${Math.round((highDecayMemories.length / memories.length) * 100)}% of memories have high decay`,
        affectedCount: highDecayMemories.length
      });
    }

    return insights;
  }

  private static calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private static findCommonTags(memories: MemoryEntry[]): string[] {
    const tagCounts: Record<string, number> = {};
    
    memories.forEach(memory => {
      memory.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const threshold = Math.ceil(memories.length * 0.3); // Tags that appear in 30% of memories
    return Object.entries(tagCounts)
      .filter(([_, count]) => count >= threshold)
      .map(([tag, _]) => tag);
  }

  private static analyzeTimeDistribution(memories: MemoryEntry[]): TimeDistribution {
    const now = new Date();
    const distribution = {
      last24h: 0,
      lastWeek: 0,
      lastMonth: 0,
      lastYear: 0,
      older: 0
    };

    memories.forEach(memory => {
      const ageMs = now.getTime() - memory.timestamp.getTime();
      const ageHours = ageMs / (1000 * 60 * 60);
      const ageDays = ageHours / 24;

      if (ageHours <= 24) distribution.last24h++;
      else if (ageDays <= 7) distribution.lastWeek++;
      else if (ageDays <= 30) distribution.lastMonth++;
      else if (ageDays <= 365) distribution.lastYear++;
      else distribution.older++;
    });

    return distribution;
  }

  private static analyzeTypePatterns(memories: MemoryEntry[]): TypePatterns {
    const typeCounts: Record<MemoryType, number> = {
      [MemoryType.FACTUAL]: 0,
      [MemoryType.PROCEDURAL]: 0,
      [MemoryType.EPISODIC]: 0,
      [MemoryType.SEMANTIC]: 0,
      [MemoryType.EMOTIONAL]: 0,
      [MemoryType.CONTEXTUAL]: 0
    };

    const typeScores: Record<MemoryType, number[]> = {
      [MemoryType.FACTUAL]: [],
      [MemoryType.PROCEDURAL]: [],
      [MemoryType.EPISODIC]: [],
      [MemoryType.SEMANTIC]: [],
      [MemoryType.EMOTIONAL]: [],
      [MemoryType.CONTEXTUAL]: []
    };

    memories.forEach(memory => {
      typeCounts[memory.type]++;
      typeScores[memory.type].push(memory.score);
    });

    const patterns: TypePatterns = {};
    Object.entries(typeCounts).forEach(([type, count]) => {
      const scores = typeScores[type as MemoryType];
      patterns[type as MemoryType] = {
        count,
        percentage: (count / memories.length) * 100,
        avgScore: scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0
      };
    });

    return patterns;
  }

  private static analyzeTagFrequency(memories: MemoryEntry[]): TagFrequency[] {
    const tagCounts: Record<string, number> = {};
    
    memories.forEach(memory => {
      memory.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    return Object.entries(tagCounts)
      .map(([tag, count]) => ({
        tag,
        count,
        frequency: count / memories.length
      }))
      .sort((a, b) => b.count - a.count);
  }

  private static analyzeWisdomTrends(memories: MemoryEntry[]): WisdomTrends {
    const sortedByTime = [...memories].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    if (sortedByTime.length < 2) {
      return { trend: 'stable', growth: 0, declining: 0 };
    }

    const midpoint = Math.floor(sortedByTime.length / 2);
    const firstHalf = sortedByTime.slice(0, midpoint);
    const secondHalf = sortedByTime.slice(midpoint);

    const firstHalfAvg = firstHalf.reduce((sum, m) => sum + m.wisdom, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, m) => sum + m.wisdom, 0) / secondHalf.length;

    const growth = secondHalfAvg - firstHalfAvg;
    
    return {
      trend: growth > 0.1 ? 'growing' : growth < -0.1 ? 'declining' : 'stable',
      growth: Math.max(growth, 0),
      declining: Math.max(-growth, 0)
    };
  }

  private static analyzeAccessPatterns(memories: MemoryEntry[]): AccessPatterns {
    const totalAccess = memories.reduce((sum, m) => sum + m.accessCount, 0);
    const avgAccess = totalAccess / memories.length;
    
    const frequentlyAccessed = memories.filter(m => m.accessCount > avgAccess * 2).length;
    const rarelyAccessed = memories.filter(m => m.accessCount === 0).length;
    
    return {
      avgAccessCount: avgAccess,
      frequentlyAccessed,
      rarelyAccessed,
      accessDistribution: {
        never: memories.filter(m => m.accessCount === 0).length,
        low: memories.filter(m => m.accessCount > 0 && m.accessCount <= avgAccess).length,
        medium: memories.filter(m => m.accessCount > avgAccess && m.accessCount <= avgAccess * 2).length,
        high: memories.filter(m => m.accessCount > avgAccess * 2).length
      }
    };
  }

  private static generateOptimizationSuggestions(memories: MemoryEntry[], patterns: MemoryPatterns): OptimizationSuggestions {
    const suggestions: OptimizationSuggestions = {
      memoryConsolidation: [],
      indexOptimization: [],
      decayManagement: [],
      performanceImprovements: []
    };

    // Memory consolidation suggestions
    if (patterns.typePatterns[MemoryType.EPISODIC]?.count > memories.length * 0.4) {
      suggestions.memoryConsolidation.push({
        type: 'consolidate_episodic',
        description: 'High number of episodic memories detected. Consider consolidating similar episodes.',
        priority: 'medium'
      });
    }

    // Index optimization
    if (patterns.tagFrequency.length > 100) {
      suggestions.indexOptimization.push({
        type: 'tag_cleanup',
        description: 'Large number of tags detected. Consider tag consolidation for better performance.',
        priority: 'low'
      });
    }

    // Decay management
    const highDecayCount = memories.filter(m => m.decay > 0.5).length;
    if (highDecayCount > memories.length * 0.3) {
      suggestions.decayManagement.push({
        type: 'decay_review',
        description: 'Many memories with high decay. Consider reviewing and refreshing important memories.',
        priority: 'high'
      });
    }

    return suggestions;
  }
}

/**
 * Memory search and filtering utilities
 */
export class MemorySearchUtils {
  /**
   * Advanced semantic search
   */
  static semanticSearch(
    query: string, 
    memories: MemoryEntry[], 
    options: SemanticSearchOptions = {}
  ): SemanticSearchResult[] {
    const {
      threshold = 0.3,
      maxResults = 10,
      boostRecentMemories = true,
      boostHighWisdom = true,
      contextWeight = 0.3
    } = options;

    const queryWords = new Set(query.toLowerCase().split(/\s+/));
    const results: SemanticSearchResult[] = [];

    memories.forEach(memory => {
      const relevanceScore = this.calculateSemanticRelevance(
        memory, 
        queryWords, 
        { boostRecentMemories, boostHighWisdom, contextWeight }
      );

      if (relevanceScore >= threshold) {
        results.push({
          memory,
          relevanceScore,
          matchedKeywords: this.findMatchedKeywords(memory.content, Array.from(queryWords)),
          contextMatch: this.calculateContextMatch(memory, query)
        });
      }
    });

    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults);
  }

  /**
   * Multi-faceted search combining various criteria
   */
  static multiFacetedSearch(criteria: MultiFacetedSearchCriteria): MemoryEntry[] {
    let candidates = Array.from(cltmCore['memories'].values());

    // Apply each filter
    if (criteria.textQuery) {
      const textResults = this.semanticSearch(criteria.textQuery, candidates, criteria.searchOptions);
      candidates = textResults.map(r => r.memory);
    }

    if (criteria.memoryQuery) {
      candidates = cltmCore.retrieveMemories({
        ...criteria.memoryQuery,
        maxResults: candidates.length
      });
    }

    if (criteria.similarTo) {
      candidates = this.findSimilarMemories(criteria.similarTo, candidates, criteria.similarityThreshold || 0.5);
    }

    if (criteria.relatedTo) {
      candidates = this.findRelatedMemories(criteria.relatedTo, candidates);
    }

    return candidates.slice(0, criteria.maxResults || 50);
  }

  /**
   * Find memories similar to a given memory
   */
  static findSimilarMemories(
    targetMemory: MemoryEntry, 
    candidates: MemoryEntry[], 
    threshold: number = 0.5
  ): MemoryEntry[] {
    const similar: Array<{ memory: MemoryEntry; similarity: number }> = [];

    candidates.forEach(candidate => {
      if (candidate.id === targetMemory.id) return;

      const contentSimilarity = this.calculateContentSimilarity(
        targetMemory.content, 
        candidate.content
      );
      
      const tagSimilarity = this.calculateTagSimilarity(
        targetMemory.tags, 
        candidate.tags
      );

      const typeSimilarity = targetMemory.type === candidate.type ? 1 : 0;

      const overallSimilarity = (contentSimilarity * 0.6) + (tagSimilarity * 0.3) + (typeSimilarity * 0.1);

      if (overallSimilarity >= threshold) {
        similar.push({ memory: candidate, similarity: overallSimilarity });
      }
    });

    return similar
      .sort((a, b) => b.similarity - a.similarity)
      .map(item => item.memory);
  }

  private static calculateSemanticRelevance(
    memory: MemoryEntry,
    queryWords: Set<string>,
    options: { boostRecentMemories: boolean; boostHighWisdom: boolean; contextWeight: number }
  ): number {
    const memoryWords = new Set(memory.content.toLowerCase().split(/\s+/));
    const matchedWords = Array.from(queryWords).filter(word => 
      Array.from(memoryWords).some(memWord => memWord.includes(word) || word.includes(memWord))
    );

    let baseScore = matchedWords.length / queryWords.size;

    // Apply boosts
    if (options.boostRecentMemories) {
      const ageHours = (Date.now() - memory.timestamp.getTime()) / (1000 * 60 * 60);
      const recencyBoost = Math.max(0, 1 - (ageHours / (24 * 30))); // Boost for memories less than 30 days old
      baseScore += recencyBoost * 0.2;
    }

    if (options.boostHighWisdom) {
      baseScore += memory.wisdom * 0.3;
    }

    // Apply decay penalty
    baseScore *= (1 - memory.decay);

    // Context matching boost
    const contextScore = this.calculateContextRelevance(memory, Array.from(queryWords));
    baseScore += contextScore * options.contextWeight;

    return Math.min(baseScore, 1);
  }

  private static calculateContextRelevance(memory: MemoryEntry, queryWords: string[]): number {
    let contextScore = 0;

    // Check tags
    const tagMatches = memory.tags.filter(tag => 
      queryWords.some(word => tag.toLowerCase().includes(word.toLowerCase()))
    ).length;
    contextScore += (tagMatches / Math.max(memory.tags.length, 1)) * 0.4;

    // Check metadata context
    if (memory.metadata.context) {
      const contextString = JSON.stringify(memory.metadata.context).toLowerCase();
      const contextMatches = queryWords.filter(word => 
        contextString.includes(word.toLowerCase())
      ).length;
      contextScore += (contextMatches / queryWords.length) * 0.3;
    }

    return contextScore;
  }

  private static findMatchedKeywords(content: string, keywords: string[]): string[] {
    const lowerContent = content.toLowerCase();
    return keywords.filter(keyword => lowerContent.includes(keyword.toLowerCase()));
  }

  private static calculateContextMatch(memory: MemoryEntry, query: string): number {
    // Simple context matching - could be enhanced with NLP
    const queryLower = query.toLowerCase();
    let matches = 0;

    // Check against tags
    memory.tags.forEach(tag => {
      if (queryLower.includes(tag.toLowerCase())) matches++;
    });

    // Check against memory type
    if (queryLower.includes(memory.type.toLowerCase())) matches++;

    return matches / (memory.tags.length + 1);
  }

  private static findRelatedMemories(memoryId: string, candidates: MemoryEntry[]): MemoryEntry[] {
    const targetMemory = candidates.find(m => m.id === memoryId);
    if (!targetMemory) return candidates;

    // Find memories that share associations
    const relatedIds = new Set(targetMemory.associations);
    
    // Find memories with same lineage
    candidates.forEach(candidate => {
      if (candidate.lineage.parentId === memoryId || 
          candidate.lineage.derivationPath.includes(memoryId) ||
          targetMemory.lineage.derivationPath.includes(candidate.id)) {
        relatedIds.add(candidate.id);
      }
    });

    return candidates.filter(memory => relatedIds.has(memory.id));
  }

  private static calculateContentSimilarity(content1: string, content2: string): number {
    const words1 = new Set(content1.toLowerCase().split(/\s+/));
    const words2 = new Set(content2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private static calculateTagSimilarity(tags1: string[], tags2: string[]): number {
    if (tags1.length === 0 && tags2.length === 0) return 1;
    if (tags1.length === 0 || tags2.length === 0) return 0;

    const set1 = new Set(tags1);
    const set2 = new Set(tags2);
    
    const intersection = new Set([...set1].filter(tag => set2.has(tag)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }
}

/**
 * Memory optimization utilities
 */
export class MemoryOptimizer {
  /**
   * Optimize memory storage and indexing
   */
  static optimizeMemoryStorage(): OptimizationResult {
    const memories = Array.from(cltmCore['memories'].values());
    const result: OptimizationResult = {
      optimizedCount: 0,
      removedDuplicates: 0,
      consolidatedMemories: 0,
      indexRebuilds: 0,
      performanceGain: 0
    };

    // Remove duplicate memories
    const duplicates = this.findDuplicateMemories(memories);
    duplicates.forEach(duplicateId => {
      cltmCore['memories'].delete(duplicateId);
      result.removedDuplicates++;
    });

    // Consolidate similar memories
    const consolidated = this.consolidateSimilarMemories(memories);
    result.consolidatedMemories = consolidated;

    // Rebuild indices
    this.rebuildIndices();
    result.indexRebuilds = 1;

    result.optimizedCount = result.removedDuplicates + result.consolidatedMemories;
    result.performanceGain = this.estimatePerformanceGain(result);

    return result;
  }

  private static findDuplicateMemories(memories: MemoryEntry[]): string[] {
    const duplicates: string[] = [];
    const contentHashes = new Map<string, string>();

    memories.forEach(memory => {
      const contentHash = this.generateContentHash(memory.content);
      
      if (contentHashes.has(contentHash)) {
        // Found duplicate, keep the one with higher score
        const existingId = contentHashes.get(contentHash)!;
        const existing = memories.find(m => m.id === existingId);
        
        if (existing && memory.score > existing.score) {
          duplicates.push(existingId);
          contentHashes.set(contentHash, memory.id);
        } else {
          duplicates.push(memory.id);
        }
      } else {
        contentHashes.set(contentHash, memory.id);
      }
    });

    return duplicates;
  }

  private static consolidateSimilarMemories(memories: MemoryEntry[]): number {
    // This would implement sophisticated memory consolidation logic
    // For now, return 0 as a placeholder
    return 0;
  }

  private static rebuildIndices(): void {
    // Rebuild tag and type indices
    cltmCore['tagIndex'].clear();
    cltmCore['typeIndex'].clear();
    
    for (const memory of cltmCore['memories'].values()) {
      cltmCore['updateIndices'](memory);
    }
  }

  private static generateContentHash(content: string): string {
    // Simple hash function - could be enhanced with proper hashing
    return content.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  private static estimatePerformanceGain(result: OptimizationResult): number {
    // Estimate percentage performance gain
    const totalOptimizations = result.optimizedCount + result.indexRebuilds;
    return Math.min(totalOptimizations * 0.1, 1); // Cap at 100%
  }
}

// Type definitions

interface MemoryCluster {
  id: string;
  centroid: string;
  memories: MemoryEntry[];
  avgScore: number;
  avgWisdom: number;
  commonTags: string[];
}

interface MemoryPatterns {
  timeDistribution: TimeDistribution;
  typePatterns: TypePatterns;
  tagFrequency: TagFrequency[];
  wisdomTrends: WisdomTrends;
  accessPatterns: AccessPatterns;
  totalAnalyzed: number;
}

interface TimeDistribution {
  last24h: number;
  lastWeek: number;
  lastMonth: number;
  lastYear: number;
  older: number;
}

interface TypePatterns {
  [key: string]: {
    count: number;
    percentage: number;
    avgScore: number;
  };
}

interface TagFrequency {
  tag: string;
  count: number;
  frequency: number;
}

interface WisdomTrends {
  trend: 'growing' | 'declining' | 'stable';
  growth: number;
  declining: number;
}

interface AccessPatterns {
  avgAccessCount: number;
  frequentlyAccessed: number;
  rarelyAccessed: number;
  accessDistribution: {
    never: number;
    low: number;
    medium: number;
    high: number;
  };
}

interface MemoryInsights {
  recommendations: Array<{
    type: string;
    priority: 'low' | 'medium' | 'high';
    description: string;
    action: string;
  }>;
  discoveries: Array<{
    type: string;
    description: string;
    data: any;
  }>;
  warnings: Array<{
    type: string;
    severity: 'info' | 'warning' | 'error';
    description: string;
    affectedCount: number;
  }>;
  optimization: OptimizationSuggestions;
}

interface OptimizationSuggestions {
  memoryConsolidation: Array<{
    type: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  indexOptimization: Array<{
    type: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  decayManagement: Array<{
    type: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  performanceImprovements: Array<{
    type: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
  }>;
}

interface SemanticSearchOptions {
  threshold?: number;
  maxResults?: number;
  boostRecentMemories?: boolean;
  boostHighWisdom?: boolean;
  contextWeight?: number;
}

export interface SemanticSearchResult {
  memory: MemoryEntry;
  relevanceScore: number;
  matchedKeywords: string[];
  contextMatch: number;
}

interface MultiFacetedSearchCriteria {
  textQuery?: string;
  memoryQuery?: MemoryQuery;
  similarTo?: MemoryEntry;
  relatedTo?: string; // Memory ID
  similarityThreshold?: number;
  maxResults?: number;
  searchOptions?: SemanticSearchOptions;
}

interface OptimizationResult {
  optimizedCount: number;
  removedDuplicates: number;
  consolidatedMemories: number;
  indexRebuilds: number;
  performanceGain: number;
}

// Export utilities (classes are already exported above)
// Exporting again to ensure accessibility from external modules