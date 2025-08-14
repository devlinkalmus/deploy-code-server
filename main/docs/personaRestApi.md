# JRVI Persona-Aware REST API Documentation

## Overview

The JRVI Persona-Aware REST API provides comprehensive endpoints for persona management, brand switching, and context-aware interactions. All endpoints enforce persona headers and maintain full audit trails for compliance with JRVI Constitution and Core Principles.

## Base URL

```
https://api.jrvi.dev/v1
```

## Authentication

All requests require proper authentication and persona context headers:

```http
X-JRVI-Persona: {persona_id}
X-JRVI-Brand-Affinity: {brand1,brand2,...}
Authorization: Bearer {token}
```

## Standard Response Format

All endpoints return responses in the following format:

```json
{
  "success": boolean,
  "data": any,
  "error": string | null,
  "metadata": {
    "persona": string,
    "brandAffinity": string[],
    "processingTime": number,
    "auditLogId": string,
    "complianceChecked": boolean
  },
  "auditTrail": {
    "requestId": string,
    "operations": string[],
    "complianceStatus": "COMPLIANT" | "NON_COMPLIANT" | "PENDING"
  }
}
```

## Endpoints

### Persona Management

#### GET /personas

Get available personas and their configurations.

**Headers:**
- `X-JRVI-Persona`: Current persona (optional)
- `X-JRVI-Brand-Affinity`: Preferred brands (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "personas": [
      {
        "id": "JRVI",
        "name": "JRVI Copilot",
        "description": "Core development and AI assistance platform",
        "personality": "Professional, analytical, solution-focused",
        "expertise": ["development", "ai", "automation", "architecture"],
        "responseStyle": "detailed-technical",
        "contextAwareness": true,
        "enabled": true,
        "plugins": ["jrvi_core", "dev_tools", "ai_assistant"],
        "routing": {
          "priority": 1,
          "pathMatchers": ["/dashboard", "/ide", "/chat"],
          "contextKeywords": ["development", "code", "ai", "copilot"]
        }
      }
    ],
    "totalCount": 7,
    "currentPersona": {
      "id": "JRVI",
      "name": "JRVI Copilot"
    },
    "recentActivity": []
  }
}
```

#### POST /personas/route

Route a request to the appropriate persona based on context.

**Headers:**
- `X-JRVI-Persona`: Current persona
- `X-JRVI-Brand-Affinity`: Brand preferences

**Request Body:**
```json
{
  "persona": "NKTA",
  "brandPreference": "NKTA",
  "context": {
    "path": "/analytics/dashboard",
    "keywords": ["analytics", "data", "metrics"],
    "previousBrand": "JRVI"
  },
  "payload": {
    "query": "Show me the latest analytics data",
    "filters": {
      "timeRange": "7d",
      "metrics": ["views", "engagement"]
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "brand": "NKTA",
    "brandName": "NKTA Analytics",
    "persona": {
      "personality": "Data-driven, insightful, metrics-focused",
      "expertise": ["analytics", "data-science", "business-intelligence", "reporting"],
      "responseStyle": "analytical-detailed",
      "contextAwareness": true
    },
    "processedData": {
      "query": "Show me the latest analytics data",
      "filters": {
        "timeRange": "7d",
        "metrics": ["views", "engagement"]
      }
    },
    "recommendations": [
      "Focus on data-driven insights",
      "Utilize advanced analytics features"
    ],
    "timestamp": "2024-12-03T10:30:00Z",
    "auditLogId": "audit_1701594600_abc123"
  }
}
```

#### PUT /personas/{brandId}/switch

Switch to a specific persona/brand.

**Headers:**
- `X-JRVI-Persona`: Current persona
- `X-JRVI-Brand-Affinity`: Current brand affinity

**Path Parameters:**
- `brandId`: Target brand ID (JRVI, NKTA, ENTRG, RMDLR, SPRKLS, RESSRV, CAMPAIGN_SLANGER)

**Response:**
```json
{
  "success": true,
  "data": {
    "switchedTo": {
      "id": "NKTA",
      "name": "NKTA Analytics",
      "description": "Data analytics and business intelligence platform",
      "persona": {
        "personality": "Data-driven, insightful, metrics-focused",
        "expertise": ["analytics", "data-science", "business-intelligence", "reporting"],
        "responseStyle": "analytical-detailed",
        "contextAwareness": true
      }
    },
    "success": true,
    "timestamp": "2024-12-03T10:35:00Z"
  }
}
```

### Memory Management

#### POST /personas/{persona}/memory

Query persona-specific memory with brand affinity filtering.

**Headers:**
- `X-JRVI-Persona`: Target persona
- `X-JRVI-Brand-Affinity`: Brand filters

**Request Body:**
```json
{
  "keywords": ["analytics", "dashboard"],
  "tags": ["visualization", "metrics"],
  "types": ["factual", "procedural"],
  "timeRange": {
    "start": "2024-11-01T00:00:00Z",
    "end": "2024-12-01T23:59:59Z"
  },
  "minScore": 0.6,
  "minWisdom": 0.4,
  "maxResults": 20,
  "brandAffinity": ["NKTA", "JRVI"],
  "securityLevel": "private",
  "includeDecayed": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "memories": [
      {
        "id": "mem_1701594600_xyz789",
        "content": "Analytics dashboard configuration for NKTA metrics",
        "type": "procedural",
        "score": 0.85,
        "wisdom": 0.72,
        "decay": 0.05,
        "timestamp": "2024-11-15T14:20:00Z",
        "tags": ["analytics", "dashboard", "configuration"],
        "associations": ["mem_abc123", "mem_def456"],
        "metadata": {
          "source": "user_input",
          "confidence": 0.9,
          "relevance": 0.8,
          "brandAffinity": ["NKTA"],
          "securityLevel": "private"
        }
      }
    ],
    "totalCount": 15,
    "query": {
      "keywords": ["analytics", "dashboard"],
      "brandAffinity": ["NKTA", "JRVI"],
      "maxResults": 20
    },
    "stats": {
      "totalMemories": 15,
      "averageScore": 0.76,
      "averageDecay": 0.08,
      "totalWisdom": 9.8
    }
  }
}
```

### Plugin Management

#### GET /personas/{persona}/plugins

Get plugins available for a specific persona.

**Headers:**
- `X-JRVI-Persona`: Target persona
- `X-JRVI-Brand-Affinity`: Brand context

**Response:**
```json
{
  "success": true,
  "data": {
    "personaPlugins": [
      {
        "id": "nkta_analytics",
        "name": "NKTA Analytics Engine",
        "version": "2.1.0",
        "type": "analytics",
        "enabled": true,
        "capabilities": ["data_analysis", "visualization", "reporting"],
        "brandAffinity": ["NKTA"],
        "healthStatus": "healthy"
      }
    ],
    "brandPlugins": [
      {
        "id": "jrvi_core",
        "name": "JRVI Core Services",
        "version": "3.0.0",
        "type": "core",
        "enabled": true,
        "capabilities": ["ai_assistance", "development_tools", "code_analysis"],
        "brandAffinity": ["JRVI", "NKTA"],
        "healthStatus": "healthy"
      }
    ],
    "stats": {
      "totalPlugins": 12,
      "enabledPlugins": 10,
      "disabledPlugins": 1,
      "failedPlugins": 1,
      "healthChecksActive": 8
    },
    "availableCount": 10,
    "enabledCount": 9
  }
}
```

#### POST /plugins/{pluginId}/call

Execute a plugin method with persona context.

**Headers:**
- `X-JRVI-Persona`: Current persona
- `X-JRVI-Brand-Affinity`: Brand context

**Request Body:**
```json
{
  "method": "generateAnalytics",
  "args": [
    {
      "dataSource": "user_engagement",
      "timeRange": "7d",
      "metrics": ["views", "clicks", "conversions"]
    }
  ],
  "options": {
    "timeout": 30000,
    "retries": 2
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "result": {
      "analytics": {
        "views": 15420,
        "clicks": 892,
        "conversions": 67,
        "conversionRate": 0.075
      },
      "trends": {
        "viewsChange": "+12%",
        "clicksChange": "+8%",
        "conversionsChange": "+15%"
      },
      "recommendations": [
        "Focus on high-converting content",
        "Optimize click-through rates"
      ]
    },
    "executionTime": 1250,
    "pluginVersion": "2.1.0"
  }
}
```

### Wisdom Forge Integration

#### POST /wisdom/reinforce

Trigger wisdom reinforcement process.

**Headers:**
- `X-JRVI-Persona`: Current persona
- `Authorization`: Bearer token (privileged access required)

**Request Body:**
```json
{
  "targetMemoryIds": ["mem_123", "mem_456"],
  "options": {
    "forcedReinforcement": false,
    "maxWisdomGain": 0.3
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "memoryId": "mem_123",
        "oldWisdom": 0.45,
        "newWisdom": 0.62,
        "reinforcementFactor": 0.17,
        "timeWeight": 0.8,
        "associationBonus": 0.12,
        "success": true,
        "auditLogId": "audit_wisdom_abc123"
      }
    ],
    "summary": {
      "totalCandidates": 50,
      "successfulReinforcements": 32,
      "totalWisdomGained": 5.4,
      "processingTime": 2340
    }
  }
}
```

#### POST /wisdom/awaken

Trigger dormant memory awakening process.

**Headers:**
- `X-JRVI-Persona`: Current persona
- `Authorization`: Bearer token (privileged access required)

**Request Body:**
```json
{
  "maxMemoriesToAwaken": 10,
  "dormancyThreshold": 168,
  "options": {
    "createConnections": true,
    "boostRelevance": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "memoryId": "mem_dormant_789",
        "dormancyDuration": 240,
        "awakenStrength": 0.75,
        "reactivationBonus": 0.22,
        "newConnections": ["mem_active_123", "mem_active_456"],
        "success": true,
        "auditLogId": "audit_awaken_def456"
      }
    ],
    "summary": {
      "totalDormant": 25,
      "successfulAwakenings": 8,
      "newConnections": 18,
      "processingTime": 1850
    }
  }
}
```

#### GET /wisdom/metrics

Get current wisdom forge metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalWisdomAccumulated": 245.8,
    "reinforcedMemories": 1520,
    "awakenedMemories": 340,
    "wisdomEfficiency": 0.68,
    "memoryUtilization": 0.82,
    "knowledgeConnectivity": 0.15,
    "temporalDistribution": {
      "00:00": 12,
      "01:00": 8,
      "02:00": 5,
      "...": "..."
    },
    "topWisdomSources": [
      {
        "source": "analytics_engine",
        "wisdom": 45.2,
        "memoryCount": 180
      },
      {
        "source": "development_tools",
        "wisdom": 38.7,
        "memoryCount": 220
      }
    ]
  }
}
```

