# JRVI Brand System Documentation

## Overview

The JRVI Brand System provides a comprehensive multi-brand platform that integrates various specialized brands under a unified architecture. Each brand maintains its own persona, capabilities, and specialized functionality while sharing core infrastructure.

## Supported Brands

### ✅ Active Brands

#### 1. **JRVI** (Core Platform)
- **Description**: Core development and AI assistance platform
- **Persona**: Professional, analytical, solution-focused
- **Expertise**: Development, AI, automation, architecture
- **Routing**: `/dashboard`, `/ide`, `/chat`
- **Plugins**: `jrvi_core`, `dev_tools`, `ai_assistant`

#### 2. **NKTA** (Analytics)
- **Description**: Data analytics and business intelligence platform
- **Persona**: Data-driven, insightful, metrics-focused
- **Expertise**: Analytics, data science, business intelligence, reporting
- **Routing**: `/analytics`, `/reports`, `/metrics`
- **Plugins**: `nkta_analytics`, `data_processing`, `visualization`

#### 3. **ENTRG** (Energy)
- **Description**: Energy management and optimization platform
- **Persona**: Efficiency-focused, sustainable, optimization-oriented
- **Expertise**: Energy, sustainability, optimization, monitoring
- **Routing**: `/energy`, `/monitoring`, `/optimization`
- **Plugins**: `entrg_energy`, `monitoring`, `optimization`

#### 4. **RMDLR** (Remodeler)
- **Description**: Home renovation and design platform
- **Persona**: Creative, practical, design-oriented
- **Expertise**: Renovation, design, construction, planning
- **Routing**: `/design`, `/renovation`, `/planning`
- **Plugins**: `rmdlr_design`, `planning`, `visualization`

#### 5. **SPRKLS** (Sparkles)
- **Description**: Creative content and social engagement platform
- **Persona**: Creative, engaging, trend-aware
- **Expertise**: Content, social media, creativity, engagement
- **Routing**: `/content`, `/social`, `/creative`
- **Plugins**: `sprkls_content`, `social`, `creativity`

#### 6. **ResSrv** (Reservations)
- **Description**: Reservation and booking management platform
- **Persona**: Service-oriented, organized, customer-focused
- **Expertise**: Reservations, booking, scheduling, customer service
- **Routing**: `/reservations`, `/booking`, `/schedule`
- **Plugins**: `ressrv_booking`, `scheduling`, `customer_mgmt`

#### 7. **Campaign Slanger**
- **Description**: Marketing campaign and communication platform
- **Persona**: Persuasive, strategic, communication-focused
- **Expertise**: Marketing, campaigns, communication, strategy
- **Routing**: `/campaigns`, `/marketing`, `/communications`
- **Plugins**: `campaign_mgmt`, `communication`, `strategy`

### ❌ Excluded Brands

#### AlphaOmega (Installer Seed)
- **Status**: Explicitly excluded per requirements
- **Reason**: Not included in current implementation scope
- **Impact**: No routing, registry entries, or UI components for AlphaOmega

## Architecture

### Persona Router (`src/persona/router.ts`)

The PersonaRouter class manages brand selection and routing based on:

1. **User Preference**: Explicit brand selection by user
2. **Path-based Routing**: URL path matching to brand-specific routes
3. **Keyword-based Routing**: Context keyword analysis for intelligent routing
4. **Previous Brand Context**: Continuation of previous session brand
5. **Fallback**: Default to JRVI core brand

#### Routing Priority
```typescript
1. User explicit preference (highest)
2. Path-based routing
3. Keyword-based routing
4. Previous brand context
5. Fallback to JRVI (lowest)
```

### Plugin System

Each brand includes specialized plugins that provide:
- **Core functionality** specific to the brand
- **Utility plugins** for specialized tools
- **Integration plugins** for external services
- **AI plugins** for intelligent assistance

### Brand Configuration

Each brand maintains:
```typescript
interface BrandConfig {
  id: string;              // Unique brand identifier
  name: string;            // Display name
  description: string;     // Brand description
  enabled: boolean;        // Enable/disable toggle
  persona: PersonaConfig;  // Personality and behavior
  plugins: string[];       // Associated plugins
  routing: RoutingConfig;  // Routing configuration
}
```

