/**
 * Enhanced Plugin Registry - Versioning, auto-disable, persona-based routing
 * Extends the existing plugin_directory.json with advanced management capabilities
 */

import { logger } from '../utils/logging';
import { strategyKernel, createOperationRequest, OperationType, Priority } from '../kernel/strategy';
import { securityMiddleware, UserSession } from '../security/middleware';

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  type: string;
  entry: string;
  dependencies: string[];
  capabilities: string[];
  brandAffinity: string[];
  enabled: boolean;
  autoDisableOnFailure: boolean;
  failureCount: number;
  maxFailures: number;
  lastFailure?: Date;
  installDate: Date;
  lastUpdate: Date;
  securityLevel: string;
  personaRouting: PersonaRoutingConfig;
  healthCheck?: HealthCheckConfig;
  // Phase 13 enhancements
  status: 'active' | 'disabled' | 'failed' | 'fallback';
  fallbackCount: number;
  autoRecoveryAttempts: number;
  maxRecoveryAttempts: number;
  lastRecoveryAttempt?: Date;
  versionEnforcement: VersionEnforcementConfig;
  performanceMetrics: PluginPerformanceMetrics;
}

export interface PersonaRoutingConfig {
  allowedPersonas: string[];
  defaultPersona: string;
  personaOverrides: Record<string, PluginOverride>;
  routingRules: RoutingRule[];
}

export interface PluginOverride {
  enabled: boolean;
  config?: Record<string, any>;
  priority?: number;
}

export interface RoutingRule {
  condition: string;
  targetPersona: string;
  priority: number;
}

export interface HealthCheckConfig {
  enabled: boolean;
  interval: number; // in seconds
  timeout: number; // in seconds
  endpoint?: string;
  expectedResponse?: any;
}

// Phase 13 new interfaces
export interface VersionEnforcementConfig {
  enabled: boolean;
  requiredVersion?: string;
  allowFallback: boolean;
  fallbackVersion?: string;
  strictMode: boolean;
}

export interface PluginPerformanceMetrics {
  executionCount: number;
  totalExecutionTime: number;
  averageExecutionTime: number;
  errorRate: number;
  lastExecutionTime?: Date;
  successfulExecutions: number;
  failedExecutions: number;
}

export interface PluginFallbackEvent {
  id: string;
  timestamp: Date;
  pluginId: string;
  reason: string;
  fromVersion: string;
  toVersion?: string;
  success: boolean;
  traceId: string;
  persona: string;
  brandAffinity: string[];
}

export interface PluginRegistrySnapshot {
  id: string;
  timestamp: Date;
  version: string;
  pluginCount: number;
  enabledPluginCount: number;
  plugins: Record<string, PluginMetadata>;
  globalSettings: GlobalPluginSettings;
  fallbackEvents: PluginFallbackEvent[];
  performanceSummary: {
    totalExecutions: number;
    averageErrorRate: number;
    healthyPlugins: number;
    failedPlugins: number;
  };
}

export interface PluginRegistry {
  version: string;
  lastUpdated: string;
  plugins: Record<string, PluginMetadata>;
  brandConfigs: Record<string, BrandConfig>;
  globalSettings: GlobalPluginSettings;
}

export interface BrandConfig {
  enabled: boolean;
  allowedPlugins: string[];
  restrictedPlugins: string[];
  defaultPersona: string;
  securityLevel: string;
}

export interface GlobalPluginSettings {
  enableAutoDisable: boolean;
  maxGlobalFailures: number;
  healthCheckInterval: number;
  enablePersonaRouting: boolean;
  defaultSecurityLevel: string;
  // Phase 13 enhancements
  enableVersionEnforcement: boolean;
  retentionDays: number;
  enableAutoRecovery: boolean;
  maxAutoRecoveryAttempts: number;
  snapshotInterval: number; // in minutes
  enableFallbackLogging: boolean;
}

class EnhancedPluginRegistry {
  private registry!: PluginRegistry;
  private pluginInstances: Map<string, any> = new Map();
  private healthCheckTimers: Map<string, any> = new Map();
  private registryLogger = logger.createChildLogger('plugin-registry');
  // Phase 13 additions
  private fallbackEvents: PluginFallbackEvent[] = [];
  private registrySnapshots: PluginRegistrySnapshot[] = [];
  private snapshotTimer?: any;
  private recoveryTimers: Map<string, any> = new Map();

  constructor(registryPath?: string) {
    this.loadRegistry(registryPath);
    this.initializeHealthChecks();
    this.startPeriodicMaintenance();
    this.startSnapshotTimer();

    this.registryLogger.info('Enhanced plugin registry initialized', 'registry-init', {
      totalPlugins: this.registry ? Object.keys(this.registry.plugins).length : 0,
      enabledPlugins: this.getEnabledPlugins().length,
      globalSettings: this.registry ? this.registry.globalSettings : null
    });
  }

