"use strict";
/**
 * CLTM (Cognitive Long-Term Memory) Core System
 * Provides advanced memory management with scoring, decay, wisdom impact, lineage, and tag filtering
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cltmCore = exports.CLTMCore = exports.SecurityLevel = exports.MemoryType = void 0;
var MemoryType;
(function (MemoryType) {
    MemoryType["FACTUAL"] = "factual";
    MemoryType["PROCEDURAL"] = "procedural";
    MemoryType["EPISODIC"] = "episodic";
    MemoryType["SEMANTIC"] = "semantic";
    MemoryType["EMOTIONAL"] = "emotional";
    MemoryType["CONTEXTUAL"] = "contextual";
})(MemoryType || (exports.MemoryType = MemoryType = {}));
var SecurityLevel;
(function (SecurityLevel) {
    SecurityLevel["PUBLIC"] = "public";
    SecurityLevel["PRIVATE"] = "private";
    SecurityLevel["CONFIDENTIAL"] = "confidential";
    SecurityLevel["RESTRICTED"] = "restricted";
})(SecurityLevel || (exports.SecurityLevel = SecurityLevel = {}));
class CLTMCore {
    constructor(config) {
        this.memories = new Map();
        this.tagIndex = new Map();
        this.typeIndex = new Map();
        this.associationGraph = new Map();
        this.wisdomAccumulator = 0;
        this.auditTrail = [];
        this.decayConfig = {
            baseDecayRate: 0.01,
            wisdomProtection: 0.5,
            accessBonus: 0.1,
            maxDecay: 0.95,
            decayInterval: 24 * 60 * 60 * 1000, // 24 hours
            ...config
        };
        // Initialize periodic decay process
        this.startDecayProcess();
    }
    /**
     * Store a new memory entry
     */
    storeMemory(content, type, metadata = {}, tags = [], parentId) {
        const id = this.generateMemoryId();
        const now = new Date();
        const memory = {
            id,
            content,
            type,
            timestamp: now,
            score: this.calculateInitialScore(content, type, metadata),
            decay: 0,
            wisdom: this.calculateWisdomImpact(content, type, metadata).wisdomGain,
            lineage: this.createLineage(parentId),
            tags,
            metadata: {
                source: 'user_input',
                confidence: 0.8,
                relevance: 0.7,
                context: {},
                brandAffinity: [],
                securityLevel: SecurityLevel.PRIVATE,
                version: 1,
                ...metadata
            },
            associations: [],
            accessCount: 0,
            lastAccessed: now
        };
        // Store memory
        this.memories.set(id, memory);
        // Update indices
        this.updateIndices(memory);
        // Create associations
        this.createAssociations(memory);
        // Update wisdom accumulator
        this.wisdomAccumulator += memory.wisdom;
        // Audit log
        this.auditTrail.push({
            timestamp: now,
            action: 'store_memory',
            memoryId: id,
            details: { type, tags, parentId }
        });
        return id;
    }
    /**
     * Retrieve memories based on query
     */
    retrieveMemories(query) {
        let candidates = Array.from(this.memories.values());
        // Apply filters
        if (query.types) {
            candidates = candidates.filter(m => query.types.includes(m.type));
        }
        if (query.tags && query.tags.length > 0) {
            candidates = candidates.filter(m => query.tags.some(tag => m.tags.includes(tag)));
        }
        if (query.timeRange) {
            candidates = candidates.filter(m => m.timestamp >= query.timeRange.start && m.timestamp <= query.timeRange.end);
        }
        if (query.minScore !== undefined) {
            candidates = candidates.filter(m => m.score >= query.minScore);
        }
        if (query.minWisdom !== undefined) {
            candidates = candidates.filter(m => m.wisdom >= query.minWisdom);
        }
        if (query.brandAffinity && query.brandAffinity.length > 0) {
            candidates = candidates.filter(m => query.brandAffinity.some(brand => m.metadata.brandAffinity.includes(brand)));
        }
        if (query.securityLevel) {
            candidates = candidates.filter(m => this.hasSecurityAccess(m.metadata.securityLevel, query.securityLevel));
        }
        if (!query.includeDecayed) {
            candidates = candidates.filter(m => m.decay < this.decayConfig.maxDecay);
        }
        // Keyword search
        if (query.keywords && query.keywords.length > 0) {
            candidates = candidates.filter(m => this.contentMatches(m.content, query.keywords));
        }
        // Score and rank results
        const scored = candidates.map(memory => ({
            memory,
            relevanceScore: this.calculateRelevanceScore(memory, query)
        }));
        scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
        // Apply result limit
        const results = scored
            .slice(0, query.maxResults || 100)
            .map(item => item.memory);
        // Update access tracking
        results.forEach(memory => {
            memory.accessCount++;
            memory.lastAccessed = new Date();
        });
        return results;
    }
    /**
     * Update memory content and metadata
     */
    updateMemory(id, updates) {
        const memory = this.memories.get(id);
        if (!memory)
            return false;
        const oldMemory = { ...memory };
        if (updates.content) {
            memory.content = updates.content;
            memory.score = this.calculateInitialScore(updates.content, memory.type, memory.metadata);
        }
        if (updates.tags) {
            memory.tags = updates.tags;
        }
        if (updates.metadata) {
            memory.metadata = { ...memory.metadata, ...updates.metadata };
            memory.metadata.version++;
        }
        // Re-index if needed
        this.updateIndices(memory);
        // Audit log
        this.auditTrail.push({
            timestamp: new Date(),
            action: 'update_memory',
            memoryId: id,
            details: { oldMemory, updates }
        });
        return true;
    }
    /**
     * Create association between memories
     */
    createAssociation(memoryId1, memoryId2, weight = 1.0) {
        const memory1 = this.memories.get(memoryId1);
        const memory2 = this.memories.get(memoryId2);
        if (!memory1 || !memory2)
            return false;
        // Add bidirectional associations
        if (!memory1.associations.includes(memoryId2)) {
            memory1.associations.push(memoryId2);
        }
        if (!memory2.associations.includes(memoryId1)) {
            memory2.associations.push(memoryId1);
        }
        // Update association graph
        if (!this.associationGraph.has(memoryId1)) {
            this.associationGraph.set(memoryId1, new Set());
        }
        if (!this.associationGraph.has(memoryId2)) {
            this.associationGraph.set(memoryId2, new Set());
        }
        this.associationGraph.get(memoryId1).add(memoryId2);
        this.associationGraph.get(memoryId2).add(memoryId1);
        return true;
    }
    /**
     * Get memory statistics
     */
    getMemoryStats() {
        const memories = Array.from(this.memories.values());
        const typeDistribution = {};
        Object.values(MemoryType).forEach(type => {
            typeDistribution[type] = memories.filter(m => m.type === type).length;
        });
        return {
            totalMemories: memories.length,
            totalWisdom: this.wisdomAccumulator,
            averageScore: memories.reduce((sum, m) => sum + m.score, 0) / memories.length || 0,
            averageDecay: memories.reduce((sum, m) => sum + m.decay, 0) / memories.length || 0,
            typeDistribution,
            tagCount: this.tagIndex.size,
            associationCount: Array.from(this.associationGraph.values())
                .reduce((sum, set) => sum + set.size, 0) / 2, // Divide by 2 for bidirectional
            oldestMemory: memories.reduce((oldest, m) => !oldest || m.timestamp < oldest.timestamp ? m : oldest, null)?.timestamp,
            newestMemory: memories.reduce((newest, m) => !newest || m.timestamp > newest.timestamp ? m : newest, null)?.timestamp
        };
    }
    /**
     * Export memories for backup/analysis
     */
    exportMemories(filter) {
        const memories = filter ? this.retrieveMemories(filter) : Array.from(this.memories.values());
        return {
            version: '1.0.0',
            timestamp: new Date(),
            memories,
            stats: this.getMemoryStats(),
            config: this.decayConfig
        };
    }
    /**
     * Import memories from backup
     */
    importMemories(exportData) {
        let imported = 0;
        let skipped = 0;
        let errors = 0;
        for (const memory of exportData.memories) {
            try {
                if (this.memories.has(memory.id)) {
                    skipped++;
                    continue;
                }
                this.memories.set(memory.id, memory);
                this.updateIndices(memory);
                imported++;
            }
            catch (error) {
                errors++;
            }
        }
        return { imported, skipped, errors };
    }
    // Private helper methods...
    generateMemoryId() {
        return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    calculateInitialScore(content, type, metadata) {
        let score = 0.5; // Base score
        // Content length factor
        score += Math.min(content.length / 1000, 0.3);
        // Type weighting
        const typeWeights = {
            [MemoryType.FACTUAL]: 0.8,
            [MemoryType.PROCEDURAL]: 0.9,
            [MemoryType.EPISODIC]: 0.6,
            [MemoryType.SEMANTIC]: 0.7,
            [MemoryType.EMOTIONAL]: 0.5,
            [MemoryType.CONTEXTUAL]: 0.6
        };
        score *= typeWeights[type];
        // Metadata factors
        if (metadata.confidence) {
            score *= metadata.confidence;
        }
        if (metadata.relevance) {
            score *= metadata.relevance;
        }
        return Math.min(Math.max(score, 0), 1);
    }
    calculateWisdomImpact(content, type, metadata) {
        // Simplified wisdom calculation
        const novelty = this.calculateNovelty(content);
        const applicability = this.calculateApplicability(content, type);
        return {
            wisdomGain: (novelty + applicability) * 0.5,
            applicability,
            novelty,
            synthesis: 0.5,
            validation: metadata.confidence || 0.5
        };
    }
    calculateNovelty(content) {
        // Check against existing memories for uniqueness
        const existingContents = Array.from(this.memories.values()).map(m => m.content);
        const similarity = existingContents.reduce((maxSim, existing) => {
            const sim = this.calculateSimilarity(content, existing);
            return Math.max(maxSim, sim);
        }, 0);
        return 1 - similarity;
    }
    calculateApplicability(content, type) {
        // Procedural and factual memories are generally more applicable
        const typeApplicability = {
            [MemoryType.PROCEDURAL]: 0.9,
            [MemoryType.FACTUAL]: 0.8,
            [MemoryType.SEMANTIC]: 0.7,
            [MemoryType.CONTEXTUAL]: 0.6,
            [MemoryType.EPISODIC]: 0.5,
            [MemoryType.EMOTIONAL]: 0.4
        };
        return typeApplicability[type];
    }
    calculateSimilarity(content1, content2) {
        // Simple similarity calculation (could be enhanced with NLP)
        const words1 = content1.toLowerCase().split(/\s+/);
        const words2 = content2.toLowerCase().split(/\s+/);
        const intersection = words1.filter(word => words2.includes(word));
        const union = [...new Set([...words1, ...words2])];
        return intersection.length / union.length;
    }
    createLineage(parentId) {
        if (!parentId) {
            return {
                children: [],
                generation: 0,
                origin: 'root',
                derivationPath: []
            };
        }
        const parent = this.memories.get(parentId);
        if (!parent) {
            return {
                children: [],
                generation: 0,
                origin: 'orphaned',
                derivationPath: []
            };
        }
        return {
            parentId,
            children: [],
            generation: parent.lineage.generation + 1,
            origin: parent.lineage.origin,
            derivationPath: [...parent.lineage.derivationPath, parentId]
        };
    }
    updateIndices(memory) {
        // Update tag index
        memory.tags.forEach(tag => {
            if (!this.tagIndex.has(tag)) {
                this.tagIndex.set(tag, new Set());
            }
            this.tagIndex.get(tag).add(memory.id);
        });
        // Update type index
        if (!this.typeIndex.has(memory.type)) {
            this.typeIndex.set(memory.type, new Set());
        }
        this.typeIndex.get(memory.type).add(memory.id);
    }
    createAssociations(memory) {
        // Create associations based on content similarity and tags
        const similarMemories = this.findSimilarMemories(memory, 0.3);
        similarMemories.forEach(similarId => {
            if (similarId !== memory.id) {
                this.createAssociation(memory.id, similarId);
            }
        });
    }
    findSimilarMemories(memory, threshold) {
        const similar = [];
        for (const [id, existingMemory] of this.memories) {
            if (id === memory.id)
                continue;
            const similarity = this.calculateSimilarity(memory.content, existingMemory.content);
            const tagOverlap = memory.tags.filter(tag => existingMemory.tags.includes(tag)).length;
            if (similarity >= threshold || tagOverlap > 0) {
                similar.push(id);
            }
        }
        return similar;
    }
    contentMatches(content, keywords) {
        const lowerContent = content.toLowerCase();
        return keywords.some(keyword => lowerContent.includes(keyword.toLowerCase()));
    }
    calculateRelevanceScore(memory, query) {
        let score = memory.score * (1 - memory.decay);
        // Boost score based on wisdom
        score += memory.wisdom * 0.2;
        // Boost based on access frequency
        score += Math.log(memory.accessCount + 1) * 0.1;
        // Keyword relevance
        if (query.keywords) {
            const keywordMatches = query.keywords.filter(keyword => memory.content.toLowerCase().includes(keyword.toLowerCase())).length;
            score += (keywordMatches / query.keywords.length) * 0.3;
        }
        // Tag relevance
        if (query.tags) {
            const tagMatches = query.tags.filter(tag => memory.tags.includes(tag)).length;
            score += (tagMatches / query.tags.length) * 0.2;
        }
        return score;
    }
    hasSecurityAccess(memoryLevel, queryLevel) {
        const levels = [SecurityLevel.PUBLIC, SecurityLevel.PRIVATE, SecurityLevel.CONFIDENTIAL, SecurityLevel.RESTRICTED];
        const memoryLevelIndex = levels.indexOf(memoryLevel);
        const queryLevelIndex = levels.indexOf(queryLevel);
        return queryLevelIndex >= memoryLevelIndex;
    }
    startDecayProcess() {
        setInterval(() => {
            this.applyDecay();
        }, this.decayConfig.decayInterval);
    }
    applyDecay() {
        const now = new Date();
        for (const memory of this.memories.values()) {
            const ageHours = (now.getTime() - memory.lastAccessed.getTime()) / (1000 * 60 * 60);
            const decayRate = this.decayConfig.baseDecayRate * (1 - memory.wisdom * this.decayConfig.wisdomProtection);
            const accessBoost = Math.min(memory.accessCount * this.decayConfig.accessBonus, 0.5);
            const newDecay = Math.min(memory.decay + (decayRate * ageHours) - accessBoost, this.decayConfig.maxDecay);
            memory.decay = Math.max(newDecay, 0);
        }
    }
}
exports.CLTMCore = CLTMCore;
// Export singleton instance
exports.cltmCore = new CLTMCore();
