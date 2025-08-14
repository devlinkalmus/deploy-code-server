/**
 * Security Defense - Token Deceiver for threat research
 * Generates fake JWT tokens and authentication responses to mislead attackers
 */

import * as jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'crypto';
import { logger } from '../utils/logging';
import { intrusionLogger } from './security_defense_intrusion-logger';

export interface TokenDeceiverConfig {
  enabled: boolean;
  jwtSecret: string;
  fakeUserDatabase: boolean;
  honeypotTokens: boolean;
  responseDelay: number; // milliseconds
  logTokenAbuse: boolean;
}

export interface FakeUser {
  id: number;
  username: string;
  email: string;
  role: string;
  permissions: string[];
  lastLogin: Date;
  isActive: boolean;
}

export interface TokenGenerationOptions {
  userId?: number;
  username?: string;
  role?: string;
  permissions?: string[];
  expiresIn?: string;
  includeHoneypot?: boolean;
}

export interface TokenValidationResult {
  valid: boolean;
  isHoneypot: boolean;
  decoded?: any;
  reason?: string;
  suspiciousActivity?: boolean;
}

class SecurityDefenseTokenDeceiver {
  private config: TokenDeceiverConfig;
  private deceiverLogger = logger.createChildLogger('token-deceiver');
  private fakeUsers: FakeUser[] = [];
  private honeypotTokens: Set<string> = new Set();
  private tokenAbuseLogs: Map<string, number> = new Map();

  constructor(config: Partial<TokenDeceiverConfig> = {}) {
    this.config = {
      enabled: true,
      jwtSecret: 'fake-secret-key-for-deception',
      fakeUserDatabase: true,
      honeypotTokens: true,
      responseDelay: 200,
      logTokenAbuse: true,
      ...config
    };

    if (this.config.enabled) {
      this.initializeFakeDatabase();
    }
  }

  /**
   * Initialize fake user database for deception
   */
  private initializeFakeDatabase(): void {
    this.fakeUsers = [
      {
        id: 1,
        username: 'admin',
        email: 'admin@company.com',
        role: 'administrator',
        permissions: ['read', 'write', 'delete', 'admin'],
        lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        isActive: true
      },
      {
        id: 2,
        username: 'user',
        email: 'user@company.com',
        role: 'user',
        permissions: ['read', 'write'],
        lastLogin: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        isActive: true
      },
      {
        id: 3,
        username: 'service',
        email: 'service@company.com',
        role: 'service',
        permissions: ['read', 'api_access'],
        lastLogin: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        isActive: true
      },
      {
        id: 4,
        username: 'backup',
        email: 'backup@company.com',
        role: 'backup',
        permissions: ['read', 'backup'],
        lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        isActive: false
      },
      {
        id: 5,
        username: 'test',
        email: 'test@company.com',
        role: 'tester',
        permissions: ['read'],
        lastLogin: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        isActive: false
      }
    ];

    this.deceiverLogger.info(`Initialized fake user database with ${this.fakeUsers.length} users`, 'token-deceiver-init');
  }

  /**
   * Generate a fake JWT token
   */
  generateFakeToken(options: TokenGenerationOptions = {}): string {
    if (!this.config.enabled) {
      throw new Error('Token deceiver is disabled');
    }

    const payload = {
      sub: options.userId || this.getRandomUserId(),
      username: options.username || this.getRandomUsername(),
      role: options.role || this.getRandomRole(),
      permissions: options.permissions || this.getRandomPermissions(),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.parseExpiresIn(options.expiresIn || '1h'),
      iss: 'JRVI-Security-System',
      aud: 'jrvi-client',
      jti: this.generateTokenId(),
      // Add honeypot marker if requested
      ...(options.includeHoneypot && { _honeypot: true, _trace: this.generateTraceId() })
    };

    const token = jwt.sign(payload, this.config.jwtSecret, { algorithm: 'HS256' });

    // Track honeypot tokens
    if (options.includeHoneypot) {
      this.honeypotTokens.add(token);
      this.deceiverLogger.security(
        'Honeypot token generated',
        'token-honeypot',
        {
          tokenId: payload.jti,
          username: payload.username,
          role: payload.role,
          traceId: payload._trace
        },
        {
          tags: ['honeypot-token', 'token-generation']
        }
      );
    }

    this.deceiverLogger.audit(
      'Fake token generated',
      'token-generation',
      {
        tokenId: payload.jti,
        username: payload.username,
        role: payload.role,
        isHoneypot: !!options.includeHoneypot
      }
    );

    return token;
  }