#### GET /wisdom/insights

Get wisdom insights and patterns.

**Query Parameters:**
- `limit`: Maximum number of insights to return (default: 20)
- `type`: Filter by insight type (PATTERN, SYNTHESIS, EMERGENCE, CORRELATION)

**Response:**
```json
{
  "success": true,
  "data": {
    "insights": [
      {
        "id": "insight_1701594600_abc123",
        "type": "PATTERN",
        "description": "High wisdom reinforcement pattern detected. Average gain: 0.156",
        "confidence": 0.8,
        "relatedMemories": ["mem_123", "mem_456", "mem_789"],
        "wisdomValue": 2.4,
        "timestamp": "2024-12-03T10:30:00Z",
        "actionRecommendations": [
          "Continue current reinforcement strategies",
          "Consider increasing reinforcement frequency"
        ]
      }
    ],
    "totalInsights": 45,
    "patterns": {
      "reinforcementTrends": "increasing",
      "awakeningSucess": "stable",
      "wisdomAccumulation": "optimal"
    }
  }
}
```

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": "Error description",
  "errorCode": "ERROR_CODE",
  "metadata": {
    "persona": "UNKNOWN",
    "brandAffinity": ["JRVI"],
    "processingTime": 0,
    "complianceChecked": false
  },
  "details": {
    "timestamp": "2024-12-03T10:30:00Z",
    "requestId": "req_1701594600_xyz789",
    "supportReference": "SUP-2024-001234"
  }
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `INVALID_PERSONA` | Invalid or unsupported persona | 400 |
| `MISSING_HEADERS` | Required persona headers missing | 400 |
| `ACCESS_DENIED` | Security check failed | 403 |
| `PERSONA_DISABLED` | Target persona is disabled | 403 |
| `INVALID_BRAND` | Invalid brand ID in switch request | 400 |
| `KERNEL_FAILURE` | Strategy kernel routing failed | 500 |
| `MEMORY_ERROR` | Memory system error | 500 |
| `PLUGIN_ERROR` | Plugin execution error | 500 |
| `WISDOM_ERROR` | Wisdom forge operation failed | 500 |
| `RATE_LIMITED` | Too many requests | 429 |
| `MAINTENANCE` | System in maintenance mode | 503 |

