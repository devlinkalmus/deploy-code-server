/**
 * RAG (Retrieval-Augmented Generation) Core Engine
 * Provides intelligent retrieval and generation capabilities with trace logging
 */

import { cltmCore, MemoryEntry, MemoryType, MemoryQuery } from '../memory/cltm_core';
import { MemorySearchUtils, SemanticSearchResult } from '../memory/cltm_utils';

export interface RAGQuery {
  query: string;
  context?: Record<string, any>;
  maxRetrievals?: number;
  retrievalThreshold?: number;
  brandContext?: string;
  includeTrace?: boolean;
  generationOptions?: GenerationOptions;
  pluginPreferences?: string[];
}

export interface GenerationOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  style?: 'technical' | 'casual' | 'formal' | 'creative';
  format?: 'paragraph' | 'bullet' | 'code' | 'step-by-step';
}

export interface RAGResult {
  query: string;
  retrievedMemories: MemoryEntry[];
  generatedResponse: string;
  confidence: number;
  sources: RAGSource[];
  trace: RAGTrace;
  metadata: RAGMetadata;
}

export interface RAGSource {
  memoryId: string;
  relevance: number;
  contribution: number;
  excerpt: string;
}

export interface RAGTrace {
  timestamp: Date;
  steps: RAGTraceStep[];
  performance: RAGPerformance;
  pluginsUsed: string[];
}

export interface RAGTraceStep {
  step: string;
  timestamp: Date;
  duration: number;
  input: any;
  output: any;
  plugin?: string;
  success: boolean;
  error?: string;
}

export interface RAGPerformance {
  totalTime: number;
  retrievalTime: number;
  generationTime: number;
  memoryAccess: number;
  pluginOverhead: number;
}

export interface RAGMetadata {
  version: string;
  brand: string;
  plugins: RAGPluginInfo[];
  quality: RAGQuality;
}

export interface RAGPluginInfo {
  id: string;
  name: string;
  version: string;
  contribution: number;
}

export interface RAGQuality {
  coherence: number;
  relevance: number;
  completeness: number;
  accuracy: number;
  novelty: number;
}

export abstract class RAGPlugin {
  abstract id: string;
  abstract name: string;
  abstract version: string;
  abstract capabilities: string[];

  abstract initialize(): Promise<void>;
  abstract process(input: any, context: any): Promise<any>;
  abstract cleanup(): Promise<void>;

  protected trace(step: string, input: any, output: any, duration: number): RAGTraceStep {
    return {
      step,
      timestamp: new Date(),
      duration,
      input: this.sanitizeForTrace(input),
      output: this.sanitizeForTrace(output),
      plugin: this.id,
      success: true
    };
  }

  protected sanitizeForTrace(data: any): any {
    // Remove sensitive data from trace logs
    if (typeof data === 'object' && data !== null) {
      const sanitized = { ...data };
      delete sanitized.password;
      delete sanitized.apiKey;
      delete sanitized.token;
      return sanitized;
    }
    return data;
  }
}

export class RAGCore {
  private plugins: Map<string, RAGPlugin> = new Map();
  private auditTrail: RAGAuditEntry[] = [];
  private performanceMetrics: RAGPerformanceMetrics = {
    totalQueries: 0,
    successfulQueries: 0,
    averageResponseTime: 0,
    cacheHitRate: 0
  };

  constructor() {
    this.initializeCore();
  }

  /**
   * Register a RAG plugin
   */
  registerPlugin(plugin: RAGPlugin): void {
    this.plugins.set(plugin.id, plugin);
    plugin.initialize().catch(error => {
      console.error(`Failed to initialize plugin ${plugin.id}:`, error);
    });

    this.auditTrail.push({
      timestamp: new Date(),
      action: 'plugin_registered',
      plugin: plugin.id,
      details: { name: plugin.name, version: plugin.version }
    });
  }