  /**
   * Validate token and detect abuse
   */
  async validateToken(token: string, sourceIp?: string): Promise<TokenValidationResult> {
    try {
      // Check if it's a honeypot token
      const isHoneypot = this.honeypotTokens.has(token);
      
      if (isHoneypot && sourceIp) {
        await this.logTokenAbuse(sourceIp, 'honeypot_token_used', token);
      }

      // Decode token
      const decoded = jwt.verify(token, this.config.jwtSecret) as any;
      
      // Check for suspicious patterns
      const suspiciousActivity = this.detectSuspiciousActivity(decoded, sourceIp);
      
      if (suspiciousActivity && sourceIp) {
        await this.logTokenAbuse(sourceIp, 'suspicious_token_usage', token);
      }

      return {
        valid: true,
        isHoneypot,
        decoded,
        suspiciousActivity
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (sourceIp) {
        await this.logTokenAbuse(sourceIp, 'invalid_token_attempt', token);
      }

      return {
        valid: false,
        isHoneypot: false,
        reason: errorMessage,
        suspiciousActivity: true
      };
    }
  }

  /**
   * Generate fake authentication response
   */
  async generateFakeAuthResponse(
    username: string, 
    password: string, 
    sourceIp?: string,
    includeHoneypot: boolean = false
  ): Promise<any> {
    if (!this.config.enabled) {
      return { error: 'Authentication service unavailable' };
    }

    // Add response delay to slow down brute force attacks
    if (this.config.responseDelay > 0) {
      await this.delay(this.config.responseDelay);
    }

    // Log authentication attempt
    if (sourceIp && this.config.logTokenAbuse) {
      await intrusionLogger.logIntrusion({
        type: 'brute_force',
        severity: 'medium',
        source: { ip: sourceIp },
        target: { endpoint: 'auth', operation: 'login' },
        details: {
          description: `Authentication attempt with username: ${username}`,
          payload: { username, passwordLength: password.length }
        },
        response: { action: 'deception', success: true },
        context: {}
      });
    }

    // Find user in fake database
    const user = this.fakeUsers.find(u => u.username === username);
    
    if (!user) {
      return {
        success: false,
        error: 'Invalid credentials',
        message: 'Username or password is incorrect',
        timestamp: new Date().toISOString()
      };
    }

    // Simulate password validation (always fail for security)
    const passwordValid = this.simulatePasswordValidation(password, user);
    
    if (!passwordValid) {
      return {
        success: false,
        error: 'Invalid credentials',
        message: 'Username or password is incorrect',
        attempts_remaining: Math.floor(Math.random() * 3) + 1,
        lockout_time: Math.floor(Math.random() * 300) + 60, // 1-5 minutes
        timestamp: new Date().toISOString()
      };
    }

    // Generate successful (fake) response
    const token = this.generateFakeToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      permissions: user.permissions,
      includeHoneypot
    });