## Security Considerations

### Authentication & Authorization
- All endpoints require valid authentication tokens
- Persona switching requires elevated permissions
- Wisdom forge operations require privileged access
- Memory access filtered by security level

### Data Privacy
- Personal data filtered based on permissions
- Brand affinity restricts cross-brand data access
- Audit trails maintain data access logs
- GDPR compliance for European users

### Rate Limiting
- 1000 requests/hour for standard operations
- 100 requests/hour for persona switching
- 10 requests/hour for wisdom forge operations
- Burst allowance of 50 requests/minute

### Compliance Features
- Full audit trail for all operations
- Constitutional compliance checking
- JRVI Core Principles enforcement
- Automated security scanning

## SDK Examples

### JavaScript/TypeScript

```typescript
import { JRVIPersonaAPI } from '@jrvi/persona-api';

const api = new JRVIPersonaAPI({
  baseURL: 'https://api.jrvi.dev/v1',
  apiKey: 'your-api-key',
  defaultPersona: 'JRVI'
});

// Get available personas
const personas = await api.personas.list();

// Switch persona
await api.personas.switch('NKTA');

// Route request with context
const result = await api.personas.route({
  payload: { query: 'analytics data' },
  context: { keywords: ['analytics', 'metrics'] }
});

// Query memory
const memories = await api.memory.query('NKTA', {
  keywords: ['dashboard'],
  maxResults: 10
});
```

