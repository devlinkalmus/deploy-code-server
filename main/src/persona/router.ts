/**
 * JRVI Persona Router
 * Routes requests to appropriate brand personas and handles brand-specific logic
 * Excludes AlphaOmega per requirements
 * Phase 11: Added device routing capabilities
 */

import { DeviceConfig, DeviceActionRequest } from '../devices/types';

export interface BrandConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  persona: PersonaConfig;
  plugins: string[];
  routing: RoutingConfig;
}

export interface PersonaConfig {
  personality: string;
  expertise: string[];
  responseStyle: string;
  contextAwareness: boolean;
}

export interface RoutingConfig {
  priority: number;
  pathMatchers: string[];
  contextKeywords: string[];
  fallbackBrand?: string;
}

// Core brand configurations (AlphaOmega explicitly excluded)
const BRAND_CONFIGS: Record<string, BrandConfig> = {
  JRVI: {
    id: 'JRVI',
    name: 'JRVI Copilot',
    description: 'Core development and AI assistance platform',
    enabled: true,
    persona: {
      personality: 'Professional, analytical, solution-focused',
      expertise: ['development', 'ai', 'automation', 'architecture'],
      responseStyle: 'detailed-technical',
      contextAwareness: true
    },
    plugins: ['jrvi_core', 'dev_tools', 'ai_assistant'],
    routing: {
      priority: 1,
      pathMatchers: ['/dashboard', '/ide', '/chat'],
      contextKeywords: ['development', 'code', 'ai', 'copilot'],
      fallbackBrand: 'JRVI'
    }
  },
  NKTA: {
    id: 'NKTA',
    name: 'NKTA Analytics',
    description: 'Data analytics and business intelligence platform',
    enabled: true,
    persona: {
      personality: 'Data-driven, insightful, metrics-focused',
      expertise: ['analytics', 'data-science', 'business-intelligence', 'reporting'],
      responseStyle: 'analytical-detailed',
      contextAwareness: true
    },
    plugins: ['nkta_analytics', 'data_processing', 'visualization'],
    routing: {
      priority: 2,
      pathMatchers: ['/analytics', '/reports', '/metrics'],
      contextKeywords: ['analytics', 'data', 'metrics', 'reports'],
      fallbackBrand: 'JRVI'
    }
  },
  ENTRG: {
    id: 'ENTRG',
    name: 'ENTRG Energy',
    description: 'Energy management and optimization platform',
    enabled: true,
    persona: {
      personality: 'Efficiency-focused, sustainable, optimization-oriented',
      expertise: ['energy', 'sustainability', 'optimization', 'monitoring'],
      responseStyle: 'efficiency-focused',
      contextAwareness: true
    },
    plugins: ['entrg_energy', 'monitoring', 'optimization'],
    routing: {
      priority: 3,
      pathMatchers: ['/energy', '/monitoring', '/optimization'],
      contextKeywords: ['energy', 'power', 'efficiency', 'sustainability'],
      fallbackBrand: 'JRVI'
    }
  },
  RMDLR: {
    id: 'RMDLR',
    name: 'RMDLR Remodeler',
    description: 'Home renovation and design platform',
    enabled: true,
    persona: {
      personality: 'Creative, practical, design-oriented',
      expertise: ['renovation', 'design', 'construction', 'planning'],
      responseStyle: 'creative-practical',
      contextAwareness: true
    },
    plugins: ['rmdlr_design', 'planning', 'visualization'],
    routing: {
      priority: 4,
      pathMatchers: ['/design', '/renovation', '/planning'],
      contextKeywords: ['design', 'renovation', 'remodel', 'construction'],
      fallbackBrand: 'JRVI'
    }
  },
  SPRKLS: {
    id: 'SPRKLS',
    name: 'SPRKLS Sparkles',
    description: 'Creative content and social engagement platform',
    enabled: true,
    persona: {
      personality: 'Creative, engaging, trend-aware',
      expertise: ['content', 'social-media', 'creativity', 'engagement'],
      responseStyle: 'creative-engaging',
      contextAwareness: true
    },
    plugins: ['sprkls_content', 'social', 'creativity'],
    routing: {
      priority: 5,
      pathMatchers: ['/content', '/social', '/creative'],
      contextKeywords: ['content', 'social', 'creative', 'engagement'],
      fallbackBrand: 'JRVI'
    }
  },
  RESSRV: {
    id: 'RESSRV',
    name: 'ResSrv Reservations',
    description: 'Reservation and booking management platform',
    enabled: true,
    persona: {
      personality: 'Service-oriented, organized, customer-focused',
      expertise: ['reservations', 'booking', 'scheduling', 'customer-service'],
      responseStyle: 'service-oriented',
      contextAwareness: true
    },
    plugins: ['ressrv_booking', 'scheduling', 'customer_mgmt'],
    routing: {
      priority: 6,
      pathMatchers: ['/reservations', '/booking', '/schedule'],
      contextKeywords: ['booking', 'reservation', 'schedule', 'appointments'],
      fallbackBrand: 'JRVI'
    }
  },
  CAMPAIGN_SLANGER: {
    id: 'CAMPAIGN_SLANGER',
    name: 'Campaign Slanger',
    description: 'Marketing campaign and communication platform',
    enabled: true,
    persona: {
      personality: 'Persuasive, strategic, communication-focused',
      expertise: ['marketing', 'campaigns', 'communication', 'strategy'],
      responseStyle: 'strategic-persuasive',
      contextAwareness: true
    },
    plugins: ['campaign_mgmt', 'communication', 'strategy'],
    routing: {
      priority: 7,
      pathMatchers: ['/campaigns', '/marketing', '/communications'],
      contextKeywords: ['campaign', 'marketing', 'communication', 'strategy'],
      fallbackBrand: 'JRVI'
    }
  }
};

