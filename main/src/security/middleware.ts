/**
 * Security Middleware - IAM, NSFW gating, and swap restrictions
 * Implements comprehensive security controls for JRVI system
 */

import { logger } from '../utils/logging';
import { strategyKernel, createOperationRequest, OperationType, Priority } from '../kernel/strategy';
import { securityEnforcement } from './enforcement';
import { forkRecovery } from './forkRecovery';

export interface SecurityConfig {
  enableIAM: boolean;
  enableNSFWFilter: boolean;
  enableSwapRestrictions: boolean;
  maxSessionDuration: number; // in minutes
  maxFailedAttempts: number;
  lockoutDuration: number; // in minutes
  requiredPermissions: string[];
}

export interface UserSession {
  id: string;
  userId: string;
  brandAffinity: string[];
  permissions: string[];
  startTime: Date;
  lastActivity: Date;
  isAuthenticated: boolean;
  failedAttempts: number;
  isLocked: boolean;
  lockoutExpires?: Date;
}

export interface SecurityContext {
  session: UserSession;
  requestId: string;
  origin: string;
  operation: string;
  target: string;
  brandAffinity: string[];
}

export enum SecurityLevel {
  PUBLIC = 'public',
  AUTHENTICATED = 'authenticated',
  PRIVILEGED = 'privileged',
  ADMIN = 'admin',
  SYSTEM = 'system'
}

export enum NSFWClassification {
  SAFE = 'safe',
  QUESTIONABLE = 'questionable',
  EXPLICIT = 'explicit',
  BLOCKED = 'blocked'
}

export interface SecurityResult {
  allowed: boolean;
  reason?: string;
  requiredLevel?: SecurityLevel;
  requiredPermissions?: string[];
  nsfwRating?: NSFWClassification;
  auditLogId: string;
}

