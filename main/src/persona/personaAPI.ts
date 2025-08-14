/**
 * JRVI Persona-Aware REST API Endpoints
 * Provides comprehensive API endpoints with persona header enforcement
 * and brand-specific routing capabilities
 */

import { Request, Response, NextFunction } from 'express';
import { personaRouter, BrandConfig, PersonaConfig } from './router';
import { logger } from '../utils/logging';
import { securityMiddleware, UserSession } from '../security/middleware';
import { strategyKernel, createOperationRequest, OperationType, Priority } from '../kernel/strategy';
import { cltmCore, MemoryQuery, MemoryType } from '../memory/cltm_core';
import { pluginRegistry } from '../plugins/registry';

export interface PersonaAPIRequest extends Request {
  persona?: string;
  brandAffinity?: string[];
  session?: UserSession;
  auditContext?: {
    requestId: string;
    timestamp: Date;
    origin: string;
  };
}

export interface PersonaAPIResponse extends Response {
  sendPersonaResponse: (data: any, metadata?: Partial<PersonaResponseMetadata>) => void;
}

export interface PersonaResponseMetadata {
  persona: string;
  brandAffinity: string[];
  processingTime: number;
  auditLogId?: string;
  complianceChecked: boolean;
}

export interface PersonaRequest {
  persona?: string;
  brandPreference?: string;
  context?: {
    path?: string;
    keywords?: string[];
    previousBrand?: string;
  };
  payload: any;
}

export interface PersonaResponse {
  success: boolean;
  data?: any;
  error?: string;
  metadata: PersonaResponseMetadata;
  auditTrail?: {
    requestId: string;
    operations: string[];
    complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING';
  };
}

/**
 * Persona header enforcement middleware
 */
export function enforcePersonaHeaders(
  req: PersonaAPIRequest,
  res: PersonaAPIResponse,
  next: NextFunction
): void {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  try {
    // Extract persona from headers (X-JRVI-Persona) or query params
    const headerPersona = req.headers['x-jrvi-persona'] as string;
    const queryPersona = req.query.persona as string;
    const bodyPersona = req.body?.persona as string;
    
    const persona = headerPersona || queryPersona || bodyPersona || 'JRVI';
    
    // Extract brand affinity
    const brandAffinityHeader = req.headers['x-jrvi-brand-affinity'] as string;
    const brandAffinity = brandAffinityHeader 
      ? brandAffinityHeader.split(',').map(b => b.trim())
      : ['JRVI'];
    
    // Create audit context
    const auditContext = {
      requestId,
      timestamp: new Date(),
      origin: 'persona-api'
    };
    
    // Attach to request
    req.persona = persona;
    req.brandAffinity = brandAffinity;
    req.auditContext = auditContext;
    
    // Enhanced response method
    res.sendPersonaResponse = function(data: any, metadata?: Partial<PersonaResponseMetadata>) {
      const processingTime = Date.now() - startTime;
      
      const responseMetadata: PersonaResponseMetadata = {
        persona,
        brandAffinity,
        processingTime,
        complianceChecked: true,
        ...metadata
      };
      
      // Log the API call
      logger.audit(
        `Persona API call: ${req.method} ${req.path}`,
        'persona-api',
        {
          persona,
          brandAffinity,
          method: req.method,
          path: req.path,
          processingTime,
          requestId
        },
        {
          tags: ['persona-api', 'audit-trail'],
          brandAffinity
        }
      );
      
      res.json({
        success: true,
        data,
        metadata: responseMetadata,
        auditTrail: {
          requestId,
          operations: ['persona-routing', 'data-processing'],
          complianceStatus: 'COMPLIANT' as const
        }
      });
    };
    
    logger.debug(
      `Persona headers enforced: ${persona}`,
      'persona-api',
      { persona, brandAffinity, requestId }
    );
    
    next();
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error(
      `Persona header enforcement failed: ${errorMessage}`,
      'persona-api',
      { requestId, error: errorMessage }
    );
    
    res.status(400).json({
      success: false,
      error: 'Invalid persona headers',
      metadata: {
        persona: 'UNKNOWN',
        brandAffinity: ['JRVI'],
        processingTime: Date.now() - startTime,
        complianceChecked: false
      }
    });
  }
}

/**
 * Persona routing endpoint
 */
