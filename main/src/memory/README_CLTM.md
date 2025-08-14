# CLTM (Cognitive Long-Term Memory) System Documentation

## Overview

The CLTM system provides advanced memory management capabilities with sophisticated features including memory scoring, decay algorithms, wisdom impact assessment, lineage tracking, and intelligent tag filtering. This system enables the JRVI platform to maintain and utilize long-term cognitive memory effectively.

## Core Features

### 1. Memory Management
- **Memory Storage**: Persistent storage with metadata and scoring
- **Memory Retrieval**: Advanced querying with multiple filter criteria
- **Memory Updates**: Version-controlled memory modifications
- **Memory Associations**: Bidirectional relationship management

### 2. Scoring & Wisdom
- **Dynamic Scoring**: Content-based scoring with metadata factors
- **Wisdom Impact**: Assessment of knowledge value and applicability
- **Decay Management**: Time-based memory degradation with wisdom protection
- **Access Tracking**: Frequency-based relevance boosting

### 3. Advanced Analytics
- **Memory Clustering**: Semantic grouping of related memories
- **Pattern Analysis**: Trend identification and behavioral insights
- **Optimization**: Performance and storage optimization suggestions
- **Semantic Search**: Intelligent content-based search capabilities

## Architecture

### Core Components

#### CLTMCore (`src/memory/cltm_core.ts`)
The main memory management engine providing:
- Memory storage and retrieval
- Scoring and wisdom calculations
- Decay processing
- Association management
- Audit trail maintenance

#### CLTM Utilities (`src/memory/cltm_utils.ts`)
Advanced analysis and optimization tools:
- `MemoryAnalyzer`: Clustering and pattern analysis
- `MemorySearchUtils`: Semantic search and similarity matching
- `MemoryOptimizer`: Performance optimization and maintenance

### Memory Data Structure

```typescript
interface MemoryEntry {
  id: string;              // Unique identifier
  content: string;         // Memory content
  type: MemoryType;        // Classification type
  timestamp: Date;         // Creation time
  score: number;           // Relevance score (0-1)
  decay: number;           // Decay level (0-1)
  wisdom: number;          // Wisdom value (0-1)
  lineage: MemoryLineage;  // Relationship tracking
  tags: string[];          // Categorical tags
  metadata: MemoryMetadata; // Additional metadata
  associations: string[];  // Related memory IDs
  accessCount: number;     // Access frequency
  lastAccessed: Date;      // Last access time
}
```

### Memory Types

| Type | Description | Use Case |
|------|-------------|----------|
| `FACTUAL` | Objective facts and data | Knowledge base, references |
| `PROCEDURAL` | Step-by-step processes | Workflows, instructions |
| `EPISODIC` | Event-based memories | Experiences, logs |
| `SEMANTIC` | Conceptual knowledge | Definitions, relationships |
| `EMOTIONAL` | Sentiment and feelings | User preferences, reactions |
| `CONTEXTUAL` | Situational information | Environment, conditions |

## Key Algorithms

### 1. Memory Scoring

Initial score calculation based on:
- **Content length**: Longer content receives higher base score
- **Type weighting**: Different memory types have different importance
- **Metadata factors**: Confidence and relevance multipliers

```typescript
score = baseScore * typeWeight * confidence * relevance
```

### 2. Wisdom Impact Assessment

Wisdom calculation considers:
- **Novelty**: Uniqueness compared to existing memories
- **Applicability**: Practical value based on memory type
- **Synthesis**: Ability to combine with other knowledge
- **Validation**: Confidence and verification level

### 3. Decay Algorithm

Memory decay with protective mechanisms:
- **Base decay rate**: Configurable time-based degradation
- **Wisdom protection**: High-wisdom memories decay slower
- **Access bonus**: Frequently accessed memories resist decay
- **Maximum decay limit**: Prevents complete memory loss

```typescript
newDecay = min(
  currentDecay + (baseRate * age * (1 - wisdomProtection)) - accessBonus,
  maxDecay
)
```

### 4. Association Creation

Automatic association discovery:
- **Content similarity**: Semantic analysis of memory content
- **Tag overlap**: Shared categorical tags
- **Lineage relationships**: Parent-child memory connections
- **Temporal clustering**: Memories created in similar timeframes

## Usage Examples

### Basic Memory Operations

```typescript
import { cltmCore, MemoryType } from './src/memory/cltm_core';

// Store a new memory
const memoryId = cltmCore.storeMemory(
  "React components should be pure functions",
  MemoryType.FACTUAL,
  {
    source: 'documentation',
    confidence: 0.9,
    brandAffinity: ['JRVI']
  },
  ['react', 'programming', 'best-practices']
);

// Retrieve memories
const memories = cltmCore.retrieveMemories({
  keywords: ['react', 'components'],
  types: [MemoryType.FACTUAL, MemoryType.PROCEDURAL],
  minScore: 0.5,
  maxResults: 10
});

// Update memory
cltmCore.updateMemory(memoryId, {
  tags: ['react', 'programming', 'best-practices', 'functional']
});
```

### Advanced Analytics

```typescript
import { MemoryAnalyzer, MemorySearchUtils } from './src/memory/cltm_utils';

// Analyze memory patterns
const memories = cltmCore.retrieveMemories({});
const patterns = MemoryAnalyzer.analyzeMemoryPatterns(memories);
const insights = MemoryAnalyzer.generateInsights(memories);

// Semantic search
const results = MemorySearchUtils.semanticSearch(
  "how to optimize React performance",
  memories,
  {
    threshold: 0.4,
    maxResults: 5,
    boostRecentMemories: true
  }
);

// Find similar memories
const similarMemories = MemorySearchUtils.findSimilarMemories(
  targetMemory,
  memories,
  0.6
);
```

### Memory Clustering