  /**
   * Process a RAG query with full retrieval and generation
   */
  async processQuery(ragQuery: RAGQuery): Promise<RAGResult> {
    const startTime = Date.now();
    const trace: RAGTrace = {
      timestamp: new Date(),
      steps: [],
      performance: {
        totalTime: 0,
        retrievalTime: 0,
        generationTime: 0,
        memoryAccess: 0,
        pluginOverhead: 0
      },
      pluginsUsed: []
    };

    try {
      // Step 1: Query Analysis
      const analysisStart = Date.now();
      const analyzedQuery = await this.analyzeQuery(ragQuery);
      const analysisTime = Date.now() - analysisStart;
      
      trace.steps.push({
        step: 'query_analysis',
        timestamp: new Date(),
        duration: analysisTime,
        input: ragQuery.query,
        output: analyzedQuery,
        success: true
      });

      // Step 2: Memory Retrieval
      const retrievalStart = Date.now();
      const retrievedMemories = await this.retrieveRelevantMemories(analyzedQuery, ragQuery);
      const retrievalTime = Date.now() - retrievalStart;
      trace.performance.retrievalTime = retrievalTime;

      trace.steps.push({
        step: 'memory_retrieval',
        timestamp: new Date(),
        duration: retrievalTime,
        input: analyzedQuery,
        output: { count: retrievedMemories.length },
        success: true
      });

      // Step 3: Context Assembly
      const contextStart = Date.now();
      const assembledContext = await this.assembleContext(retrievedMemories, ragQuery);
      const contextTime = Date.now() - contextStart;

      trace.steps.push({
        step: 'context_assembly',
        timestamp: new Date(),
        duration: contextTime,
        input: { memories: retrievedMemories.length },
        output: { contextSize: assembledContext.length },
        success: true
      });

      // Step 4: Response Generation
      const generationStart = Date.now();
      const generatedResponse = await this.generateResponse(assembledContext, ragQuery);
      const generationTime = Date.now() - generationStart;
      trace.performance.generationTime = generationTime;

      trace.steps.push({
        step: 'response_generation',
        timestamp: new Date(),
        duration: generationTime,
        input: { contextSize: assembledContext.length },
        output: { responseLength: generatedResponse.response.length },
        success: true
      });

      // Step 5: Quality Assessment
      const qualityStart = Date.now();
      const quality = await this.assessQuality(generatedResponse.response, retrievedMemories, ragQuery);
      const qualityTime = Date.now() - qualityStart;

      trace.steps.push({
        step: 'quality_assessment',
        timestamp: new Date(),
        duration: qualityTime,
        input: { response: generatedResponse.response.length },
        output: quality,
        success: true
      });

      // Finalize trace
      const totalTime = Date.now() - startTime;
      trace.performance.totalTime = totalTime;
      trace.pluginsUsed = generatedResponse.pluginsUsed;

      // Build result
      const result: RAGResult = {
        query: ragQuery.query,
        retrievedMemories,
        generatedResponse: generatedResponse.response,
        confidence: generatedResponse.confidence,
        sources: this.buildSources(retrievedMemories),
        trace: ragQuery.includeTrace ? trace : this.sanitizeTrace(trace),
        metadata: {
          version: '1.0.0',
          brand: ragQuery.brandContext || 'JRVI',
          plugins: generatedResponse.pluginInfo,
          quality
        }
      };

      // Update metrics
      this.performanceMetrics.totalQueries++;
      this.performanceMetrics.successfulQueries++;
      this.updateAverageResponseTime(totalTime);

      // Store result for learning
      await this.storeInteraction(ragQuery, result);

      return result;

    } catch (error) {
      // Error handling and trace
      trace.steps.push({
        step: 'error_handling',
        timestamp: new Date(),
        duration: 0,
        input: ragQuery,
        output: null,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });

      throw new RAGError(`RAG processing failed: ${error}`, trace);
    }
  }

