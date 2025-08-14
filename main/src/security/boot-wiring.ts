/**
 * Boot Wiring - System initialization with vault integrity checks and security setup
 * Integrates vault validation, intrusion logging, and dashboard alerts
 */

import { logger } from '../utils/logging';
import { securityKeyVault, VaultStatus } from './security_key-vault';
import { intrusionLogger } from './security_defense_intrusion-logger';
import { securityMiddleware } from './middleware';

export interface BootConfig {
  enableVaultChecks: boolean;
  enableIntrusionLogging: boolean;
  enableDashboardAlerts: boolean;
  bootTimeout: number; // seconds
  criticalFailureHandling: 'continue' | 'halt' | 'safe_mode';
}

export interface BootStatus {
  success: boolean;
  startTime: Date;
  endTime: Date;
  duration: number; // milliseconds
  vaultStatus: VaultStatus;
  securitySystemsOnline: boolean;
  alertsTriggered: string[];
  errors: string[];
  warnings: string[];
}

export interface DashboardAlert {
  id: string;
  type: 'vault_integrity' | 'boot_failure' | 'security_warning' | 'system_error';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  source: string;
  details?: any;
}

class BootWiring {
  private config: BootConfig;
  private bootLogger = logger.createChildLogger('boot-wiring');
  private dashboardAlerts: DashboardAlert[] = [];
  private alertCallbacks: ((alert: DashboardAlert) => void)[] = [];
  private bootStatus: BootStatus | null = null;

  constructor(config: Partial<BootConfig> = {}) {
    this.config = {
      enableVaultChecks: true,
      enableIntrusionLogging: true,
      enableDashboardAlerts: true,
      bootTimeout: 30,
      criticalFailureHandling: 'safe_mode',
      ...config
    };
  }

  /**
   * Main boot sequence with comprehensive security checks
   */
  async initializeSystem(): Promise<BootStatus> {
    const startTime = new Date();
    this.bootLogger.info('Starting JRVI system boot sequence', 'system-boot');

    const bootStatus: BootStatus = {
      success: false,
      startTime,
      endTime: new Date(),
      duration: 0,
      vaultStatus: {
        isValid: false,
        entriesCount: 0,
        lastIntegrityCheck: new Date(),
        corruptedEntries: [],
        alertTriggered: false,
        errors: []
      },
      securitySystemsOnline: false,
      alertsTriggered: [],
      errors: [],
      warnings: []
    };

    try {
      // Set boot timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Boot timeout exceeded')), this.config.bootTimeout * 1000);
      });

      // Run boot sequence with timeout
      await Promise.race([
        this.runBootSequence(bootStatus),
        timeoutPromise
      ]);

      bootStatus.success = true;
      this.bootLogger.info('JRVI system boot completed successfully', 'system-boot', {
        duration: bootStatus.duration,
        vaultStatus: bootStatus.vaultStatus.isValid,
        securityOnline: bootStatus.securitySystemsOnline
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      bootStatus.errors.push(errorMessage);
      
      this.bootLogger.error(`System boot failed: ${errorMessage}`, 'system-boot', {
        error: errorMessage,
        duration: Date.now() - startTime.getTime()
      });

      // Handle critical failure
      await this.handleCriticalFailure(bootStatus, errorMessage);

    } finally {
      bootStatus.endTime = new Date();
      bootStatus.duration = bootStatus.endTime.getTime() - startTime.getTime();
      this.bootStatus = bootStatus;

      // Log final boot status
      await this.logBootCompletion(bootStatus);
    }

    return bootStatus;
  }

  /**
   * Execute the main boot sequence
   */
  private async runBootSequence(bootStatus: BootStatus): Promise<void> {
    // Phase 1: Initialize intrusion logging
    if (this.config.enableIntrusionLogging) {
      await this.initializeIntrusionLogging(bootStatus);
    }

    // Phase 2: Perform vault integrity checks
    if (this.config.enableVaultChecks) {
      await this.performVaultIntegrityChecks(bootStatus);
    }

    // Phase 3: Initialize security middleware
    await this.initializeSecuritySystems(bootStatus);

    // Phase 4: Setup dashboard alerts
    if (this.config.enableDashboardAlerts) {
      await this.setupDashboardAlerts(bootStatus);
    }

    // Phase 5: Register security event handlers
    await this.registerSecurityHandlers(bootStatus);

    // Phase 6: Final security validation
    await this.finalSecurityValidation(bootStatus);
  }

