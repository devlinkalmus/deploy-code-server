/**
 * Modular Compute Pod (MCP) Registry
 * Manages plug-and-play API wrappers that can be auto-adapted as JRVI logic agents/functions
 * Implements Phase 15 requirements for GitHub-based self-updating API integration library
 */

import { logger } from '../utils/logging';
import { strategyKernel, createOperationRequest, OperationType, Priority } from '../kernel/strategy';
import { securityMiddleware, UserSession } from '../security/middleware';

export interface MCPMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  type: 'external_api' | 'internal_api' | 'logic_agent' | 'function_wrapper';
  status: 'active' | 'inactive' | 'maintenance' | 'failed';
  health: 'healthy' | 'warning' | 'error' | 'unknown';
  apiEndpoint?: string;
  authRequired: boolean;
  rateLimits: {
    requestsPerHour?: number;
    requestsPerMinute?: number;
    requestsPerSecond?: number;
    currentUsage: number;
  };
  capabilities: string[];
  brandAffinity: string[];
  persona: string;
  entry: string;
  enabled: boolean;
  autoDisableOnFailure: boolean;
  failureCount: number;
  maxFailures: number;
  installDate: string;
  lastUpdate: string;
  lastHealthCheck?: string;
  healthCheckInterval: number; // seconds
  versionFallback: {
    enabled: boolean;
    fallbackVersion?: string;
    autoFallback: boolean;
  };
  githubIntegration: {
    repositoryUrl: string;
    autoUpdate: boolean;
    updateBranch: string;
    lastSync: string;
  };
  auditLog: MCPAuditEntry[];
}

export interface MCPAuditEntry {
  id: string;
  timestamp: string;
  action: string;
  traceId: string;
  persona: string;
  brandContext: string[];
  rationale: string;
  userId?: string;
  previousState?: any;
  newState?: any;
  success: boolean;
  error?: string;
}

export interface MCPRegistry {
  version: string;
  lastUpdated: string;
  description: string;
  retentionPolicy: {
    auditLogRetentionDays: number;
    registryRetentionDays: number;
    lastCleanup: string;
  };
  mcps: Record<string, MCPMetadata>;
  globalSettings: {
    enableAutoUpdate: boolean;
    enableHealthChecks: boolean;
    enableVersionFallback: boolean;
    maxGlobalFailures: number;
    defaultHealthCheckInterval: number;
    auditLogMaxEntries: number;
    githubSyncInterval: number;
    enforcementLevel: 'strict' | 'moderate' | 'lenient';
  };
  brandConfigs: Record<string, {
    allowedMCPs: string[];
    restrictedMCPs: string[];
    maxMCPsPerPersona: number;
    requireApproval: boolean;
  }>;
  metadata: {
    totalMCPs: number;
    activeMCPs: number;
    healthyMCPs: number;
    failedMCPs: number;
    lastFullAudit: string;
    nextScheduledMaintenance: string;
  };
}

export interface MCPInstallOptions {
  forceInstall?: boolean;
  skipHealthCheck?: boolean;
  enableAutoUpdate?: boolean;
  persona?: string;
  brandContext?: string[];
  rationale?: string;
}

export interface MCPCallContext {
  persona: string;
  brandAffinity: string[];
  session: UserSession;
  traceId: string;
  rationale: string;
}

class MCPRegistryManager {
  private registry!: MCPRegistry;
  private mcpInstances: Map<string, any> = new Map();
  private healthCheckTimers: Map<string, any> = new Map();
  private githubSyncTimer?: any;
  private registryLogger = logger.createChildLogger('mcp-registry');
  private registryPath: string;

  constructor(registryPath: string = '/home/runner/work/jrvi/jrvi/mcp_directory.json') {
    this.registryPath = registryPath;
    this.loadRegistry();
    this.initializeHealthChecks();
    this.initializeGithubSync();
    this.startRetentionCleanup();

    this.registryLogger.info('MCP Registry initialized', 'mcp-init', {
      totalMCPs: this.registry.metadata.totalMCPs,
      activeMCPs: this.registry.metadata.activeMCPs,
      healthyMCPs: this.registry.metadata.healthyMCPs,
      registryPath: this.registryPath
    }, {
      tags: ['mcp-init', 'system-startup']
    });
  }