  /**
   * Retrieve memories with enhanced semantic search
   */
  async retrieveRelevantMemories(analyzedQuery: AnalyzedQuery, ragQuery: RAGQuery): Promise<MemoryEntry[]> {
    const searchOptions = {
      threshold: ragQuery.retrievalThreshold || 0.3,
      maxResults: ragQuery.maxRetrievals || 10,
      boostRecentMemories: true,
      boostHighWisdom: true,
      contextWeight: 0.4
    };

    // Use semantic search from CLTM utils
    const semanticResults = MemorySearchUtils.semanticSearch(
      analyzedQuery.expandedQuery,
      Array.from(cltmCore['memories'].values()),
      searchOptions
    );

    // Apply additional RAG-specific filtering
    const filtered = semanticResults.filter(result => {
      // Brand context filtering
      if (ragQuery.brandContext) {
        return result.memory.metadata.brandAffinity.includes(ragQuery.brandContext) ||
               result.memory.metadata.brandAffinity.length === 0;
      }
      return true;
    });

    // Update memory access tracking
    const memories = filtered.map(result => result.memory);
    memories.forEach(memory => {
      memory.accessCount++;
      memory.lastAccessed = new Date();
    });

    return memories;
  }

  /**
   * Generate response using available plugins
   */
  async generateResponse(context: string, ragQuery: RAGQuery): Promise<GenerationResult> {
    const preferredPlugins = ragQuery.pluginPreferences || ['rage_plugin', 'ragl_plugin'];
    const pluginsUsed: string[] = [];
    const pluginInfo: RAGPluginInfo[] = [];
    
    let response = '';
    let confidence = 0.5;

    // Try each preferred plugin
    for (const pluginId of preferredPlugins) {
      const plugin = this.plugins.get(pluginId);
      if (plugin) {
        try {
          const result = await plugin.process({
            context,
            query: ragQuery.query,
            options: ragQuery.generationOptions
          }, ragQuery.context);

          if (result && result.response) {
            response = result.response;
            confidence = result.confidence || 0.7;
            pluginsUsed.push(pluginId);
            pluginInfo.push({
              id: plugin.id,
              name: plugin.name,
              version: plugin.version,
              contribution: result.contribution || 1.0
            });
            break;
          }
        } catch (error) {
          console.warn(`Plugin ${pluginId} failed:`, error);
        }
      }
    }

    // Fallback to built-in generation
    if (!response) {
      response = this.generateBuiltinResponse(context, ragQuery);
      confidence = 0.6;
      pluginsUsed.push('builtin');
      pluginInfo.push({
        id: 'builtin',
        name: 'Built-in Generator',
        version: '1.0.0',
        contribution: 1.0
      });
    }

    return {
      response,
      confidence,
      pluginsUsed,
      pluginInfo
    };
  }

  /**
   * Built-in response generation (fallback)
   */
  private generateBuiltinResponse(context: string, ragQuery: RAGQuery): string {
    const style = ragQuery.generationOptions?.style || 'technical';
    const format = ragQuery.generationOptions?.format || 'paragraph';

    // Simple template-based generation
    let response = `Based on the available information:\n\n`;
    
    if (context.length > 0) {
      response += `${context}\n\n`;
    }

    response += `This information addresses your query about "${ragQuery.query}".`;

    // Apply format-specific styling
    switch (format) {
      case 'bullet':
        response = this.formatAsBullets(response);
        break;
      case 'step-by-step':
        response = this.formatAsSteps(response);
        break;
      case 'code':
        response = this.formatAsCode(response);
        break;
    }

    return response;
  }

  /**
   * Analyze and expand the query
   */
  private async analyzeQuery(ragQuery: RAGQuery): Promise<AnalyzedQuery> {
    const keywords = this.extractKeywords(ragQuery.query);
    const intent = this.classifyIntent(ragQuery.query);
    const expandedQuery = this.expandQuery(ragQuery.query, keywords);

    return {
      originalQuery: ragQuery.query,
      keywords,
      intent,
      expandedQuery,
      complexity: this.assessComplexity(ragQuery.query)
    };
  }