  /**
   * Initialize intrusion logging system
   */
  private async initializeIntrusionLogging(bootStatus: BootStatus): Promise<void> {
    try {
      this.bootLogger.info('Initializing intrusion logging system', 'boot-intrusion-logging');

      // Register boot event
      await intrusionLogger.logIntrusion({
        type: 'suspicious_activity',
        severity: 'low',
        source: { ip: 'system', userAgent: 'JRVI-Boot' },
        target: { endpoint: 'system_boot', operation: 'initialization' },
        details: {
          description: 'System boot sequence initiated',
          patterns: ['system_startup']
        },
        response: { action: 'logged', success: true },
        context: { requestId: 'boot-' + Date.now() }
      });

      // Register alert handler
      intrusionLogger.onIntrusionAlert(async (events, stats) => {
        await this.triggerDashboardAlert({
          type: 'security_warning',
          severity: 'warning',
          title: 'Intrusion Activity Detected',
          message: `${events.length} security events detected. ${stats.last24Hours} events in last 24 hours.`,
          source: 'intrusion-logger',
          details: { events: events.slice(0, 5), stats }
        });
      });

      this.bootLogger.info('Intrusion logging system initialized', 'boot-intrusion-logging');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      bootStatus.warnings.push(`Intrusion logging initialization warning: ${errorMessage}`);
      this.bootLogger.warn(`Intrusion logging setup warning: ${errorMessage}`, 'boot-intrusion-logging');
    }
  }