## Integration Features

### 1. Brand Switching
- Runtime brand switching without page reload
- Maintains context during brand transitions
- Audit trail for all brand changes

### 2. Plugin Scaffolding
- Modular plugin architecture
- Dependency management
- Hot-swappable plugin system

### 3. HUD/UI Toggles
- Brand-specific UI components
- Real-time brand status indicators
- Interactive brand switching interface

### 4. Audit & Compliance
- Complete audit trail for all brand interactions
- Compliance monitoring and enforcement
- Brand isolation and security

## Usage Examples

### Basic Brand Routing
```typescript
import { personaRouter } from './src/persona/router';

// Route based on URL path
const brand = personaRouter.routeRequest({
  path: '/analytics/dashboard'
}); // Returns NKTA brand

// Route based on keywords
const brand2 = personaRouter.routeRequest({
  keywords: ['energy', 'optimization']
}); // Returns ENTRG brand
```

### Brand Management
```typescript
// Get current active brand
const currentBrand = personaRouter.getCurrentBrand();

// Switch to specific brand
personaRouter.switchBrand('SPRKLS');

// Enable/disable brands
personaRouter.setBrandEnabled('NKTA', false);

// Get available brands
const availableBrands = personaRouter.getAvailableBrands();
```

### Audit Trail Access
```typescript
// Get full audit trail
const auditTrail = personaRouter.getAuditTrail();

// Clear audit trail (maintenance)
personaRouter.clearAuditTrail();
```

## Configuration

### Environment Variables
```env
# Brand system configuration
BRAND_SYSTEM_ENABLED=true
DEFAULT_BRAND=JRVI
AUDIT_TRAIL_ENABLED=true
BRAND_SWITCHING_ENABLED=true

# Brand-specific settings
NKTA_ANALYTICS_ENABLED=true
ENTRG_MONITORING_ENABLED=true
RMDLR_DESIGN_ENABLED=true
SPRKLS_SOCIAL_ENABLED=true
RESSRV_BOOKING_ENABLED=true
CAMPAIGN_SLANGER_ENABLED=true
```

### Plugin Directory
The `plugin_directory.json` file maintains the complete registry of:
- Brand configurations
- Plugin definitions
- Dependency mappings
- Capability matrices
- Version information

## Security & Compliance

### Brand Isolation
- Each brand operates in isolated context
- No cross-brand data leakage
- Secure plugin sandboxing

### Enforcement Policies
- `no_alpha_omega_routing`: Explicitly blocks AlphaOmega routing
- `brand_isolation`: Maintains strict brand separation
- `audit_trail_compliance`: Ensures complete audit logging
- `plugin_sandboxing`: Secures plugin execution

### Monitoring
- Real-time brand usage monitoring
- Performance metrics per brand
- Security event logging
- Compliance validation

## Development Guidelines

### Adding New Brands
1. Update `BRAND_CONFIGS` in `router.ts`
2. Add brand entry to `plugin_directory.json`
3. Create brand-specific plugins
4. Update HUD/UI components
5. Add documentation

### Plugin Development
1. Follow plugin interface standards
2. Declare dependencies explicitly
3. Implement capability contracts
4. Include proper error handling
5. Add comprehensive tests

### Testing
- Unit tests for persona routing
- Integration tests for brand switching
- Performance tests for plugin loading
- Security tests for brand isolation

## Migration & Maintenance

### Version Management
- Semantic versioning for all components
- Backward compatibility guarantees
- Migration scripts for updates

### Performance Optimization
- Lazy loading of brand-specific code
- Plugin caching and optimization
- Efficient routing algorithms

### Monitoring & Analytics
- Brand usage analytics
- Performance monitoring
- Error tracking and reporting
- User behavior analysis

---

## Support & Documentation

For additional information:
- API Reference: See inline TypeScript documentation
- Plugin Development: Check `plugin_directory.json` schemas
- Troubleshooting: Review audit trail logs
- Updates: Monitor brand system version changes

**Last Updated**: July 31, 2025  
**Version**: 1.0.0  
**Maintainer**: JRVI Development Team