export class PersonaRouter {
  private brandConfigs: Record<string, BrandConfig>;
  private currentBrand: string = 'JRVI';
  private auditTrail: Array<{ timestamp: Date; action: string; brand: string; context: any }> = [];
  private deviceRoutes: Map<string, string> = new Map(); // deviceId -> brandId mapping

  constructor() {
    // Deep copy to prevent test interference
    this.brandConfigs = JSON.parse(JSON.stringify(BRAND_CONFIGS));
  }

  /**
   * Route request to appropriate brand based on context
   */
  routeRequest(context: {
    path?: string;
    keywords?: string[];
    userPreference?: string;
    previousBrand?: string;
  }): BrandConfig {
    const { path, keywords, userPreference, previousBrand } = context;

    // Log routing attempt
    this.auditTrail.push({
      timestamp: new Date(),
      action: 'route_request',
      brand: this.currentBrand,
      context
    });

    // Priority 1: User explicit preference
    if (userPreference && this.brandConfigs[userPreference]?.enabled) {
      this.currentBrand = userPreference;
      return this.brandConfigs[userPreference];
    }

    // Priority 2: Path-based routing
    if (path) {
      const matchedBrand = this.findBrandByPath(path);
      if (matchedBrand) {
        this.currentBrand = matchedBrand.id;
        return matchedBrand;
      }
    }

    // Priority 3: Keyword-based routing
    if (keywords && keywords.length > 0) {
      const matchedBrand = this.findBrandByKeywords(keywords);
      if (matchedBrand) {
        this.currentBrand = matchedBrand.id;
        return matchedBrand;
      }
    }

    // Priority 4: Previous brand context
    if (previousBrand && this.brandConfigs[previousBrand]?.enabled) {
      this.currentBrand = previousBrand;
      return this.brandConfigs[previousBrand];
    }

    // Fallback: Default to JRVI
    this.currentBrand = 'JRVI';
    return this.brandConfigs.JRVI;
  }

  /**
   * Find brand by path matching
   */
  private findBrandByPath(path: string): BrandConfig | null {
    const brands = Object.values(this.brandConfigs)
      .filter(brand => brand.enabled)
      .sort((a, b) => a.routing.priority - b.routing.priority);

    for (const brand of brands) {
      for (const pathMatcher of brand.routing.pathMatchers) {
        if (path.startsWith(pathMatcher)) {
          return brand;
        }
      }
    }

    return null;
  }

  /**
   * Find brand by keyword matching
   */
  private findBrandByKeywords(keywords: string[]): BrandConfig | null {
    const brands = Object.values(this.brandConfigs)
      .filter(brand => brand.enabled)
      .sort((a, b) => a.routing.priority - b.routing.priority);

    for (const brand of brands) {
      const keywordMatches = keywords.filter(keyword =>
        brand.routing.contextKeywords.some(brandKeyword =>
          keyword.toLowerCase().includes(brandKeyword.toLowerCase())
        )
      ).length;

      if (keywordMatches > 0) {
        return brand;
      }
    }

    return null;
  }

  /**
   * Get current active brand
   */
  getCurrentBrand(): BrandConfig {
    return this.brandConfigs[this.currentBrand];
  }

  /**
   * Get all available brands (excluding disabled ones)
   */
  getAvailableBrands(): BrandConfig[] {
    return Object.values(this.brandConfigs).filter(brand => brand.enabled);
  }

  /**
   * Enable/disable a brand
   */
  setBrandEnabled(brandId: string, enabled: boolean): void {
    if (this.brandConfigs[brandId]) {
      this.brandConfigs[brandId].enabled = enabled;
      this.auditTrail.push({
        timestamp: new Date(),
        action: enabled ? 'enable_brand' : 'disable_brand',
        brand: brandId,
        context: { enabled }
      });
    }
  }