  /**
   * Load MCP registry from file or create default
   */
  private loadRegistry(): void {
    try {
      // For browser environment, we'll use the JSON directly
      // In a real Node.js environment, this would read from file
      this.registry = this.createDefaultRegistry();
      this.loadFromMCPDirectory();
    } catch (error) {
      this.registryLogger.error(
        'Failed to load MCP registry, using default',
        'mcp-init',
        { error: error instanceof Error ? error.message : String(error) }
      );
      this.registry = this.createDefaultRegistry();
    }
  }

  /**
   * Load from the mcp_directory.json structure
   */
  private loadFromMCPDirectory(): void {
    // This would load the actual mcp_directory.json in production
    // For now, we'll create sample MCPs based on the structure
    const sampleMCPs = {
      'github_api': {
        id: 'github_api',
        name: 'GitHub API Wrapper',
        version: '1.0.0',
        description: 'GitHub REST API integration with auto-adaptation for JRVI logic agents',
        type: 'external_api' as const,
        status: 'active' as const,
        health: 'healthy' as const,
        apiEndpoint: 'https://api.github.com',
        authRequired: true,
        rateLimits: { requestsPerHour: 5000, currentUsage: 0 },
        capabilities: ['repository_management', 'issue_tracking', 'pull_request_management'],
        brandAffinity: ['JRVI'],
        persona: 'developer',
        entry: 'src/mcps/github_api.ts',
        enabled: true,
        autoDisableOnFailure: true,
        failureCount: 0,
        maxFailures: 3,
        installDate: new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
        healthCheckInterval: 300,
        versionFallback: { enabled: true, autoFallback: true },
        githubIntegration: {
          repositoryUrl: 'https://github.com/octocat/github-api-wrapper',
          autoUpdate: true,
          updateBranch: 'main',
          lastSync: new Date().toISOString()
        },
        auditLog: []
      }
    };

    Object.entries(sampleMCPs).forEach(([id, mcp]) => {
      this.registry.mcps[id] = mcp;
    });

    this.updateMetadata();
  }