    const response = {
      success: true,
      message: 'Authentication successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        lastLogin: user.lastLogin.toISOString()
      },
      token,
      refreshToken: this.generateRefreshToken(),
      expires_in: 3600,
      token_type: 'Bearer',
      session_id: this.generateSessionId(),
      timestamp: new Date().toISOString()
    };

    this.deceiverLogger.security(
      `Fake authentication successful for user: ${username}`,
      'fake-auth',
      {
        username,
        userId: user.id,
        role: user.role,
        sourceIp,
        isHoneypot: includeHoneypot
      },
      {
        tags: ['fake-authentication', 'token-deception']
      }
    );

    return response;
  }

  /**
   * Generate fake user list for API deception
   */
  generateFakeUserList(limit: number = 10): any {
    if (!this.config.enabled || !this.config.fakeUserDatabase) {
      return { error: 'Access denied' };
    }

    const users = this.fakeUsers.slice(0, limit).map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin.toISOString(),
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
    }));

    return {
      success: true,
      data: users,
      total: this.fakeUsers.length,
      page: 1,
      limit,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate fake API key
   */
  generateFakeApiKey(purpose: string = 'general'): string {
    const prefix = purpose.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString(36);
    const random = randomBytes(16).toString('hex');
    
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Simulate password validation (always returns false for security)
   */
  private simulatePasswordValidation(password: string, user: FakeUser): boolean {
    // Add some realistic delay
    const hash = createHash('sha256').update(password + user.username).digest('hex');
    
    // Simulate various password checks but always return false
    // This prevents any real authentication while appearing realistic
    return false;
  }

  /**
   * Detect suspicious token activity
   */
  private detectSuspiciousActivity(decoded: any, sourceIp?: string): boolean {
    let suspicious = false;

    // Check for honeypot markers
    if (decoded._honeypot) {
      suspicious = true;
    }

    // Check for expired tokens being used
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      suspicious = true;
    }

    // Check for unusual permissions
    if (decoded.permissions && decoded.permissions.includes('root')) {
      suspicious = true;
    }

    // Check for rapid token usage from same IP
    if (sourceIp) {
      const recentUses = this.tokenAbuseLogs.get(sourceIp) || 0;
      if (recentUses > 10) {
        suspicious = true;
      }
    }

    return suspicious;
  }

  /**
   * Log token abuse
   */
  private async logTokenAbuse(sourceIp: string, reason: string, token?: string): Promise<void> {
    if (!this.config.logTokenAbuse) return;

    // Track abuse count
    const currentCount = this.tokenAbuseLogs.get(sourceIp) || 0;
    this.tokenAbuseLogs.set(sourceIp, currentCount + 1);

    // Log to intrusion logger
    await intrusionLogger.logTokenAbuse(sourceIp, 'jwt', reason);

    this.deceiverLogger.security(
      `Token abuse detected: ${reason}`,
      'token-abuse',
      {
        sourceIp,
        reason,
        tokenPreview: token ? token.substring(0, 20) + '...' : undefined,
        abuseCount: currentCount + 1
      },
      {
        tags: ['token-abuse', 'security-violation']
      }
    );
  }

  /**
   * Generate various fake tokens for different purposes
   */
  generateFakeTokenSet(): {
    accessToken: string;
    refreshToken: string;
    apiKey: string;
    sessionToken: string;
  } {
    return {
      accessToken: this.generateFakeToken({ expiresIn: '1h' }),
      refreshToken: this.generateRefreshToken(),
      apiKey: this.generateFakeApiKey('api'),
      sessionToken: this.generateSessionToken()
    };
  }

  /**
   * Generate fake refresh token
   */
  private generateRefreshToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Generate fake session token
   */
  private generateSessionToken(): string {
    const sessionData = {
      sid: this.generateSessionId(),
      created: Date.now(),
      expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      data: { temp: true }
    };

    return Buffer.from(JSON.stringify(sessionData)).toString('base64');
  }

  /**
   * Helper methods
   */
  private getRandomUserId(): number {
    return this.fakeUsers[Math.floor(Math.random() * this.fakeUsers.length)].id;
  }

  private getRandomUsername(): string {
    return this.fakeUsers[Math.floor(Math.random() * this.fakeUsers.length)].username;
  }

  private getRandomRole(): string {
    const roles = ['user', 'admin', 'service', 'backup', 'tester'];
    return roles[Math.floor(Math.random() * roles.length)];
  }

  private getRandomPermissions(): string[] {
    const allPermissions = ['read', 'write', 'delete', 'admin', 'api_access', 'backup'];
    const count = Math.floor(Math.random() * 3) + 1;
    return allPermissions.slice(0, count);
  }

  private generateTokenId(): string {
    return randomBytes(8).toString('hex');
  }

  private generateTraceId(): string {
    return randomBytes(16).toString('hex');
  }

  private generateSessionId(): string {
    return randomBytes(16).toString('hex');
  }

  private parseExpiresIn(expiresIn: string): number {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1));

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 24 * 60 * 60;
      default: return 3600; // default 1 hour
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get token deceiver statistics
   */
  getTokenDeceiverStats(): {
    enabled: boolean;
    fakeUsersCount: number;
    honeypotTokensCount: number;
    abuseLogsCount: number;
    topAbusers: Array<{ ip: string; count: number }>;
  } {
    const topAbusers = Array.from(this.tokenAbuseLogs.entries())
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      enabled: this.config.enabled,
      fakeUsersCount: this.fakeUsers.length,
      honeypotTokensCount: this.honeypotTokens.size,
      abuseLogsCount: this.tokenAbuseLogs.size,
      topAbusers
    };
  }

  /**
   * Clear old abuse logs
   */
  cleanupAbuseLogs(): void {
    // In a real implementation, you'd want to keep logs with timestamps
    // For now, just clear everything older than 24 hours conceptually
    const threshold = 100; // Keep only top 100 abusers
    
    if (this.tokenAbuseLogs.size > threshold) {
      const sorted = Array.from(this.tokenAbuseLogs.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, threshold);
      
      this.tokenAbuseLogs.clear();
      sorted.forEach(([ip, count]) => this.tokenAbuseLogs.set(ip, count));
      
      this.deceiverLogger.info('Cleaned up old token abuse logs', 'token-cleanup');
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TokenDeceiverConfig>): void {
    this.config = { ...this.config, ...config };
    this.deceiverLogger.info('Token deceiver configuration updated', 'token-config');
  }
}

// Singleton instance
export const securityDefenseTokenDeceiver = new SecurityDefenseTokenDeceiver();

export default securityDefenseTokenDeceiver;