```typescript
// Cluster memories by similarity
const clusters = MemoryAnalyzer.clusterMemories(memories, 5);

clusters.forEach(cluster => {
  console.log(`Cluster ${cluster.id}:`);
  console.log(`- ${cluster.memories.length} memories`);
  console.log(`- Average score: ${cluster.avgScore.toFixed(2)}`);
  console.log(`- Common tags: ${cluster.commonTags.join(', ')}`);
});
```

## Configuration

### Decay Configuration

```typescript
const cltm = new CLTMCore({
  baseDecayRate: 0.01,      // Daily decay rate
  wisdomProtection: 0.5,    // Wisdom protection factor
  accessBonus: 0.1,         // Access frequency bonus
  maxDecay: 0.95,           // Maximum decay level
  decayInterval: 86400000   // Decay check interval (24h)
});
```

### Security Levels

| Level | Description | Access Control |
|-------|-------------|----------------|
| `PUBLIC` | Open access | No restrictions |
| `PRIVATE` | User-specific | User authentication required |
| `CONFIDENTIAL` | Sensitive data | Enhanced security checks |
| `RESTRICTED` | Critical information | Administrative access only |

## Integration with Brand System

### Brand Affinity

Memories can be associated with specific brands:

```typescript
// Store brand-specific memory
cltmCore.storeMemory(
  "NKTA dashboard requires analytics widgets",
  MemoryType.PROCEDURAL,
  {
    brandAffinity: ['NKTA', 'JRVI'],
    relevance: 0.9
  },
  ['nkta', 'dashboard', 'analytics']
);

// Retrieve brand-specific memories
const nktaMemories = cltmCore.retrieveMemories({
  brandAffinity: ['NKTA'],
  types: [MemoryType.PROCEDURAL, MemoryType.FACTUAL]
});
```

### Cross-Brand Learning

The CLTM system enables knowledge sharing across brands while maintaining security boundaries:

- **Shared Knowledge**: Common technical knowledge available to all brands
- **Brand-Specific**: Specialized knowledge restricted to specific brands
- **Security Filtering**: Automatic access control based on brand context

## Performance Optimization

### Memory Optimization

```typescript
import { MemoryOptimizer } from './src/memory/cltm_utils';

// Optimize memory storage
const result = MemoryOptimizer.optimizeMemoryStorage();
console.log(`Optimized ${result.optimizedCount} memories`);
console.log(`Removed ${result.removedDuplicates} duplicates`);
console.log(`Performance gain: ${(result.performanceGain * 100).toFixed(1)}%`);
```

### Search Performance

- **Indexed searching**: Tag and type indices for fast filtering
- **Lazy loading**: Memory content loaded on demand
- **Caching**: Frequently accessed memories cached in memory
- **Batch operations**: Bulk operations for efficiency

## Monitoring and Analytics

### Memory Statistics

```typescript
const stats = cltmCore.getMemoryStats();
console.log(`Total memories: ${stats.totalMemories}`);
console.log(`Total wisdom: ${stats.totalWisdom.toFixed(2)}`);
console.log(`Average score: ${stats.averageScore.toFixed(2)}`);
console.log(`Average decay: ${stats.averageDecay.toFixed(2)}`);
```

### Audit Trail

Complete audit logging for compliance:
- Memory creation and modification events
- Access patterns and frequency
- Search queries and results
- Optimization operations

```typescript
const auditTrail = cltmCore.getAuditTrail();
auditTrail.forEach(entry => {
  console.log(`${entry.timestamp}: ${entry.action} on ${entry.memoryId}`);
});
```

## Best Practices

### Memory Creation

1. **Use appropriate types**: Choose the most specific memory type
2. **Provide rich metadata**: Include confidence, relevance, and source
3. **Tag consistently**: Use standardized tag vocabularies
4. **Associate related memories**: Create explicit relationships

### Memory Maintenance

1. **Regular optimization**: Run optimization routines periodically
2. **Monitor decay**: Review high-decay memories for refresh opportunities
3. **Update metadata**: Keep confidence and relevance scores current
4. **Prune duplicates**: Remove or consolidate duplicate memories

### Search Strategy

1. **Use semantic search**: Leverage content-based search for better results
2. **Combine filters**: Use multiple query criteria for precision
3. **Boost recent memories**: Consider temporal relevance in search
4. **Analyze patterns**: Use analytics to understand memory usage

## API Reference

### Core Methods

- `storeMemory(content, type, metadata, tags, parentId)`: Store new memory
- `retrieveMemories(query)`: Search and retrieve memories
- `updateMemory(id, updates)`: Modify existing memory
- `createAssociation(id1, id2, weight)`: Link related memories
- `getMemoryStats()`: Get system statistics
- `exportMemories(filter)`: Export memory data
- `importMemories(data)`: Import memory data

### Utility Classes

- `MemoryAnalyzer`: Pattern analysis and clustering
- `MemorySearchUtils`: Advanced search capabilities
- `MemoryOptimizer`: Performance optimization tools

## Troubleshooting

### Common Issues

1. **High memory decay**: Increase access frequency or adjust decay settings
2. **Poor search results**: Improve tagging and metadata quality
3. **Performance issues**: Run optimization and consider indexing
4. **Association overload**: Limit automatic association creation

### Debugging

Use audit trail and statistics to diagnose issues:
- Check memory access patterns
- Analyze wisdom distribution
- Review decay rates
- Monitor search performance

---

## Support and Documentation

For additional information:
- API Reference: See TypeScript interfaces and documentation
- Performance Tuning: Monitor statistics and run optimizations
- Integration Guide: Brand system integration examples
- Migration: Export/import utilities for data management

**Last Updated**: July 31, 2025  
**Version**: 1.0.0  
**Maintainer**: JRVI Development Team