  /**
   * Assemble context from retrieved memories
   */
  private async assembleContext(memories: MemoryEntry[], ragQuery: RAGQuery): Promise<string> {
    if (memories.length === 0) return '';

    const contextParts: string[] = [];
    const maxContextLength = 2000; // Character limit
    let currentLength = 0;

    // Sort by relevance and wisdom
    const sortedMemories = memories.sort((a, b) => 
      (b.score * (1 - b.decay) + b.wisdom * 0.3) - (a.score * (1 - a.decay) + a.wisdom * 0.3)
    );

    for (const memory of sortedMemories) {
      const memoryText = `[${memory.type}] ${memory.content}`;
      
      if (currentLength + memoryText.length <= maxContextLength) {
        contextParts.push(memoryText);
        currentLength += memoryText.length;
      } else {
        break;
      }
    }

    return contextParts.join('\n\n');
  }

  /**
   * Assess response quality
   */
  private async assessQuality(response: string, memories: MemoryEntry[], ragQuery: RAGQuery): Promise<RAGQuality> {
    return {
      coherence: this.assessCoherence(response),
      relevance: this.assessRelevance(response, ragQuery.query),
      completeness: this.assessCompleteness(response, ragQuery.query),
      accuracy: this.assessAccuracy(response, memories),
      novelty: this.assessNovelty(response, memories)
    };
  }

  /**
   * Build source references
   */
  private buildSources(memories: MemoryEntry[]): RAGSource[] {
    return memories.map(memory => ({
      memoryId: memory.id,
      relevance: memory.score * (1 - memory.decay),
      contribution: 0.8, // Simplified contribution calculation
      excerpt: memory.content.substring(0, 150) + (memory.content.length > 150 ? '...' : '')
    }));
  }

  /**
   * Store interaction for learning
   */
  private async storeInteraction(ragQuery: RAGQuery, result: RAGResult): Promise<void> {
    const interactionMemory = {
      query: ragQuery.query,
      response: result.generatedResponse,
      confidence: result.confidence,
      sources: result.sources.length,
      timestamp: new Date()
    };

    // Store as episodic memory for future learning
    cltmCore.storeMemory(
      `RAG interaction: Q: "${ragQuery.query}" A: "${result.generatedResponse.substring(0, 200)}..."`,
      MemoryType.EPISODIC,
      {
        source: 'rag_interaction',
        confidence: result.confidence,
        relevance: 0.6,
        context: interactionMemory,
        brandAffinity: [ragQuery.brandContext || 'JRVI']
      },
      ['rag', 'interaction', 'query', 'response']
    );
  }

  // Helper methods for analysis
  private extractKeywords(query: string): string[] {
    return query.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  private classifyIntent(query: string): string {
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'who'];
    const actionWords = ['create', 'build', 'make', 'generate', 'write'];
    
    const lowerQuery = query.toLowerCase();
    
    if (questionWords.some(word => lowerQuery.includes(word))) {
      return 'question';
    }
    if (actionWords.some(word => lowerQuery.includes(word))) {
      return 'action';
    }
    return 'general';
  }

  private expandQuery(query: string, keywords: string[]): string {
    // Simple query expansion - could be enhanced with synonyms, etc.
    const synonyms: { [key: string]: string[] } = {
      'create': ['build', 'make', 'generate'],
      'fix': ['repair', 'solve', 'resolve'],
      'optimize': ['improve', 'enhance', 'speed up']
    };

    let expanded = query;
    keywords.forEach(keyword => {
      if (synonyms[keyword]) {
        expanded += ' ' + synonyms[keyword].join(' ');
      }
    });

    return expanded;
  }

  private assessComplexity(query: string): 'low' | 'medium' | 'high' {
    const length = query.length;
    const questionMarks = (query.match(/\?/g) || []).length;
    const keywords = this.extractKeywords(query).length;

    if (length > 100 || questionMarks > 1 || keywords > 8) return 'high';
    if (length > 50 || questionMarks > 0 || keywords > 4) return 'medium';
    return 'low';
  }