  /**
   * Perform vault integrity checks during boot
   */
  private async performVaultIntegrityChecks(bootStatus: BootStatus): Promise<void> {
    try {
      this.bootLogger.info('Starting vault integrity checks', 'boot-vault-check');

      // Perform boot-time vault validation
      const vaultStatus = await securityKeyVault.bootTimeValidation();
      bootStatus.vaultStatus = vaultStatus;

      if (!vaultStatus.isValid) {
        const alertMessage = `Vault integrity check failed: ${vaultStatus.corruptedEntries.length} corrupted entries, ${vaultStatus.errors.length} errors`;
        
        bootStatus.errors.push(alertMessage);
        
        // Trigger critical dashboard alert
        await this.triggerDashboardAlert({
          type: 'vault_integrity',
          severity: 'critical',
          title: 'Vault Integrity Failure',
          message: alertMessage,
          source: 'vault-check',
          details: vaultStatus
        });

        // Log intrusion event for vault breach
        await intrusionLogger.logVaultBreach(
          'system',
          'integrity_check',
          'boot-sequence',
          'system'
        );

        if (this.config.criticalFailureHandling === 'halt') {
          throw new Error('Vault integrity check failed - halting boot sequence');
        } else if (this.config.criticalFailureHandling === 'safe_mode') {
          bootStatus.warnings.push('System entering safe mode due to vault integrity failure');
          this.bootLogger.warn('Entering safe mode due to vault failure', 'boot-vault-check');
        }

      } else {
        this.bootLogger.info(`Vault integrity check passed: ${vaultStatus.entriesCount} entries verified`, 'boot-vault-check');
      }

      // Register vault alert handler
      securityKeyVault.onVaultIntegrityAlert(async (status) => {
        await this.triggerDashboardAlert({
          type: 'vault_integrity',
          severity: 'critical',
          title: 'Vault Integrity Alert',
          message: `Vault integrity compromised: ${status.corruptedEntries.length} corrupted entries`,
          source: 'vault-monitor',
          details: status
        });
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      bootStatus.errors.push(`Vault check failed: ${errorMessage}`);
      this.bootLogger.error(`Vault integrity check failed: ${errorMessage}`, 'boot-vault-check');
      throw error;
    }
  }

  /**
   * Initialize security middleware systems
   */
  private async initializeSecuritySystems(bootStatus: BootStatus): Promise<void> {
    try {
      this.bootLogger.info('Initializing security middleware systems', 'boot-security');

      // Get security middleware stats to verify it's working
      const securityStats = securityMiddleware.getSecurityStats();
      
      bootStatus.securitySystemsOnline = true;
      
      this.bootLogger.info('Security middleware systems online', 'boot-security', {
        activeSessions: securityStats.activeSessions,
        restrictedOperations: securityStats.restrictedOperations,
        nsfwKeywords: securityStats.nsfwKeywords
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      bootStatus.errors.push(`Security system initialization failed: ${errorMessage}`);
      bootStatus.securitySystemsOnline = false;
      
      this.bootLogger.error(`Security system initialization failed: ${errorMessage}`, 'boot-security');
      
      // This is critical - security systems must be online
      throw error;
    }
  }

  /**
   * Setup dashboard alert system
   */
  private async setupDashboardAlerts(bootStatus: BootStatus): Promise<void> {
    try {
      this.bootLogger.info('Setting up dashboard alert system', 'boot-alerts');

      // Create initial system status alert
      await this.triggerDashboardAlert({
        type: 'system_error',
        severity: 'info',
        title: 'System Boot Complete',
        message: 'JRVI system has completed boot sequence and security checks',
        source: 'boot-sequence',
        details: {
          bootTime: new Date(),
          vaultStatus: bootStatus.vaultStatus.isValid,
          securityOnline: bootStatus.securitySystemsOnline
        }
      });

      this.bootLogger.info('Dashboard alert system ready', 'boot-alerts');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      bootStatus.warnings.push(`Dashboard alert setup warning: ${errorMessage}`);
      this.bootLogger.warn(`Dashboard alert setup warning: ${errorMessage}`, 'boot-alerts');
    }
  }

  /**
   * Register security event handlers
   */
  private async registerSecurityHandlers(bootStatus: BootStatus): Promise<void> {
    try {
      this.bootLogger.info('Registering security event handlers', 'boot-handlers');

      // Register system shutdown handler
      process.on('SIGTERM', async () => {
        this.bootLogger.info('Received SIGTERM, initiating graceful shutdown', 'system-shutdown');
        await this.gracefulShutdown();
      });

      process.on('SIGINT', async () => {
        this.bootLogger.info('Received SIGINT, initiating graceful shutdown', 'system-shutdown');
        await this.gracefulShutdown();
      });

      // Register uncaught exception handler
      process.on('uncaughtException', async (error) => {
        this.bootLogger.error(`Uncaught exception: ${error.message}`, 'system-error', {
          error: error.message,
          stack: error.stack
        });

        await this.triggerDashboardAlert({
          type: 'system_error',
          severity: 'critical',
          title: 'Uncaught Exception',
          message: `Critical system error: ${error.message}`,
          source: 'system-monitor',
          details: { error: error.message, stack: error.stack }
        });

        // Log as intrusion event
        await intrusionLogger.logIntrusion({
          type: 'suspicious_activity',
          severity: 'critical',
          source: { ip: 'system' },
          target: { endpoint: 'system', operation: 'uncaught_exception' },
          details: {
            description: `Uncaught exception: ${error.message}`,
            payload: { stack: error.stack }
          },
          response: { action: 'logged', success: true },
          context: {}
        });
      });

      this.bootLogger.info('Security event handlers registered', 'boot-handlers');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      bootStatus.warnings.push(`Security handler registration warning: ${errorMessage}`);
      this.bootLogger.warn(`Security handler registration warning: ${errorMessage}`, 'boot-handlers');
    }
  }

  /**
   * Final security validation
   */
  private async finalSecurityValidation(bootStatus: BootStatus): Promise<void> {
    try {
      this.bootLogger.info('Performing final security validation', 'boot-validation');

      // Validate all security systems are responsive
      const checks = [
        { name: 'vault', test: () => securityKeyVault.getVaultStats() },
        { name: 'intrusion-logger', test: () => intrusionLogger.getIntrusionStats() },
        { name: 'security-middleware', test: () => securityMiddleware.getSecurityStats() }
      ];

      for (const check of checks) {
        try {
          const result = check.test();
          this.bootLogger.info(`Security component ${check.name} validation passed`, 'boot-validation');
        } catch (error) {
          throw new Error(`Security component ${check.name} validation failed: ${error}`);
        }
      }

      this.bootLogger.info('Final security validation completed', 'boot-validation');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      bootStatus.errors.push(`Final security validation failed: ${errorMessage}`);
      this.bootLogger.error(`Final security validation failed: ${errorMessage}`, 'boot-validation');
      throw error;
    }
  }

  /**
   * Handle critical boot failure
   */
  private async handleCriticalFailure(bootStatus: BootStatus, error: string): Promise<void> {
    try {
      this.bootLogger.error(`Critical boot failure: ${error}`, 'boot-failure');

      // Trigger critical alert
      await this.triggerDashboardAlert({
        type: 'boot_failure',
        severity: 'critical',
        title: 'System Boot Failure',
        message: `Critical boot failure: ${error}`,
        source: 'boot-sequence',
        details: { error, bootStatus }
      });

      // Log intrusion event
      if (this.config.enableIntrusionLogging) {
        await intrusionLogger.logIntrusion({
          type: 'suspicious_activity',
          severity: 'critical',
          source: { ip: 'system' },
          target: { endpoint: 'system_boot', operation: 'boot_failure' },
          details: {
            description: `System boot failure: ${error}`,
            payload: { bootStatus }
          },
          response: { action: 'logged', success: true },
          context: {}
        });
      }

    } catch (alertError) {
      this.bootLogger.error(
        `Failed to handle critical failure alert: ${alertError instanceof Error ? alertError.message : String(alertError)}`,
        'boot-failure'
      );
    }
  }

  /**
   * Trigger dashboard alert
   */
  async triggerDashboardAlert(alertData: Omit<DashboardAlert, 'id' | 'timestamp' | 'acknowledged'>): Promise<string> {
    const alert: DashboardAlert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      acknowledged: false,
      ...alertData
    };

    this.dashboardAlerts.push(alert);
    bootStatus?.alertsTriggered.push(alert.id);

    this.bootLogger.audit(
      `Dashboard alert triggered: ${alert.title}`,
      'dashboard-alert',
      {
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity,
        source: alert.source
      },
      {
        tags: ['dashboard-alert', `severity-${alert.severity}`, `type-${alert.type}`]
      }
    );

    // Notify alert callbacks
    for (const callback of this.alertCallbacks) {
      try {
        callback(alert);
      } catch (error) {
        this.bootLogger.error(
          `Alert callback failed: ${error instanceof Error ? error.message : String(error)}`,
          'dashboard-alert'
        );
      }
    }

    return alert.id;
  }

  /**
   * Register dashboard alert callback
   */
  onDashboardAlert(callback: (alert: DashboardAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Get current dashboard alerts
   */
  getDashboardAlerts(acknowledged?: boolean): DashboardAlert[] {
    if (acknowledged !== undefined) {
      return this.dashboardAlerts.filter(alert => alert.acknowledged === acknowledged);
    }
    return [...this.dashboardAlerts];
  }

  /**
   * Acknowledge dashboard alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.dashboardAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.bootLogger.audit(`Dashboard alert acknowledged: ${alertId}`, 'dashboard-alert');
      return true;
    }
    return false;
  }

  /**
   * Get current boot status
   */
  getBootStatus(): BootStatus | null {
    return this.bootStatus;
  }

  /**
   * Log boot completion
   */
  private async logBootCompletion(bootStatus: BootStatus): Promise<void> {
    const logLevel = bootStatus.success ? 'info' : 'error';
    const message = bootStatus.success 
      ? `Boot sequence completed in ${bootStatus.duration}ms`
      : `Boot sequence failed after ${bootStatus.duration}ms`;

    this.bootLogger[logLevel](message, 'boot-completion', {
      success: bootStatus.success,
      duration: bootStatus.duration,
      vaultValid: bootStatus.vaultStatus.isValid,
      securityOnline: bootStatus.securitySystemsOnline,
      alertsTriggered: bootStatus.alertsTriggered.length,
      errors: bootStatus.errors.length,
      warnings: bootStatus.warnings.length
    });
  }

  /**
   * Graceful shutdown
   */
  private async gracefulShutdown(): Promise<void> {
    try {
      this.bootLogger.info('Starting graceful shutdown', 'system-shutdown');

      // Shutdown vault
      await securityKeyVault.shutdown();

      // Log shutdown event
      await intrusionLogger.logIntrusion({
        type: 'suspicious_activity',
        severity: 'low',
        source: { ip: 'system' },
        target: { endpoint: 'system_shutdown', operation: 'graceful_shutdown' },
        details: {
          description: 'System graceful shutdown initiated'
        },
        response: { action: 'logged', success: true },
        context: {}
      });

      this.bootLogger.info('Graceful shutdown completed', 'system-shutdown');

    } catch (error) {
      this.bootLogger.error(
        `Graceful shutdown error: ${error instanceof Error ? error.message : String(error)}`,
        'system-shutdown'
      );
    } finally {
      process.exit(0);
    }
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }
}

// Singleton instance
export const bootWiring = new BootWiring();

export default bootWiring;