  /**
   * Load plugin registry from file or create default
   */
  private loadRegistry(registryPath?: string): void {
    try {
      // For now, create a default registry
      // In production, this would load from the actual plugin_directory.json
      this.registry = {
        version: '2.0.0',
        lastUpdated: new Date().toISOString(),
        plugins: {},
        brandConfigs: {
          'JRVI': {
            enabled: true,
            allowedPlugins: ['*'],
            restrictedPlugins: [],
            defaultPersona: 'jrvi',
            securityLevel: 'authenticated'
          }
        },
        globalSettings: {
          enableAutoDisable: true,
          maxGlobalFailures: 5,
          healthCheckInterval: 60,
          enablePersonaRouting: true,
          defaultSecurityLevel: 'authenticated',
          // Phase 13 defaults
          enableVersionEnforcement: true,
          retentionDays: 90,
          enableAutoRecovery: true,
          maxAutoRecoveryAttempts: 3,
          snapshotInterval: 60, // 1 hour
          enableFallbackLogging: true
        }
      };

      // Load existing plugins from the basic registry
      this.migrateFromBasicRegistry();
    } catch (error) {
      this.registryLogger.error(
        'Failed to load plugin registry',
        'registry-init',
        { error: error instanceof Error ? error.message : String(error) }
      );
      
      // Create minimal default registry
      this.registry = this.createDefaultRegistry();
    }
  }