  /**
   * Install a new MCP
   */
  async installMCP(
    mcpData: Partial<MCPMetadata>,
    session: UserSession,
    options: MCPInstallOptions = {}
  ): Promise<{ success: boolean; mcpId?: string; error?: string }> {
    const requestId = this.generateId();
    const traceId = options.rationale ? `trace_${requestId}` : requestId;

    try {
      // Validate input
      if (!mcpData.id || !mcpData.name || !mcpData.version) {
        return {
          success: false,
          error: 'Missing required MCP fields: id, name, version'
        };
      }

      // Security check through Strategy Kernel
      const securityResult = await securityMiddleware.checkSecurity({
        session,
        requestId,
        origin: 'mcp-registry',
        operation: 'mcp_install',
        target: mcpData.id,
        brandAffinity: mcpData.brandAffinity || ['JRVI']
      });

      if (!securityResult.allowed) {
        return {
          success: false,
          error: `Security check failed: ${securityResult.reason}`
        };
      }

      // Check if MCP already exists
      if (this.registry.mcps[mcpData.id!] && !options.forceInstall) {
        return {
          success: false,
          error: 'MCP already exists. Use forceInstall option to override.'
        };
      }

      // Create full MCP metadata
      const mcp: MCPMetadata = {
        id: mcpData.id!,
        name: mcpData.name!,
        version: mcpData.version!,
        description: mcpData.description || `${mcpData.name} MCP`,
        type: mcpData.type || 'external_api',
        status: 'active',
        health: 'unknown',
        apiEndpoint: mcpData.apiEndpoint,
        authRequired: mcpData.authRequired ?? true,
        rateLimits: mcpData.rateLimits || {
          requestsPerHour: 1000,
          currentUsage: 0
        },
        capabilities: mcpData.capabilities || [],
        brandAffinity: mcpData.brandAffinity || ['JRVI'],
        persona: options.persona || mcpData.persona || 'default',
        entry: mcpData.entry || `src/mcps/${mcpData.id}.ts`,
        enabled: true,
        autoDisableOnFailure: mcpData.autoDisableOnFailure ?? true,
        failureCount: 0,
        maxFailures: mcpData.maxFailures || 3,
        installDate: new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
        healthCheckInterval: mcpData.healthCheckInterval || this.registry.globalSettings.defaultHealthCheckInterval,
        versionFallback: mcpData.versionFallback || {
          enabled: true,
          autoFallback: true
        },
        githubIntegration: mcpData.githubIntegration || {
          repositoryUrl: '',
          autoUpdate: false,
          updateBranch: 'main',
          lastSync: new Date().toISOString()
        },
        auditLog: []
      };

      // Route through Strategy Kernel for approval
      const installRequest = createOperationRequest(
        OperationType.PLUGIN_INSTALL, // Using PLUGIN_INSTALL for MCP operations
        'mcp-registry',
        mcpData.id!,
        { mcp, session: session.userId, options },
        {
          brandAffinity: mcp.brandAffinity,
          priority: Priority.MEDIUM,
          requiresApproval: this.requiresApproval(mcp.brandAffinity, session),
          metadata: {
            type: 'mcp_install',
            version: mcp.version,
            persona: mcp.persona,
            traceId
          }
        }
      );

      const kernelResult = await strategyKernel.route(installRequest);

      if (!kernelResult.success) {
        return {
          success: false,
          error: `Strategy Kernel rejected: ${kernelResult.error}`
        };
      }

      // Install the MCP
      this.registry.mcps[mcp.id] = mcp;

      // Log audit entry
      await this.logAuditEntry(mcp.id, {
        action: 'mcp_install',
        traceId,
        persona: mcp.persona,
        brandContext: mcp.brandAffinity,
        rationale: options.rationale || 'MCP installation',
        userId: session.userId,
        newState: mcp,
        success: true
      });

      // Start health check if not skipped
      if (!options.skipHealthCheck && this.registry.globalSettings.enableHealthChecks) {
        await this.performHealthCheck(mcp.id);
        this.startHealthCheck(mcp.id);
      }

      this.updateMetadata();

      this.registryLogger.audit(
        `MCP installed: ${mcp.id} v${mcp.version}`,
        'mcp-install',
        {
          mcpId: mcp.id,
          version: mcp.version,
          installer: session.userId,
          brandAffinity: mcp.brandAffinity,
          auditLogId: kernelResult.auditLogId,
          traceId
        },
        {
          tags: ['mcp-install', 'system-update'],
          brandAffinity: mcp.brandAffinity
        }
      );

      return {
        success: true,
        mcpId: mcp.id
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.registryLogger.error(
        `MCP installation failed: ${errorMessage}`,
        'mcp-install',
        {
          requestId,
          mcpId: mcpData.id,
          installer: session.userId,
          error: errorMessage,
          traceId
        }
      );

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Call MCP method with full context and audit logging
   */
  async callMCP(
    mcpId: string,
    method: string,
    args: any[],
    context: MCPCallContext
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    const mcp = this.registry.mcps[mcpId];
    
    if (!mcp) {
      return {
        success: false,
        error: `MCP not found: ${mcpId}`
      };
    }

    if (!mcp.enabled) {
      return {
        success: false,
        error: `MCP disabled: ${mcpId}`
      };
    }

    try {
      // Check persona and brand permissions
      const permissionCheck = this.checkCallPermissions(mcp, context);
      if (!permissionCheck.allowed) {
        return {
          success: false,
          error: `Permission denied: ${permissionCheck.reason}`
        };
      }

      // Security check
      const securityResult = await securityMiddleware.checkSecurity({
        session: context.session,
        requestId: context.traceId,
        origin: 'mcp-registry',
        operation: 'mcp_call',
        target: `${mcpId}.${method}`,
        brandAffinity: context.brandAffinity
      });

      if (!securityResult.allowed) {
        return {
          success: false,
          error: `Security check failed: ${securityResult.reason}`
        };
      }

      // Load MCP instance if not already loaded
      let mcpInstance = this.mcpInstances.get(mcpId);
      if (!mcpInstance) {
        mcpInstance = await this.loadMCPInstance(mcp);
        this.mcpInstances.set(mcpId, mcpInstance);
      }

      // Update rate limiting
      this.updateRateLimit(mcp);

      // Call the MCP method
      const result = await this.callMCPMethod(mcpInstance, method, args);

      // Log successful call
      await this.logAuditEntry(mcpId, {
        action: 'mcp_call',
        traceId: context.traceId,
        persona: context.persona,
        brandContext: context.brandAffinity,
        rationale: context.rationale,
        userId: context.session.userId,
        newState: { method, argsCount: args.length, resultType: typeof result },
        success: true
      });

      this.registryLogger.debug(
        `MCP call successful: ${mcpId}.${method}`,
        'mcp-call',
        {
          mcpId,
          method,
          persona: context.persona,
          brandAffinity: context.brandAffinity,
          traceId: context.traceId
        }
      );

      return {
        success: true,
        result
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Handle MCP failure
      await this.handleMCPFailure(mcpId, errorMessage, context);

      // Log failed call
      await this.logAuditEntry(mcpId, {
        action: 'mcp_call',
        traceId: context.traceId,
        persona: context.persona,
        brandContext: context.brandAffinity,
        rationale: context.rationale,
        userId: context.session.userId,
        success: false,
        error: errorMessage
      });

      this.registryLogger.error(
        `MCP call failed: ${mcpId}.${method} - ${errorMessage}`,
        'mcp-call',
        {
          mcpId,
          method,
          error: errorMessage,
          persona: context.persona,
          traceId: context.traceId
        }
      );

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Health check management
   */
  private initializeHealthChecks(): void {
    if (!this.registry.globalSettings.enableHealthChecks) return;

    Object.values(this.registry.mcps).forEach(mcp => {
      if (mcp.enabled) {
        this.startHealthCheck(mcp.id);
      }
    });
  }

  private startHealthCheck(mcpId: string): void {
    const mcp = this.registry.mcps[mcpId];
    if (!mcp || !mcp.enabled) return;

    // Clear existing timer if any
    this.stopHealthCheck(mcpId);

    const interval = mcp.healthCheckInterval * 1000;
    
    const timer = setInterval(async () => {
      try {
        await this.performHealthCheck(mcpId);
      } catch (error) {
        this.registryLogger.error(
          `Health check failed: ${mcpId}`,
          'mcp-health-check',
          { 
            mcpId,
            error: error instanceof Error ? error.message : String(error)
          }
        );
        
        await this.handleMCPFailure(mcpId, 'Health check failed', {
          persona: 'system',
          brandAffinity: mcp.brandAffinity,
          session: { userId: 'system' } as UserSession,
          traceId: this.generateId(),
          rationale: 'Automated health check failure'
        });
      }
    }, interval);

    this.healthCheckTimers.set(mcpId, timer);
  }

  private stopHealthCheck(mcpId: string): void {
    const timer = this.healthCheckTimers.get(mcpId);
    if (timer) {
      clearInterval(timer);
      this.healthCheckTimers.delete(mcpId);
    }
  }

  private async performHealthCheck(mcpId: string): Promise<void> {
    const mcp = this.registry.mcps[mcpId];
    if (!mcp) return;

    try {
      let healthStatus: 'healthy' | 'warning' | 'error' = 'healthy';

      // Load MCP instance for health check
      let mcpInstance = this.mcpInstances.get(mcpId);
      if (!mcpInstance) {
        mcpInstance = await this.loadMCPInstance(mcp);
        this.mcpInstances.set(mcpId, mcpInstance);
      }

      // Perform health check
      if (typeof mcpInstance.healthCheck === 'function') {
        const healthResult = await Promise.race([
          mcpInstance.healthCheck(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), 30000)
          )
        ]);

        healthStatus = healthResult ? 'healthy' : 'warning';
      }

      // Update MCP health status
      mcp.health = healthStatus;
      mcp.lastHealthCheck = new Date().toISOString();

      // Log health check
      await this.logAuditEntry(mcpId, {
        action: 'health_check',
        traceId: this.generateId(),
        persona: 'system',
        brandContext: mcp.brandAffinity,
        rationale: 'Automated health check',
        success: healthStatus === 'healthy'
      });

    } catch (error) {
      mcp.health = 'error';
      mcp.lastHealthCheck = new Date().toISOString();
      throw error;
    }
  }

  /**
   * GitHub integration for self-updating
   */
  private initializeGithubSync(): void {
    if (!this.registry.globalSettings.enableAutoUpdate) return;

    const syncInterval = this.registry.globalSettings.githubSyncInterval * 1000;
    
    this.githubSyncTimer = setInterval(async () => {
      await this.performGithubSync();
    }, syncInterval);

    // Initial sync after startup
    setTimeout(() => this.performGithubSync(), 10000);
  }

  private async performGithubSync(): Promise<void> {
    this.registryLogger.info('Starting GitHub sync for MCPs', 'github-sync');

    for (const [mcpId, mcp] of Object.entries(this.registry.mcps)) {
      if (!mcp.githubIntegration.autoUpdate || !mcp.githubIntegration.repositoryUrl) {
        continue;
      }

      try {
        // Simulate GitHub API call to check for updates
        const hasUpdate = await this.checkForGithubUpdate(mcp);
        
        if (hasUpdate) {
          await this.performMCPUpdate(mcpId, 'github_auto_update');
        }

        mcp.githubIntegration.lastSync = new Date().toISOString();

      } catch (error) {
        this.registryLogger.error(
          `GitHub sync failed for MCP: ${mcpId}`,
          'github-sync',
          {
            mcpId,
            repositoryUrl: mcp.githubIntegration.repositoryUrl,
            error: error instanceof Error ? error.message : String(error)
          }
        );
      }
    }
  }

  private async checkForGithubUpdate(mcp: MCPMetadata): Promise<boolean> {
    // Simulate version check - in production would call GitHub API
    return false; // Disabled for now
  }

  private async performMCPUpdate(mcpId: string, updateReason: string): Promise<void> {
    const mcp = this.registry.mcps[mcpId];
    if (!mcp) return;

    const oldVersion = mcp.version;
    const newVersion = this.generateNewVersion(oldVersion);

    // Log update
    await this.logAuditEntry(mcpId, {
      action: 'mcp_update',
      traceId: this.generateId(),
      persona: 'system',
      brandContext: mcp.brandAffinity,
      rationale: updateReason,
      previousState: { version: oldVersion },
      newState: { version: newVersion },
      success: true
    });

    mcp.version = newVersion;
    mcp.lastUpdate = new Date().toISOString();

    this.registryLogger.audit(
      `MCP updated: ${mcpId} ${oldVersion} -> ${newVersion}`,
      'mcp-update',
      {
        mcpId,
        oldVersion,
        newVersion,
        updateReason
      },
      {
        tags: ['mcp-update', 'auto-update'],
        brandAffinity: mcp.brandAffinity
      }
    );
  }

  /**
   * Helper methods
   */
  private async handleMCPFailure(mcpId: string, error: string, context: MCPCallContext): Promise<void> {
    const mcp = this.registry.mcps[mcpId];
    if (!mcp) return;

    mcp.failureCount++;
    mcp.health = 'error';

    // Auto-disable if failure threshold reached
    if (mcp.autoDisableOnFailure && mcp.failureCount >= mcp.maxFailures) {
      mcp.enabled = false;
      mcp.status = 'failed';
      
      // Try version fallback if enabled
      if (mcp.versionFallback.enabled && mcp.versionFallback.autoFallback && mcp.versionFallback.fallbackVersion) {
        await this.performVersionFallback(mcpId, context);
      }

      // Log auto-disable
      await this.logAuditEntry(mcpId, {
        action: 'mcp_auto_disable',
        traceId: context.traceId,
        persona: 'system',
        brandContext: mcp.brandAffinity,
        rationale: `Auto-disabled due to ${mcp.failureCount} failures`,
        previousState: { enabled: true, failureCount: mcp.failureCount - 1 },
        newState: { enabled: false, failureCount: mcp.failureCount },
        success: true
      });

      this.registryLogger.security(
        `MCP auto-disabled due to failures: ${mcpId}`,
        'mcp-auto-disable',
        {
          mcpId,
          failureCount: mcp.failureCount,
          maxFailures: mcp.maxFailures,
          error
        },
        {
          tags: ['mcp-auto-disable', 'security-action'],
          brandAffinity: mcp.brandAffinity
        }
      );

      // Remove from loaded instances
      this.mcpInstances.delete(mcpId);
      
      // Stop health check
      this.stopHealthCheck(mcpId);
    }

    this.updateMetadata();
  }

  private async performVersionFallback(mcpId: string, context: MCPCallContext): Promise<void> {
    const mcp = this.registry.mcps[mcpId];
    if (!mcp || !mcp.versionFallback.fallbackVersion) return;

    const originalVersion = mcp.version;
    mcp.version = mcp.versionFallback.fallbackVersion;
    mcp.enabled = true;
    mcp.status = 'active';
    mcp.failureCount = 0;
    mcp.health = 'warning';

    await this.logAuditEntry(mcpId, {
      action: 'version_fallback',
      traceId: context.traceId,
      persona: 'system',
      brandContext: mcp.brandAffinity,
      rationale: 'Automated version fallback due to repeated failures',
      previousState: { version: originalVersion, enabled: false },
      newState: { version: mcp.version, enabled: true },
      success: true
    });

    this.registryLogger.audit(
      `MCP version fallback: ${mcpId} ${originalVersion} -> ${mcp.version}`,
      'mcp-fallback',
      {
        mcpId,
        originalVersion,
        fallbackVersion: mcp.version
      },
      {
        tags: ['mcp-fallback', 'auto-recovery'],
        brandAffinity: mcp.brandAffinity
      }
    );

    // Restart health check
    this.startHealthCheck(mcpId);
  }

  private checkCallPermissions(
    mcp: MCPMetadata, 
    context: MCPCallContext
  ): { allowed: boolean; reason?: string } {
    // Check persona routing
    if (mcp.persona !== '*' && mcp.persona !== context.persona) {
      return {
        allowed: false,
        reason: `Persona '${context.persona}' not allowed for MCP ${mcp.id} (requires '${mcp.persona}')`
      };
    }

    // Check brand affinity
    const hasMatchingBrand = mcp.brandAffinity.some(brand => 
      context.brandAffinity.includes(brand)
    );

    if (!hasMatchingBrand) {
      return {
        allowed: false,
        reason: `Brand affinity mismatch for MCP ${mcp.id}`
      };
    }

    return { allowed: true };
  }

  private requiresApproval(brandAffinity: string[], session: UserSession): boolean {
    return brandAffinity.some(brand => {
      const brandConfig = this.registry.brandConfigs[brand];
      return brandConfig?.requireApproval ?? false;
    });
  }

  private updateRateLimit(mcp: MCPMetadata): void {
    mcp.rateLimits.currentUsage++;
    // In production, this would implement proper rate limiting logic
  }

  private async loadMCPInstance(mcp: MCPMetadata): Promise<any> {
    // Simulate MCP loading - in production this would dynamically import the MCP
    return {
      id: mcp.id,
      name: mcp.name,
      version: mcp.version,
      healthCheck: () => Promise.resolve(true),
      // MCP-specific methods would be loaded here
      callAPI: async (endpoint: string, data: any) => {
        // Simulate API call
        return { success: true, data: `Response from ${endpoint}` };
      }
    };
  }

  private async callMCPMethod(instance: any, method: string, args: any[]): Promise<any> {
    if (typeof instance[method] !== 'function') {
      throw new Error(`Method '${method}' not found in MCP`);
    }

    return await instance[method](...args);
  }

  private async logAuditEntry(mcpId: string, entry: Omit<MCPAuditEntry, 'id' | 'timestamp'>): Promise<void> {
    const mcp = this.registry.mcps[mcpId];
    if (!mcp) return;

    const auditEntry: MCPAuditEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      ...entry
    };

    mcp.auditLog.push(auditEntry);

    // Maintain audit log size limit
    const maxEntries = this.registry.globalSettings.auditLogMaxEntries;
    if (mcp.auditLog.length > maxEntries) {
      mcp.auditLog = mcp.auditLog.slice(-maxEntries);
    }
  }

  private updateMetadata(): void {
    const mcps = Object.values(this.registry.mcps);
    
    this.registry.metadata = {
      totalMCPs: mcps.length,
      activeMCPs: mcps.filter(m => m.status === 'active').length,
      healthyMCPs: mcps.filter(m => m.health === 'healthy').length,
      failedMCPs: mcps.filter(m => m.status === 'failed').length,
      lastFullAudit: this.registry.metadata?.lastFullAudit || new Date().toISOString(),
      nextScheduledMaintenance: this.registry.metadata?.nextScheduledMaintenance || 
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  private createDefaultRegistry(): MCPRegistry {
    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      description: 'JRVI Modular Compute Pod (MCP) Directory',
      retentionPolicy: {
        auditLogRetentionDays: 90,
        registryRetentionDays: 90,
        lastCleanup: new Date().toISOString()
      },
      mcps: {},
      globalSettings: {
        enableAutoUpdate: true,
        enableHealthChecks: true,
        enableVersionFallback: true,
        maxGlobalFailures: 50,
        defaultHealthCheckInterval: 300,
        auditLogMaxEntries: 1000,
        githubSyncInterval: 3600,
        enforcementLevel: 'strict'
      },
      brandConfigs: {},
      metadata: {
        totalMCPs: 0,
        activeMCPs: 0,
        healthyMCPs: 0,
        failedMCPs: 0,
        lastFullAudit: new Date().toISOString(),
        nextScheduledMaintenance: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    };
  }

  private startRetentionCleanup(): void {
    // Run cleanup daily
    setInterval(() => {
      this.performRetentionCleanup();
    }, 24 * 60 * 60 * 1000);
  }

  private performRetentionCleanup(): void {
    const retentionDays = this.registry.retentionPolicy.auditLogRetentionDays;
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    let cleanedEntries = 0;

    Object.values(this.registry.mcps).forEach(mcp => {
      const originalLength = mcp.auditLog.length;
      mcp.auditLog = mcp.auditLog.filter(entry => 
        new Date(entry.timestamp) > cutoffDate
      );
      cleanedEntries += originalLength - mcp.auditLog.length;
    });

    this.registry.retentionPolicy.lastCleanup = new Date().toISOString();

    if (cleanedEntries > 0) {
      this.registryLogger.info(
        `Retention cleanup completed: ${cleanedEntries} audit entries removed`,
        'retention-cleanup',
        { cleanedEntries, cutoffDate: cutoffDate.toISOString() }
      );
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  private generateNewVersion(currentVersion: string): string {
    const parts = currentVersion.split('.');
    parts[2] = String(parseInt(parts[2] || '0') + 1);
    return parts.join('.');
  }

  /**
   * Public API methods
   */
  getMCP(mcpId: string): MCPMetadata | undefined {
    return this.registry.mcps[mcpId];
  }

  getActiveMCPs(): MCPMetadata[] {
    return Object.values(this.registry.mcps).filter(m => m.status === 'active' && m.enabled);
  }

  getMCPsByBrand(brandId: string): MCPMetadata[] {
    return Object.values(this.registry.mcps)
      .filter(m => m.brandAffinity.includes(brandId));
  }

  getMCPsByPersona(persona: string): MCPMetadata[] {
    return Object.values(this.registry.mcps)
      .filter(m => m.enabled && (m.persona === '*' || m.persona === persona));
  }

  async enableMCP(mcpId: string, session: UserSession, rationale: string): Promise<boolean> {
    const mcp = this.registry.mcps[mcpId];
    if (!mcp) return false;

    mcp.enabled = true;
    mcp.status = 'active';
    mcp.failureCount = 0;

    await this.logAuditEntry(mcpId, {
      action: 'mcp_enable',
      traceId: this.generateId(),
      persona: session.userId,
      brandContext: mcp.brandAffinity,
      rationale,
      userId: session.userId,
      previousState: { enabled: false },
      newState: { enabled: true },
      success: true
    });

    this.startHealthCheck(mcpId);
    this.updateMetadata();
    return true;
  }

  async disableMCP(mcpId: string, session: UserSession, rationale: string): Promise<boolean> {
    const mcp = this.registry.mcps[mcpId];
    if (!mcp) return false;

    mcp.enabled = false;
    mcp.status = 'inactive';

    await this.logAuditEntry(mcpId, {
      action: 'mcp_disable',
      traceId: this.generateId(),
      persona: session.userId,
      brandContext: mcp.brandAffinity,
      rationale,
      userId: session.userId,
      previousState: { enabled: true },
      newState: { enabled: false },
      success: true
    });

    this.stopHealthCheck(mcpId);
    this.mcpInstances.delete(mcpId);
    this.updateMetadata();
    return true;
  }

  getRegistryStats(): {
    totalMCPs: number;
    activeMCPs: number;
    healthyMCPs: number;
    failedMCPs: number;
    healthChecksActive: number;
    totalAuditEntries: number;
  } {
    const mcps = Object.values(this.registry.mcps);
    const totalAuditEntries = mcps.reduce((sum, mcp) => sum + mcp.auditLog.length, 0);
    
    return {
      totalMCPs: mcps.length,
      activeMCPs: mcps.filter(m => m.status === 'active' && m.enabled).length,
      healthyMCPs: mcps.filter(m => m.health === 'healthy').length,
      failedMCPs: mcps.filter(m => m.status === 'failed').length,
      healthChecksActive: this.healthCheckTimers.size,
      totalAuditEntries
    };
  }

  getRegistry(): MCPRegistry {
    return { ...this.registry };
  }

  getAuditTrail(mcpId?: string, limit: number = 100): MCPAuditEntry[] {
    if (mcpId) {
      const mcp = this.registry.mcps[mcpId];
      return mcp ? mcp.auditLog.slice(-limit) : [];
    }

    // Get audit entries from all MCPs
    const allEntries: MCPAuditEntry[] = [];
    Object.values(this.registry.mcps).forEach(mcp => {
      allEntries.push(...mcp.auditLog);
    });

    return allEntries
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  // Cleanup method
  destroy(): void {
    // Stop all timers
    this.healthCheckTimers.forEach(timer => clearInterval(timer));
    this.healthCheckTimers.clear();
    
    if (this.githubSyncTimer) {
      clearInterval(this.githubSyncTimer);
    }

    this.mcpInstances.clear();
  }
}

// Singleton instance
export const mcpRegistry = new MCPRegistryManager();

// Helper function to create MCP call context
export function createMCPCallContext(
  persona: string,
  brandAffinity: string[],
  session: UserSession,
  rationale: string
): MCPCallContext {
  return {
    persona,
    brandAffinity,
    session,
    traceId: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
    rationale
  };
}

export default mcpRegistry;