  /**
   * Get audit trail for compliance
   */
  getAuditTrail(): Array<{ timestamp: Date; action: string; brand: string; context: any }> {
    return [...this.auditTrail];
  }

  /**
   * Clear audit trail (for maintenance)
   */
  clearAuditTrail(): void {
    this.auditTrail = [];
  }

  /**
   * Switch to specific brand
   */
  switchBrand(brandId: string): boolean {
    if (this.brandConfigs[brandId]?.enabled) {
      this.currentBrand = brandId;
      this.auditTrail.push({
        timestamp: new Date(),
        action: 'switch_brand',
        brand: brandId,
        context: { previousBrand: this.currentBrand }
      });
      return true;
    }
    return false;
  }

  /**
   * Route device action to appropriate brand persona
   */
  routeDeviceAction(deviceAction: DeviceActionRequest): BrandConfig {
    // First check if device has a specific brand mapping
    const deviceBrand = this.deviceRoutes.get(deviceAction.deviceId);
    if (deviceBrand && this.brandConfigs[deviceBrand]?.enabled) {
      this.auditTrail.push({
        timestamp: new Date(),
        action: 'device_action_routed',
        brand: deviceBrand,
        context: { 
          deviceId: deviceAction.deviceId, 
          action: deviceAction.action,
          traceId: deviceAction.traceId 
        }
      });
      return this.brandConfigs[deviceBrand];
    }

    // Fall back to regular routing based on action context
    const routingContext = {
      keywords: [deviceAction.action],
      userPreference: deviceAction.persona,
      previousBrand: this.currentBrand
    };

    return this.routeRequest(routingContext);
  }

  /**
   * Map device to specific brand for routing
   */
  mapDeviceToBrand(deviceId: string, brandId: string): void {
    if (this.brandConfigs[brandId]) {
      this.deviceRoutes.set(deviceId, brandId);
      this.auditTrail.push({
        timestamp: new Date(),
        action: 'device_mapped_to_brand',
        brand: brandId,
        context: { deviceId, brandId }
      });
    }
  }

  /**
   * Remove device to brand mapping
   */
  unmapDeviceFromBrand(deviceId: string): void {
    const previousBrand = this.deviceRoutes.get(deviceId);
    this.deviceRoutes.delete(deviceId);
    
    if (previousBrand) {
      this.auditTrail.push({
        timestamp: new Date(),
        action: 'device_unmapped_from_brand',
        brand: previousBrand,
        context: { deviceId, previousBrand }
      });
    }
  }

  /**
   * Get device to brand mappings
   */
  getDeviceMappings(): Map<string, string> {
    return new Map(this.deviceRoutes);
  }

  /**
   * Route device-originated request with full context
   */
  routeDeviceRequest(context: {
    deviceId: string;
    action?: string;
    keywords?: string[];
    toneContext?: any;
    emotionContext?: any;
    userPreference?: string;
  }): BrandConfig {
    const { deviceId, action, keywords, toneContext, emotionContext, userPreference } = context;

    // Enhanced context for device routing
    const enhancedKeywords = [
      ...(keywords || []),
      ...(action ? [action] : []),
      ...(toneContext?.emotions || []),
      ...(emotionContext?.currentEmotion ? [emotionContext.currentEmotion] : [])
    ];

    // Check device-specific routing first
    const deviceBrand = this.deviceRoutes.get(deviceId);
    if (deviceBrand && this.brandConfigs[deviceBrand]?.enabled) {
      this.auditTrail.push({
        timestamp: new Date(),
        action: 'device_request_routed',
        brand: deviceBrand,
        context: { 
          deviceId, 
          action, 
          keywords: enhancedKeywords,
          routingMethod: 'device_mapping'
        }
      });
      return this.brandConfigs[deviceBrand];
    }

    // Fall back to context-based routing
    const routingResult = this.routeRequest({
      keywords: enhancedKeywords,
      userPreference,
      previousBrand: this.currentBrand
    });

    this.auditTrail.push({
      timestamp: new Date(),
      action: 'device_request_routed',
      brand: routingResult.id,
      context: { 
        deviceId, 
        action, 
        keywords: enhancedKeywords,
        routingMethod: 'context_based',
        resultBrand: routingResult.id
      }
    });

    return routingResult;
  }

  /**
   * Handle device compliance routing
   */
  routeForCompliance(deviceId: string, complianceIssue: string): BrandConfig {
    // Always route compliance issues to JRVI for review
    this.auditTrail.push({
      timestamp: new Date(),
      action: 'compliance_routing',
      brand: 'JRVI',
      context: { 
        deviceId, 
        complianceIssue,
        requiresReview: true
      }
    });

    return this.brandConfigs.JRVI;
  }
}

// Export singleton instance
export const personaRouter = new PersonaRouter();