  /**
   * Migrate from the basic plugin_directory.json format
   */
  private migrateFromBasicRegistry(): void {
    try {
      // This would load the existing plugin_directory.json and migrate it
      // For now, we'll create enhanced versions of the existing plugins
      const basicPlugins = {
        'jrvi_core': {
          name: 'JRVI Core',
          version: '1.0.0',
          type: 'core',
          capabilities: ['ai_assistance', 'development_tools', 'code_analysis']
        }
      };

      Object.entries(basicPlugins).forEach(([id, plugin]) => {
        this.registry.plugins[id] = this.createEnhancedPlugin(id, plugin);
      });

    } catch (error) {
      this.registryLogger.warn(
        'Could not migrate from basic registry',
        'registry-migration',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Create enhanced plugin metadata from basic plugin info
   */
  private createEnhancedPlugin(id: string, basicPlugin: any): PluginMetadata {
    return {
      id,
      name: basicPlugin.name || id,
      version: basicPlugin.version || '1.0.0',
      description: basicPlugin.description || `${basicPlugin.name} plugin`,
      type: basicPlugin.type || 'utility',
      entry: basicPlugin.entry || `src/plugins/${id}.ts`,
      dependencies: basicPlugin.dependencies || [],
      capabilities: basicPlugin.capabilities || [],
      brandAffinity: ['JRVI'],
      enabled: true,
      autoDisableOnFailure: true,
      failureCount: 0,
      maxFailures: 3,
      installDate: new Date(),
      lastUpdate: new Date(),
      securityLevel: 'authenticated',
      personaRouting: {
        allowedPersonas: ['*'],
        defaultPersona: 'jrvi',
        personaOverrides: {},
        routingRules: []
      },
      healthCheck: {
        enabled: false,
        interval: 300,
        timeout: 30
      },
      // Phase 13 enhancements
      status: 'active',
      fallbackCount: 0,
      autoRecoveryAttempts: 0,
      maxRecoveryAttempts: 3,
      versionEnforcement: {
        enabled: true,
        allowFallback: true,
        strictMode: false
      },
      performanceMetrics: {
        executionCount: 0,
        totalExecutionTime: 0,
        averageExecutionTime: 0,
        errorRate: 0,
        successfulExecutions: 0,
        failedExecutions: 0
      }
    };
  }

  /**
   * Install a new plugin
   */
  async installPlugin(
    pluginData: Partial<PluginMetadata>,
    session: UserSession,
    options: {
      forceInstall?: boolean;
      skipDependencyCheck?: boolean;
    } = {}
  ): Promise<{ success: boolean; pluginId?: string; error?: string }> {
    const requestId = this.generateId();
    
    try {
      // Security check
      const securityResult = await securityMiddleware.checkSecurity({
        session,
        requestId,
        origin: 'plugin-registry',
        operation: 'plugin_install',
        target: pluginData.id || 'unknown',
        brandAffinity: pluginData.brandAffinity || ['JRVI']
      });

      if (!securityResult.allowed) {
        return {
          success: false,
          error: `Security check failed: ${securityResult.reason}`
        };
      }

      // Validate plugin data
      const validation = this.validatePluginData(pluginData);
      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`
        };
      }

      // Check dependencies
      if (!options.skipDependencyCheck) {
        const dependencyCheck = this.checkDependencies(pluginData.dependencies || []);
        if (!dependencyCheck.satisfied) {
          return {
            success: false,
            error: `Missing dependencies: ${dependencyCheck.missing.join(', ')}`
          };
        }
      }

      // Check if plugin already exists
      if (this.registry.plugins[pluginData.id!] && !options.forceInstall) {
        return {
          success: false,
          error: 'Plugin already exists. Use forceInstall option to override.'
        };
      }

      // Create full plugin metadata
      const plugin: PluginMetadata = {
        ...this.createEnhancedPlugin(pluginData.id!, pluginData),
        ...pluginData,
        id: pluginData.id!,
        installDate: new Date(),
        lastUpdate: new Date(),
        enabled: true,
        failureCount: 0
      };

      // Route through strategy kernel
      const installRequest = createOperationRequest(
        OperationType.PLUGIN_INSTALL,
        'plugin-registry',
        pluginData.id!,
        { plugin, session: session.userId },
        {
          brandAffinity: plugin.brandAffinity,
          priority: Priority.MEDIUM,
          requiresApproval: true,
          metadata: { 
            version: plugin.version,
            type: plugin.type
          }
        }
      );

      const kernelResult = await strategyKernel.route(installRequest);

      if (!kernelResult.success) {
        return {
          success: false,
          error: `Kernel routing failed: ${kernelResult.error}`
        };
      }

      // Install the plugin
      this.registry.plugins[plugin.id] = plugin;
      this.registry.lastUpdated = new Date().toISOString();

      // Initialize health check if enabled
      if (plugin.healthCheck?.enabled) {
        this.startHealthCheck(plugin.id);
      }

      this.registryLogger.audit(
        `Plugin installed: ${plugin.id} v${plugin.version}`,
        'plugin-install',
        {
          pluginId: plugin.id,
          version: plugin.version,
          installer: session.userId,
          brandAffinity: plugin.brandAffinity,
          auditLogId: kernelResult.auditLogId
        },
        {
          tags: ['plugin-install', 'system-update'],
          brandAffinity: plugin.brandAffinity
        }
      );

      return {
        success: true,
        pluginId: plugin.id
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.registryLogger.error(
        `Plugin installation failed: ${errorMessage}`,
        'plugin-install',
        {
          requestId,
          pluginId: pluginData.id,
          installer: session.userId,
          error: errorMessage
        }
      );

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Route plugin call based on persona and brand with Phase 13 enhancements
   */
  async routePluginCall(
    pluginId: string,
    method: string,
    args: any[],
    context: {
      persona: string;
      brandAffinity: string[];
      session: UserSession;
      traceId?: string;
    }
  ): Promise<{ success: boolean; result?: any; error?: string; fallbackUsed?: boolean }> {
    const plugin = this.registry.plugins[pluginId];
    
    if (!plugin) {
      return {
        success: false,
        error: `Plugin not found: ${pluginId}`
      };
    }

    if (!plugin.enabled) {
      return {
        success: false,
        error: `Plugin disabled: ${pluginId}`
      };
    }

    const traceId = context.traceId || this.generateId();

    try {
      // Check persona routing
      const routingResult = this.checkPersonaRouting(plugin, context.persona);
      if (!routingResult.allowed) {
        return {
          success: false,
          error: `Persona routing denied: ${routingResult.reason}`
        };
      }

      // Security check
      const securityResult = await securityMiddleware.checkSecurity({
        session: context.session,
        requestId: traceId,
        origin: 'plugin-registry',
        operation: 'plugin_call',
        target: `${pluginId}.${method}`,
        brandAffinity: context.brandAffinity
      });

      if (!securityResult.allowed) {
        return {
          success: false,
          error: `Security check failed: ${securityResult.reason}`
        };
      }

      // Load plugin instance if not already loaded
      let pluginInstance = this.pluginInstances.get(pluginId);
      if (!pluginInstance) {
        pluginInstance = await this.loadPluginInstance(plugin);
        this.pluginInstances.set(pluginId, pluginInstance);
      }

      // Use Phase 13 enhanced execution with version enforcement
      return await this.enforceVersionAndExecute(pluginId, method, args, {
        ...context,
        traceId
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Handle plugin failure
      await this.handlePluginFailure(pluginId, errorMessage);

      this.registryLogger.error(
        `Plugin call failed: ${pluginId}.${method} - ${errorMessage}`,
        'plugin-call',
        {
          pluginId,
          method,
          error: errorMessage,
          persona: context.persona,
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
   * Handle plugin failure and auto-disable if necessary
   */
  private async handlePluginFailure(pluginId: string, error: string): Promise<void> {
    const plugin = this.registry.plugins[pluginId];
    if (!plugin) return;

    plugin.failureCount++;
    plugin.lastFailure = new Date();

    this.registryLogger.warn(
      `Plugin failure recorded: ${pluginId}`,
      'plugin-failure',
      {
        pluginId,
        failureCount: plugin.failureCount,
        maxFailures: plugin.maxFailures,
        error,
        autoDisable: plugin.autoDisableOnFailure
      }
    );

    // Auto-disable if failure threshold reached
    if (plugin.autoDisableOnFailure && plugin.failureCount >= plugin.maxFailures) {
      plugin.enabled = false;
      plugin.status = 'failed';
      
      this.registryLogger.security(
        `Plugin auto-disabled due to failures: ${pluginId}`,
        'plugin-auto-disable',
        {
          pluginId,
          failureCount: plugin.failureCount,
          maxFailures: plugin.maxFailures
        },
        {
          tags: ['plugin-auto-disable', 'security-action']
        }
      );

      // Remove from loaded instances
      this.pluginInstances.delete(pluginId);
      
      // Stop health check
      this.stopHealthCheck(pluginId);

      // Schedule recovery attempt if auto-recovery is enabled
      if (this.registry.globalSettings.enableAutoRecovery) {
        this.scheduleRecoveryAttempt(pluginId);
      }

      // Create snapshot after significant change
      this.createRegistrySnapshot();
    }
  }

  /**
   * Check persona routing rules
   */
  private checkPersonaRouting(plugin: PluginMetadata, persona: string): { allowed: boolean; reason?: string } {
    if (!this.registry.globalSettings.enablePersonaRouting) {
      return { allowed: true };
    }

    const routing = plugin.personaRouting;

    // Check if persona is allowed
    if (!routing.allowedPersonas.includes('*') && !routing.allowedPersonas.includes(persona)) {
      return {
        allowed: false,
        reason: `Persona '${persona}' not allowed for plugin ${plugin.id}`
      };
    }

    // Check persona overrides
    const override = routing.personaOverrides[persona];
    if (override && !override.enabled) {
      return {
        allowed: false,
        reason: `Persona '${persona}' explicitly disabled for plugin ${plugin.id}`
      };
    }

    return { allowed: true };
  }

  /**
   * Health check management
   */
  private initializeHealthChecks(): void {
    Object.values(this.registry.plugins).forEach(plugin => {
      if (plugin.enabled && plugin.healthCheck?.enabled) {
        this.startHealthCheck(plugin.id);
      }
    });
  }

  private startHealthCheck(pluginId: string): void {
    const plugin = this.registry.plugins[pluginId];
    if (!plugin?.healthCheck?.enabled) return;

    const interval = plugin.healthCheck.interval * 1000;
    
    const timer = setInterval(async () => {
      try {
        await this.performHealthCheck(plugin);
      } catch (error) {
        this.registryLogger.error(
          `Health check failed: ${pluginId}`,
          'health-check',
          { 
            pluginId,
            error: error instanceof Error ? error.message : String(error)
          }
        );
        
        await this.handlePluginFailure(pluginId, 'Health check failed');
      }
    }, interval);

    this.healthCheckTimers.set(pluginId, timer);
  }

  private stopHealthCheck(pluginId: string): void {
    const timer = this.healthCheckTimers.get(pluginId);
    if (timer) {
      clearInterval(timer);
      this.healthCheckTimers.delete(pluginId);
    }
  }

  private async performHealthCheck(plugin: PluginMetadata): Promise<void> {
    // Basic health check - can be extended
    const pluginInstance = this.pluginInstances.get(plugin.id);
    
    if (pluginInstance && typeof pluginInstance.healthCheck === 'function') {
      const result = await Promise.race([
        pluginInstance.healthCheck(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), 
          plugin.healthCheck!.timeout * 1000)
        )
      ]);

      if (!result) {
        throw new Error('Health check returned false');
      }
    }
  }

  /**
   * Utility methods
   */
  private validatePluginData(pluginData: Partial<PluginMetadata>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!pluginData.id) errors.push('Plugin ID is required');
    if (!pluginData.name) errors.push('Plugin name is required');
    if (!pluginData.version) errors.push('Plugin version is required');
    if (!pluginData.entry) errors.push('Plugin entry point is required');

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private checkDependencies(dependencies: string[]): { satisfied: boolean; missing: string[] } {
    const missing: string[] = [];

    dependencies.forEach(dep => {
      if (!this.registry.plugins[dep] || !this.registry.plugins[dep].enabled) {
        missing.push(dep);
      }
    });

    return {
      satisfied: missing.length === 0,
      missing
    };
  }

  private async loadPluginInstance(plugin: PluginMetadata): Promise<any> {
    // Simulate plugin loading - in production this would dynamically import the plugin
    return {
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      healthCheck: () => true, // Basic health check
      // ... other plugin methods would be loaded here
    };
  }

  private async callPluginMethod(instance: any, method: string, args: any[]): Promise<any> {
    if (typeof instance[method] !== 'function') {
      throw new Error(`Method '${method}' not found in plugin`);
    }

    return await instance[method](...args);
  }

  private createDefaultRegistry(): PluginRegistry {
    return {
      version: '2.0.0',
      lastUpdated: new Date().toISOString(),
      plugins: {},
      brandConfigs: {},
      globalSettings: {
        enableAutoDisable: true,
        maxGlobalFailures: 5,
        healthCheckInterval: 60,
        enablePersonaRouting: true,
        defaultSecurityLevel: 'authenticated',
        enableVersionEnforcement: true,
        retentionDays: 90,
        enableAutoRecovery: true,
        maxAutoRecoveryAttempts: 3,
        snapshotInterval: 60,
        enableFallbackLogging: true
      }
    };
  }

  private startPeriodicMaintenance(): void {
    setInterval(() => {
      this.performMaintenance();
    }, 60000); // Run every minute
  }

  private performMaintenance(): void {
    // Clean up disabled plugins
    // Reset failure counts for recovered plugins
    // Other maintenance tasks
    this.cleanupOldData();
    this.attemptAutoRecovery();
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Phase 13: Automatic snapshot creation and export
   */
  private startSnapshotTimer(): void {
    const interval = this.registry.globalSettings.snapshotInterval * 60 * 1000; // Convert to ms
    this.snapshotTimer = setInterval(() => {
      this.createRegistrySnapshot();
    }, interval);
  }

  private createRegistrySnapshot(): PluginRegistrySnapshot {
    const plugins = Object.values(this.registry.plugins);
    const snapshot: PluginRegistrySnapshot = {
      id: this.generateId(),
      timestamp: new Date(),
      version: this.registry.version,
      pluginCount: plugins.length,
      enabledPluginCount: plugins.filter(p => p.enabled).length,
      plugins: this.registry.plugins,
      globalSettings: this.registry.globalSettings,
      fallbackEvents: [...this.fallbackEvents],
      performanceSummary: {
        totalExecutions: plugins.reduce((sum, p) => sum + p.performanceMetrics.executionCount, 0),
        averageErrorRate: plugins.reduce((sum, p) => sum + p.performanceMetrics.errorRate, 0) / plugins.length,
        healthyPlugins: plugins.filter(p => p.status === 'active').length,
        failedPlugins: plugins.filter(p => p.status === 'failed').length
      }
    };

    this.registrySnapshots.push(snapshot);
    this.exportRegistrySnapshot(snapshot);

    this.registryLogger.audit(
      'Plugin registry snapshot created',
      'registry-snapshot',
      {
        snapshotId: snapshot.id,
        pluginCount: snapshot.pluginCount,
        enabledPlugins: snapshot.enabledPluginCount
      },
      {
        tags: ['registry-snapshot', 'audit-compliance']
      }
    );

    return snapshot;
  }

  private exportRegistrySnapshot(snapshot: PluginRegistrySnapshot): void {
    try {
      // In a real implementation, this would write to file system or external storage
      const snapshotData = JSON.stringify(snapshot, null, 2);
      
      // For now, we'll just log it - in production this would be saved to disk
      this.registryLogger.debug(
        'Registry snapshot exported',
        'registry-export',
        {
          snapshotId: snapshot.id,
          dataSize: snapshotData.length,
          timestamp: snapshot.timestamp
        }
      );

      // Update the main plugin_directory.json with current state
      this.updatePluginDirectoryFile();
    } catch (error) {
      this.registryLogger.error(
        'Failed to export registry snapshot',
        'registry-export',
        {
          snapshotId: snapshot.id,
          error: error instanceof Error ? error.message : String(error)
        }
      );
    }
  }

  private updatePluginDirectoryFile(): void {
    // Generate updated plugin_directory.json with current runtime state
    const pluginDirectory = {
      version: this.registry.version,
      lastUpdated: new Date().toISOString(),
      description: "JRVI Plugin Directory - Runtime-generated registry of all loaded plugins",
      note: "Auto-generated from plugin registry with real-time status",
      runtime_status: {
        total_plugins: Object.keys(this.registry.plugins).length,
        enabled_plugins: this.getEnabledPlugins().length,
        failed_plugins: Object.values(this.registry.plugins).filter(p => p.status === 'failed').length,
        fallback_events: this.fallbackEvents.length,
        last_snapshot: this.registrySnapshots[this.registrySnapshots.length - 1]?.timestamp
      },
      plugins: Object.values(this.registry.plugins).map(plugin => ({
        id: plugin.id,
        name: plugin.name,
        version: plugin.version,
        status: plugin.status,
        enabled: plugin.enabled,
        persona: plugin.personaRouting.defaultPersona,
        brand: plugin.brandAffinity[0] || 'JRVI',
        failure_count: plugin.failureCount,
        fallback_count: plugin.fallbackCount,
        auto_recovery_attempts: plugin.autoRecoveryAttempts,
        performance: {
          execution_count: plugin.performanceMetrics.executionCount,
          error_rate: plugin.performanceMetrics.errorRate,
          avg_execution_time: plugin.performanceMetrics.averageExecutionTime
        },
        last_update: plugin.lastUpdate,
        install_date: plugin.installDate
      })),
      enforcement: {
        version_enforcement_enabled: this.registry.globalSettings.enableVersionEnforcement,
        auto_disable_enabled: this.registry.globalSettings.enableAutoDisable,
        auto_recovery_enabled: this.registry.globalSettings.enableAutoRecovery,
        retention_days: this.registry.globalSettings.retentionDays
      }
    };

    // In production, this would write to the actual plugin_directory.json file
    this.registryLogger.debug(
      'Plugin directory file updated',
      'registry-update',
      {
        pluginCount: pluginDirectory.plugins.length,
        runtimeStatus: pluginDirectory.runtime_status
      }
    );
  }

  /**
   * Phase 13: Auto-recovery mechanism
   */
  private attemptAutoRecovery(): void {
    if (!this.registry.globalSettings.enableAutoRecovery) return;

    const failedPlugins = Object.values(this.registry.plugins)
      .filter(p => p.status === 'failed' && p.autoRecoveryAttempts < p.maxRecoveryAttempts);

    failedPlugins.forEach(plugin => {
      this.scheduleRecoveryAttempt(plugin.id);
    });
  }

  private scheduleRecoveryAttempt(pluginId: string): void {
    if (this.recoveryTimers.has(pluginId)) return;

    const plugin = this.registry.plugins[pluginId];
    if (!plugin) return;

    // Exponential backoff: 5min, 15min, 45min
    const backoffMinutes = Math.pow(3, plugin.autoRecoveryAttempts) * 5;
    const delay = backoffMinutes * 60 * 1000;

    const timer = setTimeout(async () => {
      await this.attemptPluginRecovery(pluginId);
      this.recoveryTimers.delete(pluginId);
    }, delay);

    this.recoveryTimers.set(pluginId, timer);

    this.registryLogger.info(
      `Recovery attempt scheduled for plugin ${pluginId}`,
      'plugin-recovery',
      {
        pluginId,
        attemptNumber: plugin.autoRecoveryAttempts + 1,
        delayMinutes: backoffMinutes
      }
    );
  }

  private async attemptPluginRecovery(pluginId: string): Promise<void> {
    const plugin = this.registry.plugins[pluginId];
    if (!plugin || plugin.status !== 'failed') return;

    plugin.autoRecoveryAttempts++;
    plugin.lastRecoveryAttempt = new Date();

    try {
      // Remove failed instance
      this.pluginInstances.delete(pluginId);

      // Try to reload the plugin
      const newInstance = await this.loadPluginInstance(plugin);
      this.pluginInstances.set(pluginId, newInstance);

      // Reset plugin status
      plugin.status = 'active';
      plugin.enabled = true;
      plugin.failureCount = 0;

      // Restart health check if enabled
      if (plugin.healthCheck?.enabled) {
        this.startHealthCheck(pluginId);
      }

      this.registryLogger.audit(
        `Plugin recovery successful: ${pluginId}`,
        'plugin-recovery',
        {
          pluginId,
          attemptNumber: plugin.autoRecoveryAttempts,
          recoveryTime: new Date()
        },
        {
          tags: ['plugin-recovery', 'auto-recovery-success']
        }
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.registryLogger.warn(
        `Plugin recovery failed: ${pluginId}`,
        'plugin-recovery',
        {
          pluginId,
          attemptNumber: plugin.autoRecoveryAttempts,
          error: errorMessage
        }
      );

      // If max attempts reached, mark as permanently failed
      if (plugin.autoRecoveryAttempts >= plugin.maxRecoveryAttempts) {
        plugin.status = 'failed';
        this.registryLogger.security(
          `Plugin marked as permanently failed: ${pluginId}`,
          'plugin-permanent-failure',
          {
            pluginId,
            totalAttempts: plugin.autoRecoveryAttempts
          },
          {
            tags: ['plugin-permanent-failure', 'security-alert']
          }
        );
      } else {
        // Schedule next recovery attempt
        this.scheduleRecoveryAttempt(pluginId);
      }
    }
  }

  /**
   * Phase 13: Version enforcement with fallback
   */
  private async enforceVersionAndExecute(
    pluginId: string,
    method: string,
    args: any[],
    context: { persona: string; brandAffinity: string[]; session: any; traceId?: string }
  ): Promise<{ success: boolean; result?: any; error?: string; fallbackUsed?: boolean }> {
    const plugin = this.registry.plugins[pluginId];
    if (!plugin) {
      return { success: false, error: `Plugin not found: ${pluginId}` };
    }

    const traceId = context.traceId || this.generateId();

    // Check version enforcement
    if (this.registry.globalSettings.enableVersionEnforcement && plugin.versionEnforcement.enabled) {
      const versionCheck = this.checkVersionRequirement(plugin);
      
      if (!versionCheck.satisfied) {
        if (plugin.versionEnforcement.allowFallback && plugin.versionEnforcement.fallbackVersion) {
          return await this.executeWithFallback(pluginId, method, args, context, traceId, versionCheck.reason || 'Version check failed');
        } else if (plugin.versionEnforcement.strictMode) {
          return { 
            success: false, 
            error: `Version enforcement failed: ${versionCheck.reason}` 
          };
        }
        // Log warning but continue
        this.registryLogger.warn(
          `Version mismatch but continuing: ${pluginId}`,
          'version-enforcement',
          {
            pluginId,
            currentVersion: plugin.version,
            requiredVersion: plugin.versionEnforcement.requiredVersion,
            reason: versionCheck.reason,
            traceId
          }
        );
      }
    }

    // Execute normally
    const startTime = Date.now();
    try {
      const result = await this.callPluginMethod(
        this.pluginInstances.get(pluginId),
        method,
        args
      );

      // Update performance metrics
      this.updatePerformanceMetrics(plugin, Date.now() - startTime, true);

      // Audit log
      this.registryLogger.audit(
        `Plugin execution successful: ${pluginId}.${method}`,
        'plugin-execution',
        {
          pluginId,
          method,
          persona: context.persona,
          brandAffinity: context.brandAffinity,
          executionTime: Date.now() - startTime,
          traceId
        },
        {
          tags: ['plugin-execution', 'audit-compliance'],
          brandAffinity: context.brandAffinity
        }
      );

      return { success: true, result };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Update performance metrics
      this.updatePerformanceMetrics(plugin, Date.now() - startTime, false);

      // Log error
      this.registryLogger.error(
        `Plugin execution failed: ${pluginId}.${method}`,
        'plugin-execution',
        {
          pluginId,
          method,
          error: errorMessage,
          persona: context.persona,
          traceId
        }
      );

      // Try fallback if available and enabled
      if (plugin.versionEnforcement.allowFallback && plugin.versionEnforcement.fallbackVersion) {
        return await this.executeWithFallback(pluginId, method, args, context, traceId, `Execution error: ${errorMessage}`);
      }

      return { success: false, error: errorMessage };
    }
  }

  private checkVersionRequirement(plugin: PluginMetadata): { satisfied: boolean; reason?: string } {
    if (!plugin.versionEnforcement.requiredVersion) {
      return { satisfied: true };
    }

    // Simple version comparison - in production would use semver
    if (plugin.version !== plugin.versionEnforcement.requiredVersion) {
      return {
        satisfied: false,
        reason: `Version mismatch: required ${plugin.versionEnforcement.requiredVersion}, got ${plugin.version}`
      };
    }

    return { satisfied: true };
  }

  private async executeWithFallback(
    pluginId: string,
    method: string,
    args: any[],
    context: any,
    traceId: string,
    reason: string
  ): Promise<{ success: boolean; result?: any; error?: string; fallbackUsed: boolean }> {
    const plugin = this.registry.plugins[pluginId];
    
    // Log fallback event
    const fallbackEvent: PluginFallbackEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      pluginId,
      reason,
      fromVersion: plugin.version,
      toVersion: plugin.versionEnforcement.fallbackVersion,
      success: false, // Will update after attempt
      traceId,
      persona: context.persona,
      brandAffinity: context.brandAffinity
    };

    try {
      // For simulation, we'll just call the same method but mark it as fallback
      const result = await this.callPluginMethod(
        this.pluginInstances.get(pluginId),
        method,
        args
      );

      fallbackEvent.success = true;
      plugin.fallbackCount++;

      this.registryLogger.audit(
        `Plugin fallback execution successful: ${pluginId}`,
        'plugin-fallback',
        {
          fallbackEventId: fallbackEvent.id,
          pluginId,
          method,
          reason,
          traceId
        },
        {
          tags: ['plugin-fallback', 'fallback-success'],
          brandAffinity: context.brandAffinity
        }
      );

      return { success: true, result, fallbackUsed: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.registryLogger.error(
        `Plugin fallback execution failed: ${pluginId}`,
        'plugin-fallback',
        {
          fallbackEventId: fallbackEvent.id,
          pluginId,
          error: errorMessage,
          traceId
        }
      );

      return { success: false, error: errorMessage, fallbackUsed: true };
    } finally {
      this.fallbackEvents.push(fallbackEvent);
    }
  }

  private updatePerformanceMetrics(plugin: PluginMetadata, executionTime: number, success: boolean): void {
    const metrics = plugin.performanceMetrics;
    
    metrics.executionCount++;
    metrics.totalExecutionTime += executionTime;
    metrics.averageExecutionTime = metrics.totalExecutionTime / metrics.executionCount;
    metrics.lastExecutionTime = new Date();

    if (success) {
      metrics.successfulExecutions++;
    } else {
      metrics.failedExecutions++;
    }

    metrics.errorRate = metrics.failedExecutions / metrics.executionCount;
  }

  /**
   * Phase 13: Data cleanup with 90-day retention
   */
  private cleanupOldData(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.registry.globalSettings.retentionDays);

    // Clean old snapshots
    const initialSnapshotCount = this.registrySnapshots.length;
    this.registrySnapshots = this.registrySnapshots.filter(
      snapshot => snapshot.timestamp > cutoffDate
    );

    // Clean old fallback events
    const initialFallbackCount = this.fallbackEvents.length;
    this.fallbackEvents = this.fallbackEvents.filter(
      event => event.timestamp > cutoffDate
    );

    if (initialSnapshotCount > this.registrySnapshots.length || initialFallbackCount > this.fallbackEvents.length) {
      this.registryLogger.info(
        'Old data cleaned up',
        'data-cleanup',
        {
          snapshotsRemoved: initialSnapshotCount - this.registrySnapshots.length,
          fallbackEventsRemoved: initialFallbackCount - this.fallbackEvents.length,
          retentionDays: this.registry.globalSettings.retentionDays
        }
      );
    }
  }

  /**
   * Public API methods
   */
  getPlugin(pluginId: string): PluginMetadata | undefined {
    return this.registry.plugins[pluginId];
  }

  getEnabledPlugins(): PluginMetadata[] {
    return Object.values(this.registry.plugins).filter(p => p.enabled);
  }

  getPluginsByBrand(brandId: string): PluginMetadata[] {
    return Object.values(this.registry.plugins)
      .filter(p => p.brandAffinity.includes(brandId));
  }

  getPluginsByPersona(persona: string): PluginMetadata[] {
    return Object.values(this.registry.plugins)
      .filter(p => p.enabled && (
        p.personaRouting.allowedPersonas.includes('*') ||
        p.personaRouting.allowedPersonas.includes(persona)
      ));
  }

  getRegistryStats(): {
    totalPlugins: number;
    enabledPlugins: number;
    disabledPlugins: number;
    failedPlugins: number;
    healthChecksActive: number;
  } {
    const plugins = Object.values(this.registry.plugins);
    
    return {
      totalPlugins: plugins.length,
      enabledPlugins: plugins.filter(p => p.enabled).length,
      disabledPlugins: plugins.filter(p => !p.enabled).length,
      failedPlugins: plugins.filter(p => p.failureCount > 0).length,
      healthChecksActive: this.healthCheckTimers.size
    };
  }

  /**
   * Phase 13 Public API Methods
   */

  /**
   * Manually enable/disable a plugin with audit logging
   */
  async setPluginEnabled(
    pluginId: string,
    enabled: boolean,
    session: UserSession,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    const plugin = this.registry.plugins[pluginId];
    if (!plugin) {
      return { success: false, error: `Plugin not found: ${pluginId}` };
    }

    const previousStatus = plugin.enabled;
    plugin.enabled = enabled;
    plugin.status = enabled ? 'active' : 'disabled';
    plugin.lastUpdate = new Date();

    // Reset failure count if re-enabling
    if (enabled && !previousStatus) {
      plugin.failureCount = 0;
      plugin.autoRecoveryAttempts = 0;
      
      // Restart health check if configured
      if (plugin.healthCheck?.enabled) {
        this.startHealthCheck(pluginId);
      }
    } else if (!enabled) {
      // Stop health check and remove instance
      this.stopHealthCheck(pluginId);
      this.pluginInstances.delete(pluginId);
    }

    // Audit log
    this.registryLogger.audit(
      `Plugin ${enabled ? 'enabled' : 'disabled'} manually: ${pluginId}`,
      'plugin-manual-toggle',
      {
        pluginId,
        enabled,
        operator: session.userId,
        reason: reason || 'Manual override',
        previousStatus
      },
      {
        tags: ['plugin-manual-control', 'admin-action'],
        brandAffinity: plugin.brandAffinity
      }
    );

    // Create snapshot after manual change
    this.createRegistrySnapshot();

    return { success: true };
  }

  /**
   * Get plugin health and status information
   */
  getPluginHealth(): {
    plugins: Array<{
      id: string;
      name: string;
      version: string;
      status: string;
      enabled: boolean;
      failureCount: number;
      fallbackCount: number;
      autoRecoveryAttempts: number;
      errorRate: number;
      lastExecutionTime?: Date;
      performanceMetrics: PluginPerformanceMetrics;
    }>;
    summary: {
      healthy: number;
      warning: number;
      failed: number;
      totalFallbacks: number;
      totalRecoveryAttempts: number;
    };
  } {
    const plugins = Object.values(this.registry.plugins);
    
    const pluginHealth = plugins.map(plugin => ({
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      status: plugin.status,
      enabled: plugin.enabled,
      failureCount: plugin.failureCount,
      fallbackCount: plugin.fallbackCount,
      autoRecoveryAttempts: plugin.autoRecoveryAttempts,
      errorRate: plugin.performanceMetrics.errorRate,
      lastExecutionTime: plugin.performanceMetrics.lastExecutionTime,
      performanceMetrics: plugin.performanceMetrics
    }));

    const summary = {
      healthy: plugins.filter(p => p.status === 'active' && p.failureCount === 0).length,
      warning: plugins.filter(p => p.status === 'active' && p.failureCount > 0).length,
      failed: plugins.filter(p => p.status === 'failed').length,
      totalFallbacks: plugins.reduce((sum, p) => sum + p.fallbackCount, 0),
      totalRecoveryAttempts: plugins.reduce((sum, p) => sum + p.autoRecoveryAttempts, 0)
    };

    return { plugins: pluginHealth, summary };
  }

  /**
   * Get fallback events with filtering
   */
  getFallbackEvents(options: {
    pluginId?: string;
    timeRange?: { start: Date; end: Date };
    limit?: number;
  } = {}): PluginFallbackEvent[] {
    let events = [...this.fallbackEvents];

    if (options.pluginId) {
      events = events.filter(e => e.pluginId === options.pluginId);
    }

    if (options.timeRange) {
      events = events.filter(e => 
        e.timestamp >= options.timeRange!.start && 
        e.timestamp <= options.timeRange!.end
      );
    }

    // Sort by timestamp (newest first)
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options.limit) {
      events = events.slice(0, options.limit);
    }

    return events;
  }

  /**
   * Get registry snapshots
   */
  getRegistrySnapshots(limit?: number): PluginRegistrySnapshot[] {
    const snapshots = [...this.registrySnapshots];
    snapshots.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return limit ? snapshots.slice(0, limit) : snapshots;
  }

  /**
   * Force create a registry snapshot
   */
  createSnapshot(): PluginRegistrySnapshot {
    return this.createRegistrySnapshot();
  }

  /**
   * Get comprehensive plugin metrics for dashboard
   */
  getPluginMetrics(): {
    overview: {
      totalPlugins: number;
      enabledPlugins: number;
      healthyPlugins: number;
      failedPlugins: number;
      totalExecutions: number;
      totalFallbacks: number;
      averageErrorRate: number;
    };
    plugins: Array<{
      id: string;
      name: string;
      version: string;
      brand: string;
      persona: string;
      status: string;
      enabled: boolean;
      health: 'healthy' | 'warning' | 'failed';
      failureCount: number;
      fallbackCount: number;
      errorRate: number;
      executionCount: number;
      avgExecutionTime: number;
      lastActivity?: Date;
    }>;
    recentEvents: {
      failures: Array<{ pluginId: string; timestamp: Date; error: string }>;
      fallbacks: PluginFallbackEvent[];
      recoveries: Array<{ pluginId: string; timestamp: Date; success: boolean }>;
    };
  } {
    const plugins = Object.values(this.registry.plugins);
    
    const overview = {
      totalPlugins: plugins.length,
      enabledPlugins: plugins.filter(p => p.enabled).length,
      healthyPlugins: plugins.filter(p => p.status === 'active' && p.failureCount === 0).length,
      failedPlugins: plugins.filter(p => p.status === 'failed').length,
      totalExecutions: plugins.reduce((sum, p) => sum + p.performanceMetrics.executionCount, 0),
      totalFallbacks: plugins.reduce((sum, p) => sum + p.fallbackCount, 0),
      averageErrorRate: plugins.reduce((sum, p) => sum + p.performanceMetrics.errorRate, 0) / (plugins.length || 1)
    };

    const pluginMetrics = plugins.map(plugin => ({
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      brand: plugin.brandAffinity[0] || 'JRVI',
      persona: plugin.personaRouting.defaultPersona,
      status: plugin.status,
      enabled: plugin.enabled,
      health: (plugin.status === 'active' && plugin.failureCount === 0) ? 'healthy' as const :
              (plugin.status === 'active' && plugin.failureCount > 0) ? 'warning' as const : 'failed' as const,
      failureCount: plugin.failureCount,
      fallbackCount: plugin.fallbackCount,
      errorRate: plugin.performanceMetrics.errorRate,
      executionCount: plugin.performanceMetrics.executionCount,
      avgExecutionTime: plugin.performanceMetrics.averageExecutionTime,
      lastActivity: plugin.performanceMetrics.lastExecutionTime || plugin.lastUpdate
    }));

    const recentEvents = {
      failures: [], // Would be populated from failure logs
      fallbacks: this.getFallbackEvents({ limit: 10 }),
      recoveries: [] // Would be populated from recovery logs
    };

    return { overview, plugins: pluginMetrics, recentEvents };
  }

  /**
   * Export current plugin directory for external use
   */
  exportPluginDirectory(): string {
    this.updatePluginDirectoryFile();
    
    return JSON.stringify({
      version: this.registry.version,
      lastUpdated: new Date().toISOString(),
      description: "JRVI Plugin Directory - Runtime-generated registry",
      plugins: Object.values(this.registry.plugins).map(plugin => ({
        id: plugin.id,
        name: plugin.name,
        version: plugin.version,
        status: plugin.status,
        persona: plugin.personaRouting.defaultPersona,
        brand: plugin.brandAffinity[0] || 'JRVI',
        enabled: plugin.enabled,
        failureCount: plugin.failureCount,
        fallbackCount: plugin.fallbackCount
      })),
      metrics: this.getPluginMetrics().overview
    }, null, 2);
  }
}

// Singleton instance
export const pluginRegistry = new EnhancedPluginRegistry();

export default pluginRegistry;