export async function routePersonaRequest(
  req: PersonaAPIRequest,
  res: PersonaAPIResponse
): Promise<void> {
  try {
    const { persona, brandAffinity, auditContext } = req;
    const requestData: PersonaRequest = req.body;
    
    if (!persona || !brandAffinity || !auditContext) {
      res.status(400).json({
        success: false,
        error: 'Missing persona context',
        metadata: {
          persona: 'UNKNOWN',
          brandAffinity: ['JRVI'],
          processingTime: 0,
          complianceChecked: false
        }
      });
      return;
    }
    
    // Route request through persona router
    const routingContext = {
      path: req.path,
      keywords: requestData.context?.keywords,
      userPreference: requestData.brandPreference,
      previousBrand: requestData.context?.previousBrand
    };
    
    const brandConfig = personaRouter.routeRequest(routingContext);
    
    // Security check
    const session = req.session || securityMiddleware.createSession('guest', brandAffinity, []);
    const securityResult = await securityMiddleware.checkSecurity({
      session,
      requestId: auditContext.requestId,
      origin: 'persona-api',
      operation: 'persona_route',
      target: brandConfig.id,
      brandAffinity
    });
    
    if (!securityResult.allowed) {
      res.status(403).json({
        success: false,
        error: `Access denied: ${securityResult.reason}`,
        metadata: {
          persona,
          brandAffinity,
          processingTime: 0,
          complianceChecked: true
        }
      });
      return;
    }
    
    // Process the request with the selected brand
    const result = await processPersonaRequest(requestData, brandConfig, {
      persona,
      brandAffinity,
      session,
      auditContext
    });
    
    res.sendPersonaResponse(result, {
      auditLogId: securityResult.auditLogId
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error(
      `Persona routing failed: ${errorMessage}`,
      'persona-api',
      { 
        persona: req.persona,
        brandAffinity: req.brandAffinity,
        requestId: req.auditContext?.requestId,
        error: errorMessage
      }
    );
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      metadata: {
        persona: req.persona || 'UNKNOWN',
        brandAffinity: req.brandAffinity || ['JRVI'],
        processingTime: 0,
        complianceChecked: false
      }
    });
  }
}

/**
 * Get available personas endpoint
 */
export async function getAvailablePersonas(
  req: PersonaAPIRequest,
  res: PersonaAPIResponse
): Promise<void> {
  try {
    const { session, auditContext } = req;
    
    // Security check
    if (session) {
      const securityResult = await securityMiddleware.checkSecurity({
        session,
        requestId: auditContext!.requestId,
        origin: 'persona-api',
        operation: 'get_personas',
        target: 'persona-list',
        brandAffinity: req.brandAffinity || ['JRVI']
      });
      
      if (!securityResult.allowed) {
        res.status(403).json({
          success: false,
          error: `Access denied: ${securityResult.reason}`,
          metadata: {
            persona: req.persona || 'UNKNOWN',
            brandAffinity: req.brandAffinity || ['JRVI'],
            processingTime: 0,
            complianceChecked: true
          }
        });
        return;
      }
    }
    
    const availableBrands = personaRouter.getAvailableBrands();
    const auditTrail = personaRouter.getAuditTrail();
    
    const personas = availableBrands.map(brand => ({
      id: brand.id,
      name: brand.name,
      description: brand.description,
      personality: brand.persona.personality,
      expertise: brand.persona.expertise,
      responseStyle: brand.persona.responseStyle,
      contextAwareness: brand.persona.contextAwareness,
      enabled: brand.enabled,
      plugins: brand.plugins,
      routing: {
        priority: brand.routing.priority,
        pathMatchers: brand.routing.pathMatchers,
        contextKeywords: brand.routing.contextKeywords
      }
    }));
    
    res.sendPersonaResponse({
      personas,
      totalCount: personas.length,
      currentPersona: personaRouter.getCurrentBrand(),
      recentActivity: auditTrail.slice(-10)
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error(
      `Get personas failed: ${errorMessage}`,
      'persona-api',
      { 
        requestId: req.auditContext?.requestId,
        error: errorMessage
      }
    );
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve personas',
      metadata: {
        persona: req.persona || 'UNKNOWN',
        brandAffinity: req.brandAffinity || ['JRVI'],
        processingTime: 0,
        complianceChecked: false
      }
    });
  }
}

/**
 * Switch persona endpoint
 */