  private assessCoherence(response: string): number {
    // Simple coherence assessment - could be enhanced with NLP
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
    
    // Coherence based on sentence structure
    return Math.min(avgSentenceLength / 50, 1);
  }

  private assessRelevance(response: string, query: string): number {
    const queryKeywords = this.extractKeywords(query);
    const responseKeywords = this.extractKeywords(response);
    
    const matches = queryKeywords.filter(keyword => 
      responseKeywords.some(rKeyword => rKeyword.includes(keyword) || keyword.includes(rKeyword))
    );
    
    return matches.length / queryKeywords.length;
  }

  private assessCompleteness(response: string, query: string): number {
    // Simple completeness assessment
    const minLength = 50;
    const optimalLength = 200;
    
    if (response.length < minLength) return response.length / minLength;
    if (response.length > optimalLength) return 1;
    return response.length / optimalLength;
  }

  private assessAccuracy(response: string, memories: MemoryEntry[]): number {
    // Simple accuracy assessment based on memory alignment
    if (memories.length === 0) return 0.5;
    
    const avgConfidence = memories.reduce((sum, m) => sum + m.metadata.confidence, 0) / memories.length;
    return avgConfidence;
  }

  private assessNovelty(response: string, memories: MemoryEntry[]): number {
    // Assess how novel the response is compared to existing memories
    const existingContent = memories.map(m => m.content).join(' ');
    const similarity = this.calculateSimilarity(response, existingContent);
    return 1 - similarity;
  }

  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(this.extractKeywords(text1));
    const words2 = new Set(this.extractKeywords(text2));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private formatAsBullets(text: string): string {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return sentences.map(sentence => `• ${sentence.trim()}`).join('\n');
  }

  private formatAsSteps(text: string): string {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return sentences.map((sentence, index) => `${index + 1}. ${sentence.trim()}`).join('\n');
  }

  private formatAsCode(text: string): string {
    return `\`\`\`\n${text}\n\`\`\``;
  }

  private sanitizeTrace(trace: RAGTrace): RAGTrace {
    // Remove sensitive information from trace
    return {
      ...trace,
      steps: trace.steps.map(step => ({
        ...step,
        input: step.step === 'query_analysis' ? step.input : '[sanitized]',
        output: '[sanitized]'
      }))
    };
  }

  private updateAverageResponseTime(newTime: number): void {
    const totalQueries = this.performanceMetrics.totalQueries;
    const currentAvg = this.performanceMetrics.averageResponseTime;
    this.performanceMetrics.averageResponseTime = 
      (currentAvg * (totalQueries - 1) + newTime) / totalQueries;
  }

  private initializeCore(): void {
    console.log('RAG Core initialized');
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): RAGPerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Get audit trail
   */
  getAuditTrail(): RAGAuditEntry[] {
    return [...this.auditTrail];
  }

  /**
   * Clear audit trail
   */
  clearAuditTrail(): void {
    this.auditTrail = [];
  }
}

// Supporting interfaces and types

interface AnalyzedQuery {
  originalQuery: string;
  keywords: string[];
  intent: string;
  expandedQuery: string;
  complexity: 'low' | 'medium' | 'high';
}

interface GenerationResult {
  response: string;
  confidence: number;
  pluginsUsed: string[];
  pluginInfo: RAGPluginInfo[];
}

interface RAGAuditEntry {
  timestamp: Date;
  action: string;
  plugin?: string;
  details: any;
}

interface RAGPerformanceMetrics {
  totalQueries: number;
  successfulQueries: number;
  averageResponseTime: number;
  cacheHitRate: number;
}

export class RAGError extends Error {
  public trace: RAGTrace;

  constructor(message: string, trace: RAGTrace) {
    super(message);
    this.name = 'RAGError';
    this.trace = trace;
  }
}

// Export singleton instance
export const ragCore = new RAGCore();