class SecurityMiddleware {
  private config: SecurityConfig;
  private sessions: Map<string, UserSession> = new Map();
  private nsfwKeywords: Set<string> = new Set();
  private restrictedOperations: Map<string, SecurityLevel> = new Map();
  private securityLogger = logger.createChildLogger('security-middleware');

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      enableIAM: true,
      enableNSFWFilter: true,
      enableSwapRestrictions: true,
      maxSessionDuration: 480, // 8 hours
      maxFailedAttempts: 5,
      lockoutDuration: 30,
      requiredPermissions: ['read', 'write'],
      ...config
    };

    this.initializeNSFWKeywords();
    this.initializeOperationRestrictions();
    this.startSessionCleanup();

    this.securityLogger.info('Security middleware initialized', 'security-init', {
      config: this.config
    }, {
      tags: ['security-init', 'system-startup']
    });
  }

  /**
   * Main security check method
   */
  async checkSecurity(context: SecurityContext): Promise<SecurityResult> {
    const auditLogId = this.generateId();
    
    try {
      // Port scan detection
      if (context.origin && context.origin !== 'system') {
        const portScanDetection = await securityEnforcement.detectPortScan(
          context.origin, 
          [80, 443, 22, 3000, 8080], // Common ports to monitor
          10000 // 10 second window
        );
        
        if (portScanDetection) {
          await securityEnforcement.processSecurityEvent(
            context,
            { allowed: false, auditLogId, reason: 'Port scan detected' },
            'intrusion_detected'
          );
        }
      }

      // Intrusion pattern analysis
      const intrusions = await securityEnforcement.analyzeIntrusionPatterns(
        context, 
        context.target
      );
      
      if (intrusions.length > 0) {
        await securityEnforcement.processSecurityEvent(
          context,
          { allowed: false, auditLogId, reason: 'Intrusion patterns detected' },
          'intrusion_detected'
        );
      }

      // Log security check
      this.securityLogger.audit(
        `Security check: ${context.operation} on ${context.target}`,
        context.origin,
        {
          requestId: context.requestId,
          operation: context.operation,
          target: context.target,
          userId: context.session.userId,
          brandAffinity: context.brandAffinity,
          intrusionsDetected: intrusions.length
        },
        {
          tags: ['security-check'],
          brandAffinity: context.brandAffinity
        }
      );

      // 1. IAM Check
      if (this.config.enableIAM) {
        const iamResult = await this.checkIAM(context);
        if (!iamResult.allowed) {
          this.securityLogger.security(
            `IAM check failed: ${iamResult.reason}`,
            context.origin,
            {
              requestId: context.requestId,
              userId: context.session.userId,
              operation: context.operation
            }
          );

          // Process security event for access denial
          await securityEnforcement.processSecurityEvent(
            context,
            iamResult,
            'access_denied'
          );

          return { ...iamResult, auditLogId };
        }
      }

      // 2. NSFW Filter
      if (this.config.enableNSFWFilter) {
        const nsfwResult = await this.checkNSFW(context);
        if (!nsfwResult.allowed) {
          this.securityLogger.security(
            `NSFW filter blocked content: ${nsfwResult.reason}`,
            context.origin,
            {
              requestId: context.requestId,
              nsfwRating: nsfwResult.nsfwRating
            }
          );

          // Process security event for policy violation
          await securityEnforcement.processSecurityEvent(
            context,
            nsfwResult,
            'policy_violation'
          );

          return { ...nsfwResult, auditLogId };
        }
      }

      // 3. Swap Restrictions
      if (this.config.enableSwapRestrictions) {
        const swapResult = await this.checkSwapRestrictions(context);
        if (!swapResult.allowed) {
          this.securityLogger.security(
            `Swap restriction blocked operation: ${swapResult.reason}`,
            context.origin,
            {
              requestId: context.requestId,
              operation: context.operation,
              brandAffinity: context.brandAffinity
            }
          );

          // Process security event for suspicious activity
          await securityEnforcement.processSecurityEvent(
            context,
            swapResult,
            'suspicious_activity'
          );

          return { ...swapResult, auditLogId };
        }
      }

      // Update session activity
      this.updateSessionActivity(context.session.id);

      this.securityLogger.info(
        `Security check passed`,
        context.origin,
        {
          requestId: context.requestId,
          operation: context.operation,
          userId: context.session.userId
        }
      );

      return {
        allowed: true,
        auditLogId
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.securityLogger.error(
        `Security check error: ${errorMessage}`,
        context.origin,
        {
          requestId: context.requestId,
          error: errorMessage
        }
      );

      // Trigger failover on critical security errors
      if (errorMessage.includes('critical') || errorMessage.includes('kernel')) {
        try {
          await forkRecovery.handleKernelError(
            error instanceof Error ? error : new Error(errorMessage),
            { context, operation: 'security_check' }
          );
        } catch (failoverError) {
          this.securityLogger.error(
            `Failover also failed: ${failoverError instanceof Error ? failoverError.message : String(failoverError)}`,
            'security-failover'
          );
        }
      }

      return {
        allowed: false,
        reason: 'Security check failed due to internal error',
        auditLogId
      };
    }
  }

  /**
   * IAM (Identity and Access Management) check
   */
  private async checkIAM(context: SecurityContext): Promise<SecurityResult> {
    const { session, operation, target } = context;

    // Check if session is valid
    if (!session.isAuthenticated) {
      return {
        allowed: false,
        reason: 'User not authenticated',
        requiredLevel: SecurityLevel.AUTHENTICATED,
        auditLogId: ''
      };
    }

    // Check if session is locked
    if (session.isLocked) {
      if (session.lockoutExpires && new Date() < session.lockoutExpires) {
        return {
          allowed: false,
          reason: 'Account is locked due to security violations',
          auditLogId: ''
        };
      } else {
        // Unlock expired lockout
        session.isLocked = false;
        session.lockoutExpires = undefined;
        session.failedAttempts = 0;
      }
    }

    // Check session expiry
    const sessionAge = Date.now() - session.startTime.getTime();
    const maxAge = this.config.maxSessionDuration * 60 * 1000;
    
    if (sessionAge > maxAge) {
      this.invalidateSession(session.id);
      return {
        allowed: false,
        reason: 'Session expired',
        requiredLevel: SecurityLevel.AUTHENTICATED,
        auditLogId: ''
      };
    }

    // Check operation-specific permissions
    const requiredLevel = this.restrictedOperations.get(operation);
    if (requiredLevel) {
      const hasPermission = this.hasRequiredSecurityLevel(session, requiredLevel);
      if (!hasPermission) {
        return {
          allowed: false,
          reason: `Insufficient security level for operation: ${operation}`,
          requiredLevel,
          auditLogId: ''
        };
      }
    }

    // Check specific permissions
    const requiredPermissions = this.getRequiredPermissions(operation, target);
    const missingPermissions = requiredPermissions.filter(
      perm => !session.permissions.includes(perm)
    );

    if (missingPermissions.length > 0) {
      return {
        allowed: false,
        reason: 'Missing required permissions',
        requiredPermissions: missingPermissions,
        auditLogId: ''
      };
    }

    return { allowed: true, auditLogId: '' };
  }

  /**
   * NSFW content filter
   */
  private async checkNSFW(context: SecurityContext): Promise<SecurityResult> {
    // For now, check against keyword list
    // In production, this would use ML-based content classification
    const contentToCheck = `${context.operation} ${context.target}`.toLowerCase();
    
    let nsfwRating = NSFWClassification.SAFE;
    const foundKeywords: string[] = [];

    for (const keyword of this.nsfwKeywords) {
      if (contentToCheck.includes(keyword)) {
        foundKeywords.push(keyword);
        nsfwRating = NSFWClassification.EXPLICIT;
      }
    }

    if (nsfwRating === NSFWClassification.EXPLICIT) {
      return {
        allowed: false,
        reason: 'Content blocked by NSFW filter',
        nsfwRating,
        auditLogId: ''
      };
    }

    return { 
      allowed: true, 
      nsfwRating,
      auditLogId: '' 
    };
  }

  /**
   * Brand swap restrictions
   */
  private async checkSwapRestrictions(context: SecurityContext): Promise<SecurityResult> {
    const { session, operation, brandAffinity } = context;

    // Check if user is trying to switch brands too frequently
    if (operation === 'brand_switch') {
      // For now, allow brand switches but log them
      this.securityLogger.audit(
        `Brand switch attempted`,
        context.origin,
        {
          userId: session.userId,
          fromBrands: session.brandAffinity,
          toBrands: brandAffinity,
          requestId: context.requestId
        },
        {
          tags: ['brand-switch', 'security-check']
        }
      );
    }

    // Check brand-specific restrictions
    const hasRestrictedBrand = brandAffinity.some(brand => 
      this.isRestrictedBrand(brand, session)
    );

    if (hasRestrictedBrand) {
      return {
        allowed: false,
        reason: 'Access to restricted brand not allowed',
        auditLogId: ''
      };
    }

    return { allowed: true, auditLogId: '' };
  }

  /**
   * Session management
   */
  createSession(userId: string, brandAffinity: string[], permissions: string[]): UserSession {
    const session: UserSession = {
      id: this.generateId(),
      userId,
      brandAffinity,
      permissions,
      startTime: new Date(),
      lastActivity: new Date(),
      isAuthenticated: true,
      failedAttempts: 0,
      isLocked: false
    };

    this.sessions.set(session.id, session);

    this.securityLogger.audit(
      `Session created for user: ${userId}`,
      'session-manager',
      {
        sessionId: session.id,
        userId,
        brandAffinity,
        permissions
      },
      {
        tags: ['session-creation', 'user-authentication']
      }
    );

    return session;
  }

  getSession(sessionId: string): UserSession | undefined {
    return this.sessions.get(sessionId);
  }

  invalidateSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.delete(sessionId);
      
      this.securityLogger.audit(
        `Session invalidated: ${sessionId}`,
        'session-manager',
        {
          sessionId,
          userId: session.userId
        },
        {
          tags: ['session-invalidation']
        }
      );
    }
  }

  updateSessionActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  lockSession(sessionId: string, reason: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isLocked = true;
      session.lockoutExpires = new Date(Date.now() + this.config.lockoutDuration * 60 * 1000);
      
      this.securityLogger.security(
        `Session locked: ${reason}`,
        'session-manager',
        {
          sessionId,
          userId: session.userId,
          reason,
          lockoutExpires: session.lockoutExpires
        },
        {
          tags: ['session-lockout', 'security-violation']
        }
      );
    }
  }

  /**
   * Helper methods
   */
  private hasRequiredSecurityLevel(session: UserSession, requiredLevel: SecurityLevel): boolean {
    // Simplified security level check
    const userLevel = this.getUserSecurityLevel(session);
    const levels = [
      SecurityLevel.PUBLIC,
      SecurityLevel.AUTHENTICATED,
      SecurityLevel.PRIVILEGED,
      SecurityLevel.ADMIN,
      SecurityLevel.SYSTEM
    ];

    const userLevelIndex = levels.indexOf(userLevel);
    const requiredLevelIndex = levels.indexOf(requiredLevel);

    return userLevelIndex >= requiredLevelIndex;
  }

  private getUserSecurityLevel(session: UserSession): SecurityLevel {
    if (session.permissions.includes('admin')) return SecurityLevel.ADMIN;
    if (session.permissions.includes('privileged')) return SecurityLevel.PRIVILEGED;
    if (session.isAuthenticated) return SecurityLevel.AUTHENTICATED;
    return SecurityLevel.PUBLIC;
  }

  private getRequiredPermissions(operation: string, target: string): string[] {
    // Return operation-specific required permissions
    const operationPermissions: Record<string, string[]> = {
      'memory_create': ['write', 'memory_write'],
      'memory_update': ['write', 'memory_write'],
      'memory_delete': ['write', 'memory_write', 'memory_delete'],
      'plugin_install': ['admin', 'plugin_admin'],
      'plugin_update': ['admin', 'plugin_admin'],
      'brand_switch': ['brand_access'],
      'security_change': ['admin', 'security_admin']
    };

    return operationPermissions[operation] || ['read'];
  }

  private isRestrictedBrand(brand: string, session: UserSession): boolean {
    // Define brand access restrictions
    const restrictedBrands = ['ADMIN', 'SYSTEM'];
    return restrictedBrands.includes(brand) && !session.permissions.includes('admin');
  }

  private initializeNSFWKeywords(): void {
    // Basic NSFW keyword list - in production this would be more comprehensive
    const keywords = [
      'explicit', 'nsfw', 'adult', 'sexual', 'inappropriate',
      'violence', 'hate', 'discrimination', 'illegal'
    ];

    keywords.forEach(keyword => this.nsfwKeywords.add(keyword));
  }

  private initializeOperationRestrictions(): void {
    this.restrictedOperations.set('plugin_install', SecurityLevel.ADMIN);
    this.restrictedOperations.set('plugin_update', SecurityLevel.ADMIN);
    this.restrictedOperations.set('security_change', SecurityLevel.ADMIN);
    this.restrictedOperations.set('memory_delete', SecurityLevel.PRIVILEGED);
    this.restrictedOperations.set('brand_switch', SecurityLevel.AUTHENTICATED);
  }

  private startSessionCleanup(): void {
    setInterval(() => {
      const now = new Date();
      const expiredSessions: string[] = [];

      for (const [sessionId, session] of this.sessions.entries()) {
        const sessionAge = now.getTime() - session.lastActivity.getTime();
        const maxAge = this.config.maxSessionDuration * 60 * 1000;

        if (sessionAge > maxAge) {
          expiredSessions.push(sessionId);
        }
      }

      expiredSessions.forEach(sessionId => {
        this.invalidateSession(sessionId);
      });

      if (expiredSessions.length > 0) {
        this.securityLogger.info(
          `Cleaned up ${expiredSessions.length} expired sessions`,
          'session-cleanup'
        );
      }
    }, 60000); // Check every minute
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Public management methods
   */
  getSecurityStats(): {
    activeSessions: number;
    lockedSessions: number;
    totalSessions: number;
    nsfwKeywords: number;
    restrictedOperations: number;
  } {
    const activeSessions = Array.from(this.sessions.values())
      .filter(s => s.isAuthenticated && !s.isLocked).length;
    
    const lockedSessions = Array.from(this.sessions.values())
      .filter(s => s.isLocked).length;

    return {
      activeSessions,
      lockedSessions,
      totalSessions: this.sessions.size,
      nsfwKeywords: this.nsfwKeywords.size,
      restrictedOperations: this.restrictedOperations.size
    };
  }

  exportSecurityLogs(timeRange?: { start: Date; end: Date }): any[] {
    return this.securityLogger.getSecurityLogs(timeRange);
  }
}

// Singleton instance
export const securityMiddleware = new SecurityMiddleware();

// Helper function to create security context
export function createSecurityContext(
  session: UserSession,
  requestId: string,
  origin: string,
  operation: string,
  target: string,
  brandAffinity: string[]
): SecurityContext {
  return {
    session,
    requestId,
    origin,
    operation,
    target,
    brandAffinity
  };
}

export default securityMiddleware;