export async function switchPersona(
  req: PersonaAPIRequest,
  res: PersonaAPIResponse
): Promise<void> {
  try {
    const { brandId } = req.params;
    const { session, auditContext } = req;
    
    if (!brandId) {
      res.status(400).json({
        success: false,
        error: 'Brand ID is required',
        metadata: {
          persona: req.persona || 'UNKNOWN',
          brandAffinity: req.brandAffinity || ['JRVI'],
          processingTime: 0,
          complianceChecked: false
        }
      });
      return;
    }
    
    // Security check
    if (session) {
      const securityResult = await securityMiddleware.checkSecurity({
        session,
        requestId: auditContext!.requestId,
        origin: 'persona-api',
        operation: 'switch_persona',
        target: brandId,
        brandAffinity: req.brandAffinity || ['JRVI']
      });
      
      if (!securityResult.allowed) {
        res.status(403).json({
          success: false,
          error: `Access denied: ${securityResult.reason}`,
          metadata: {
            persona: req.persona || 'UNKNOWN',
            brandAffinity: req.brandAffinity || ['JRVI'],
            processingTime: 0,
            complianceChecked: true
          }
        });
        return;
      }
    }
    
    // Route through strategy kernel
    const switchRequest = createOperationRequest(
      OperationType.BRAND_SWITCH,
      'persona-api',
      brandId,
      { 
        fromBrand: req.persona,
        toBrand: brandId,
        userId: session?.userId || 'anonymous'
      },
      {
        brandAffinity: req.brandAffinity || ['JRVI'],
        priority: Priority.HIGH,
        requiresApproval: false
      }
    );
    
    const kernelResult = await strategyKernel.route(switchRequest);
    
    if (!kernelResult.success) {
      res.status(500).json({
        success: false,
        error: `Persona switch failed: ${kernelResult.error}`,
        metadata: {
          persona: req.persona || 'UNKNOWN',
          brandAffinity: req.brandAffinity || ['JRVI'],
          processingTime: 0,
          complianceChecked: true
        }
      });
      return;
    }
    
    const success = personaRouter.switchBrand(brandId);
    
    if (!success) {
      res.status(400).json({
        success: false,
        error: 'Invalid or disabled brand',
        metadata: {
          persona: req.persona || 'UNKNOWN',
          brandAffinity: req.brandAffinity || ['JRVI'],
          processingTime: 0,
          complianceChecked: true
        }
      });
      return;
    }
    
    const newBrand = personaRouter.getCurrentBrand();
    
    res.sendPersonaResponse({
      switchedTo: newBrand,
      success: true,
      timestamp: new Date().toISOString()
    }, {
      auditLogId: kernelResult.auditLogId
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error(
      `Persona switch failed: ${errorMessage}`,
      'persona-api',
      { 
        brandId: req.params.brandId,
        requestId: req.auditContext?.requestId,
        error: errorMessage
      }
    );
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      metadata: {
        persona: req.persona || 'UNKNOWN',
        brandAffinity: req.brandAffinity || ['JRVI'],
        processingTime: 0,
        complianceChecked: false
      }
    });
  }
}

/**
 * Get persona-specific memory endpoint
 */