### Python

```python
from jrvi_persona_api import PersonaAPI

api = PersonaAPI(
    base_url='https://api.jrvi.dev/v1',
    api_key='your-api-key',
    default_persona='JRVI'
)

# Get available personas
personas = api.personas.list()

# Switch persona
api.personas.switch('NKTA')

# Route request
result = api.personas.route(
    payload={'query': 'analytics data'},
    context={'keywords': ['analytics', 'metrics']}
)

# Query memory
memories = api.memory.query('NKTA', {
    'keywords': ['dashboard'],
    'max_results': 10
})
```

## Changelog

### Version 2.0.0 (Current)
- Added persona-aware routing
- Implemented wisdom forge integration
- Enhanced security and compliance features
- Added comprehensive audit trails

### Version 1.5.0
- Basic persona switching
- Memory query endpoints
- Plugin management API

### Version 1.0.0
- Initial persona API implementation
- Basic authentication and routing

## Support

For API support and documentation issues:
- Email: api-support@jrvi.dev
- Documentation: https://docs.jrvi.dev/persona-api
- Status Page: https://status.jrvi.dev
- GitHub Issues: https://github.com/devlinkalmus/jrvi/issues

---

**Last Updated**: December 3, 2024  
**API Version**: 2.0.0  
**Documentation Version**: 1.0.0