export async function getPersonaMemory(
  req: PersonaAPIRequest,
  res: PersonaAPIResponse
): Promise<void> {
  try {
    const { session, auditContext, persona, brandAffinity } = req;
    const query: MemoryQuery = req.body;
    
    // Security check
    if (session) {
      const securityResult = await securityMiddleware.checkSecurity({
        session,
        requestId: auditContext!.requestId,
        origin: 'persona-api',
        operation: 'memory_query',
        target: 'memory-engine',
        brandAffinity: brandAffinity || ['JRVI']
      });
      
      if (!securityResult.allowed) {
        res.status(403).json({
          success: false,
          error: `Access denied: ${securityResult.reason}`,
          metadata: {
            persona: persona || 'UNKNOWN',
            brandAffinity: brandAffinity || ['JRVI'],
            processingTime: 0,
            complianceChecked: true
          }
        });
        return;
      }
    }
    
    // Add brand affinity filter to query
    const enhancedQuery: MemoryQuery = {
      ...query,
      brandAffinity: brandAffinity || ['JRVI'],
      maxResults: query.maxResults || 50
    };
    
    const memories = cltmCore.retrieveMemories(enhancedQuery);
    const stats = cltmCore.getMemoryStats();
    
    res.sendPersonaResponse({
      memories,
      totalCount: memories.length,
      query: enhancedQuery,
      stats: {
        totalMemories: stats.totalMemories,
        averageScore: stats.averageScore,
        averageDecay: stats.averageDecay,
        totalWisdom: stats.totalWisdom
      }
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error(
      `Persona memory query failed: ${errorMessage}`,
      'persona-api',
      { 
        requestId: req.auditContext?.requestId,
        error: errorMessage
      }
    );
    
    res.status(500).json({
      success: false,
      error: 'Memory query failed',
      metadata: {
        persona: req.persona || 'UNKNOWN',
        brandAffinity: req.brandAffinity || ['JRVI'],
        processingTime: 0,
        complianceChecked: false
      }
    });
  }
}

/**
 * Get persona-specific plugins endpoint
 */
export async function getPersonaPlugins(
  req: PersonaAPIRequest,
  res: PersonaAPIResponse
): Promise<void> {
  try {
    const { persona, brandAffinity, session, auditContext } = req;
    
    // Security check
    if (session) {
      const securityResult = await securityMiddleware.checkSecurity({
        session,
        requestId: auditContext!.requestId,
        origin: 'persona-api',
        operation: 'plugin_query',
        target: 'plugin-registry',
        brandAffinity: brandAffinity || ['JRVI']
      });
      
      if (!securityResult.allowed) {
        res.status(403).json({
          success: false,
          error: `Access denied: ${securityResult.reason}`,
          metadata: {
            persona: persona || 'UNKNOWN',
            brandAffinity: brandAffinity || ['JRVI'],
            processingTime: 0,
            complianceChecked: true
          }
        });
        return;
      }
    }
    
    const personaPlugins = pluginRegistry.getPluginsByPersona(persona || 'JRVI');
    const brandPlugins = brandAffinity 
      ? brandAffinity.flatMap(brand => pluginRegistry.getPluginsByBrand(brand))
      : [];
    
    const stats = pluginRegistry.getRegistryStats();
    
    res.sendPersonaResponse({
      personaPlugins,
      brandPlugins,
      stats,
      availableCount: personaPlugins.length,
      enabledCount: personaPlugins.filter(p => p.enabled).length
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error(
      `Persona plugins query failed: ${errorMessage}`,
      'persona-api',
      { 
        requestId: req.auditContext?.requestId,
        error: errorMessage
      }
    );
    
    res.status(500).json({
      success: false,
      error: 'Plugin query failed',
      metadata: {
        persona: req.persona || 'UNKNOWN',
        brandAffinity: req.brandAffinity || ['JRVI'],
        processingTime: 0,
        complianceChecked: false
      }
    });
  }
}

/**
 * Process persona request with brand-specific logic
 */
async function processPersonaRequest(
  request: PersonaRequest,
  brandConfig: BrandConfig,
  context: {
    persona: string;
    brandAffinity: string[];
    session: UserSession;
    auditContext: { requestId: string; timestamp: Date; origin: string };
  }
): Promise<any> {
  logger.debug(
    `Processing persona request for brand: ${brandConfig.id}`,
    'persona-api',
    {
      brandId: brandConfig.id,
      persona: context.persona,
      requestId: context.auditContext.requestId
    }
  );
  
  // Route through strategy kernel for auditing
  const processRequest = createOperationRequest(
    OperationType.LOGIC_UPDATE,
    'persona-api',
    `process-${brandConfig.id}`,
    { 
      request,
      brandConfig,
      context
    },
    {
      brandAffinity: context.brandAffinity,
      priority: Priority.MEDIUM,
      requiresApproval: false
    }
  );
  
  const kernelResult = await strategyKernel.route(processRequest);
  
  if (!kernelResult.success) {
    throw new Error(`Kernel processing failed: ${kernelResult.error}`);
  }
  
  // Simulate brand-specific processing
  const result = {
    brand: brandConfig.id,
    brandName: brandConfig.name,
    persona: brandConfig.persona,
    processedData: request.payload,
    recommendations: generateBrandRecommendations(brandConfig, request.payload),
    timestamp: new Date().toISOString(),
    auditLogId: kernelResult.auditLogId
  };
  
  return result;
}

/**
 * Generate brand-specific recommendations
 */
function generateBrandRecommendations(brandConfig: BrandConfig, payload: any): string[] {
  const recommendations: string[] = [];
  
  switch (brandConfig.id) {
    case 'JRVI':
      recommendations.push('Consider using AI-assisted development tools');
      recommendations.push('Implement comprehensive testing strategies');
      break;
    case 'NKTA':
      recommendations.push('Focus on data-driven insights');
      recommendations.push('Utilize advanced analytics features');
      break;
    case 'ENTRG':
      recommendations.push('Optimize for energy efficiency');
      recommendations.push('Consider sustainable alternatives');
      break;
    case 'RMDLR':
      recommendations.push('Explore creative design options');
      recommendations.push('Plan for practical implementation');
      break;
    case 'SPRKLS':
      recommendations.push('Enhance creative content strategy');
      recommendations.push('Engage with social media trends');
      break;
    case 'RESSRV':
      recommendations.push('Optimize booking and scheduling');
      recommendations.push('Focus on customer service excellence');
      break;
    case 'CAMPAIGN_SLANGER':
      recommendations.push('Develop strategic messaging');
      recommendations.push('Target appropriate audiences');
      break;
    default:
      recommendations.push('Apply best practices for your domain');
  }
  
  return recommendations;
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `persona_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Export all endpoints for Express router
export const personaAPIEndpoints = {
  enforcePersonaHeaders,
  routePersonaRequest,
  getAvailablePersonas,
  switchPersona,
  getPersonaMemory,
  getPersonaPlugins
};

export default personaAPIEndpoints;