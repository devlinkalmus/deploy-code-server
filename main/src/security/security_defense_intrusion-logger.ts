/**
 * Intrusion Logger - Central intrusion event logging to persistent JSON file
 * Provides comprehensive logging and analysis of security events
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logging';

export interface IntrusionEvent {
  id: string;
  timestamp: Date;
  type: 'port_scan' | 'brute_force' | 'injection_attempt' | 'suspicious_activity' | 'honeypot_trigger' | 'vault_breach' | 'decoy_access' | 'token_abuse';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: {
    ip: string;
    userAgent?: string;
    sessionId?: string;
    userId?: string;
  };
  target: {
    endpoint: string;
    resource?: string;
    operation?: string;
  };
  details: {
    description: string;
    payload?: any;
    patterns?: string[];
    signatures?: string[];
  };
  response: {
    action: 'logged' | 'blocked' | 'redirected' | 'honeypot' | 'deception';
    success: boolean;
    message?: string;
  };
  context: {
    session?: any;
    brandAffinity?: string[];
    requestId?: string;
  };
  geolocation?: {
    country?: string;
    region?: string;
    city?: string;
    coordinates?: [number, number];
  };
  fingerprint: {
    hash: string;
    components: string[];
  };
}

export interface IntrusionStats {
  totalEvents: number;
  last24Hours: number;
  lastWeek: number;
  topSources: Array<{ ip: string; count: number; lastSeen: Date }>;
  topTargets: Array<{ endpoint: string; count: number; lastSeen: Date }>;
  typeDistribution: Record<IntrusionEvent['type'], number>;
  severityDistribution: Record<IntrusionEvent['severity'], number>;
  trends: {
    hourly: number[];
    daily: number[];
  };
}

export interface LoggerConfig {
  logPath: string;
  maxFileSize: number; // bytes
  rotationCount: number;
  compressionEnabled: boolean;
  alertThresholds: {
    eventsPerMinute: number;
    criticalEvents: number;
    uniqueSourcesPerHour: number;
  };
}

class IntrusionLogger {
  private config: LoggerConfig;
  private events: IntrusionEvent[] = [];
  private loggerInstance = logger.createChildLogger('intrusion-logger');
  private alertCallbacks: ((events: IntrusionEvent[], stats: IntrusionStats) => void)[] = [];

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      logPath: join(process.cwd(), 'security', 'intrusion-logs'),
      maxFileSize: 10 * 1024 * 1024, // 10MB
      rotationCount: 5,
      compressionEnabled: true,
      alertThresholds: {
        eventsPerMinute: 10,
        criticalEvents: 3,
        uniqueSourcesPerHour: 50
      },
      ...config
    };

    this.initializeLogger();
    this.loadExistingLogs();
    this.startPeriodicAnalysis();
  }

  /**
   * Log a new intrusion event
   */
  async logIntrusion(eventData: Omit<IntrusionEvent, 'id' | 'timestamp' | 'fingerprint'>): Promise<string> {
    try {
      const event: IntrusionEvent = {
        id: this.generateEventId(),
        timestamp: new Date(),
        ...eventData,
        fingerprint: this.generateFingerprint(eventData)
      };

      // Add to memory cache
      this.events.push(event);

      // Persist to file
      await this.persistEvent(event);

      // Log to system logger
      this.loggerInstance.security(
        `Intrusion detected: ${event.type} from ${event.source.ip}`,
        'intrusion-detection',
        {
          eventId: event.id,
          type: event.type,
          severity: event.severity,
          source: event.source,
          target: event.target,
          action: event.response.action
        },
        {
          tags: ['intrusion-detected', `severity-${event.severity}`, `type-${event.type}`],
          brandAffinity: event.context.brandAffinity
        }
      );

      // Check for alert conditions
      await this.checkAlertThresholds();

      // Keep only recent events in memory (last 24 hours)
      this.pruneMemoryCache();

      return event.id;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.loggerInstance.error(
        `Failed to log intrusion event: ${errorMessage}`,
        'intrusion-logging',
        { error: errorMessage, eventData }
      );
      throw error;
    }
  }

  /**
   * Log port scan detection
   */
  async logPortScan(sourceIp: string, ports: number[], timeWindow: number, sessionId?: string): Promise<string> {
    return this.logIntrusion({
      type: 'port_scan',
      severity: 'medium',
      source: { ip: sourceIp, sessionId },
      target: { endpoint: 'multiple_ports', resource: ports.join(',') },
      details: {
        description: `Port scan detected: ${ports.length} ports scanned in ${timeWindow}ms`,
        payload: { ports, timeWindow },
        patterns: ['sequential_port_access', 'rapid_connection_attempts']
      },
      response: { action: 'logged', success: true },
      context: { sessionId }
    });
  }

  /**
   * Log honeypot trigger
   */
  async logHoneypotTrigger(sourceIp: string, honeypotType: string, payload: any, userAgent?: string): Promise<string> {
    return this.logIntrusion({
      type: 'honeypot_trigger',
      severity: 'high',
      source: { ip: sourceIp, userAgent },
      target: { endpoint: honeypotType, resource: 'honeypot' },
      details: {
        description: `Honeypot triggered: ${honeypotType}`,
        payload,
        patterns: ['honeypot_interaction']
      },
      response: { action: 'honeypot', success: true },
      context: {}
    });
  }

  /**
   * Log decoy route access
   */
  async logDecoyAccess(sourceIp: string, route: string, method: string, userAgent?: string): Promise<string> {
    return this.logIntrusion({
      type: 'decoy_access',
      severity: 'medium',
      source: { ip: sourceIp, userAgent },
      target: { endpoint: route, operation: method },
      details: {
        description: `Decoy route accessed: ${method} ${route}`,
        patterns: ['decoy_route_access', 'reconnaissance_attempt']
      },
      response: { action: 'deception', success: true },
      context: {}
    });
  }

  /**
   * Log vault breach attempt
   */
  async logVaultBreach(sourceIp: string, vaultKey: string, sessionId?: string, userId?: string): Promise<string> {
    return this.logIntrusion({
      type: 'vault_breach',
      severity: 'critical',
      source: { ip: sourceIp, sessionId, userId },
      target: { endpoint: 'vault', resource: vaultKey },
      details: {
        description: `Unauthorized vault access attempt: ${vaultKey}`,
        patterns: ['vault_unauthorized_access']
      },
      response: { action: 'blocked', success: true },
      context: { sessionId }
    });
  }

  /**
   * Log token abuse
   */
  async logTokenAbuse(sourceIp: string, tokenType: string, reason: string, sessionId?: string): Promise<string> {
    return this.logIntrusion({
      type: 'token_abuse',
      severity: 'high',
      source: { ip: sourceIp, sessionId },
      target: { endpoint: 'auth', resource: tokenType },
      details: {
        description: `Token abuse detected: ${reason}`,
        patterns: ['token_manipulation', 'authentication_abuse']
      },
      response: { action: 'blocked', success: true },
      context: { sessionId }
    });
  }

  /**
   * Get intrusion statistics
   */
  getIntrusionStats(timeRange?: { start: Date; end: Date }): IntrusionStats {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let eventsToAnalyze = this.events;
    if (timeRange) {
      eventsToAnalyze = this.events.filter(e => 
        e.timestamp >= timeRange.start && e.timestamp <= timeRange.end
      );
    }

    const last24Hours = this.events.filter(e => e.timestamp >= oneDayAgo).length;
    const lastWeek = this.events.filter(e => e.timestamp >= oneWeekAgo).length;

    // Top sources
    const sourceMap = new Map<string, { count: number; lastSeen: Date }>();
    eventsToAnalyze.forEach(event => {
      const existing = sourceMap.get(event.source.ip);
      if (existing) {
        existing.count++;
        if (event.timestamp > existing.lastSeen) {
          existing.lastSeen = event.timestamp;
        }
      } else {
        sourceMap.set(event.source.ip, { count: 1, lastSeen: event.timestamp });
      }
    });

    const topSources = Array.from(sourceMap.entries())
      .map(([ip, data]) => ({ ip, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top targets
    const targetMap = new Map<string, { count: number; lastSeen: Date }>();
    eventsToAnalyze.forEach(event => {
      const existing = targetMap.get(event.target.endpoint);
      if (existing) {
        existing.count++;
        if (event.timestamp > existing.lastSeen) {
          existing.lastSeen = event.timestamp;
        }
      } else {
        targetMap.set(event.target.endpoint, { count: 1, lastSeen: event.timestamp });
      }
    });

    const topTargets = Array.from(targetMap.entries())
      .map(([endpoint, data]) => ({ endpoint, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Type distribution
    const typeDistribution: Record<IntrusionEvent['type'], number> = {
      port_scan: 0,
      brute_force: 0,
      injection_attempt: 0,
      suspicious_activity: 0,
      honeypot_trigger: 0,
      vault_breach: 0,
      decoy_access: 0,
      token_abuse: 0
    };
    eventsToAnalyze.forEach(event => typeDistribution[event.type]++);

    // Severity distribution
    const severityDistribution: Record<IntrusionEvent['severity'], number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };
    eventsToAnalyze.forEach(event => severityDistribution[event.severity]++);

    // Hourly trends (last 24 hours)
    const hourly = new Array(24).fill(0);
    const daily = new Array(7).fill(0);

    this.events.filter(e => e.timestamp >= oneDayAgo).forEach(event => {
      const hour = 23 - Math.floor((now.getTime() - event.timestamp.getTime()) / (60 * 60 * 1000));
      if (hour >= 0 && hour < 24) hourly[hour]++;
    });

    this.events.filter(e => e.timestamp >= oneWeekAgo).forEach(event => {
      const day = 6 - Math.floor((now.getTime() - event.timestamp.getTime()) / (24 * 60 * 60 * 1000));
      if (day >= 0 && day < 7) daily[day]++;
    });

    return {
      totalEvents: eventsToAnalyze.length,
      last24Hours,
      lastWeek,
      topSources,
      topTargets,
      typeDistribution,
      severityDistribution,
      trends: { hourly, daily }
    };
  }

  /**
   * Search events by criteria
   */
  searchEvents(criteria: {
    type?: IntrusionEvent['type'];
    severity?: IntrusionEvent['severity'];
    sourceIp?: string;
    targetEndpoint?: string;
    timeRange?: { start: Date; end: Date };
    limit?: number;
  }): IntrusionEvent[] {
    let filtered = this.events;

    if (criteria.type) {
      filtered = filtered.filter(e => e.type === criteria.type);
    }

    if (criteria.severity) {
      filtered = filtered.filter(e => e.severity === criteria.severity);
    }

    if (criteria.sourceIp) {
      filtered = filtered.filter(e => e.source.ip === criteria.sourceIp);
    }

    if (criteria.targetEndpoint) {
      filtered = filtered.filter(e => e.target.endpoint === criteria.targetEndpoint);
    }

    if (criteria.timeRange) {
      filtered = filtered.filter(e => 
        e.timestamp >= criteria.timeRange!.start && e.timestamp <= criteria.timeRange!.end
      );
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (criteria.limit) {
      filtered = filtered.slice(0, criteria.limit);
    }

    return filtered;
  }

  /**
   * Register alert callback
   */
  onIntrusionAlert(callback: (events: IntrusionEvent[], stats: IntrusionStats) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Export logs for analysis
   */
  exportLogs(format: 'json' | 'csv' = 'json', timeRange?: { start: Date; end: Date }): string {
    let eventsToExport = this.events;
    if (timeRange) {
      eventsToExport = this.events.filter(e => 
        e.timestamp >= timeRange.start && e.timestamp <= timeRange.end
      );
    }

    if (format === 'csv') {
      const headers = [
        'id', 'timestamp', 'type', 'severity', 'source_ip', 'target_endpoint',
        'description', 'response_action', 'fingerprint_hash'
      ];
      
      const rows = eventsToExport.map(event => [
        event.id,
        event.timestamp.toISOString(),
        event.type,
        event.severity,
        event.source.ip,
        event.target.endpoint,
        event.details.description,
        event.response.action,
        event.fingerprint.hash
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return JSON.stringify(eventsToExport, null, 2);
  }

  /**
   * Initialize logger
   */
  private initializeLogger(): void {
    if (!existsSync(this.config.logPath)) {
      mkdirSync(this.config.logPath, { recursive: true });
    }

    this.loggerInstance.info('Intrusion logger initialized', 'intrusion-logger-init', {
      logPath: this.config.logPath,
      maxFileSize: this.config.maxFileSize,
      alertThresholds: this.config.alertThresholds
    });
  }

  /**
   * Load existing logs from disk
   */
  private loadExistingLogs(): void {
    try {
      const logFile = join(this.config.logPath, 'intrusions.json');
      if (existsSync(logFile)) {
        const data = readFileSync(logFile, 'utf-8');
        const events = JSON.parse(data);
        
        this.events = events.map((event: any) => ({
          ...event,
          timestamp: new Date(event.timestamp)
        }));

        this.loggerInstance.info(`Loaded ${this.events.length} existing intrusion events`, 'intrusion-logger-load');
      }
    } catch (error) {
      this.loggerInstance.warn(
        `Failed to load existing logs: ${error instanceof Error ? error.message : String(error)}`,
        'intrusion-logger-load'
      );
    }
  }

  /**
   * Persist event to disk
   */
  private async persistEvent(event: IntrusionEvent): Promise<void> {
    try {
      const logFile = join(this.config.logPath, 'intrusions.json');
      
      // Check file size and rotate if necessary
      if (existsSync(logFile)) {
        const stats = require('fs').statSync(logFile);
        if (stats.size > this.config.maxFileSize) {
          await this.rotateLogFile();
        }
      }

      // Write all events to file
      writeFileSync(logFile, JSON.stringify(this.events, null, 2));

    } catch (error) {
      this.loggerInstance.error(
        `Failed to persist event: ${error instanceof Error ? error.message : String(error)}`,
        'intrusion-logger-persist'
      );
    }
  }

  /**
   * Rotate log files
   */
  private async rotateLogFile(): Promise<void> {
    try {
      const logFile = join(this.config.logPath, 'intrusions.json');
      
      // Rotate existing files
      for (let i = this.config.rotationCount - 1; i > 0; i--) {
        const oldFile = join(this.config.logPath, `intrusions.${i}.json`);
        const newFile = join(this.config.logPath, `intrusions.${i + 1}.json`);
        
        if (existsSync(oldFile)) {
          require('fs').renameSync(oldFile, newFile);
        }
      }

      // Move current file to .1
      const rotatedFile = join(this.config.logPath, 'intrusions.1.json');
      require('fs').renameSync(logFile, rotatedFile);

      this.loggerInstance.info('Log file rotated', 'intrusion-logger-rotate');

    } catch (error) {
      this.loggerInstance.error(
        `Failed to rotate log file: ${error instanceof Error ? error.message : String(error)}`,
        'intrusion-logger-rotate'
      );
    }
  }

  /**
   * Check alert thresholds
   */
  private async checkAlertThresholds(): Promise<void> {
    try {
      const stats = this.getIntrusionStats();
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Events per minute check
      const recentEvents = this.events.filter(e => e.timestamp >= oneMinuteAgo);
      if (recentEvents.length >= this.config.alertThresholds.eventsPerMinute) {
        await this.triggerAlert(recentEvents, stats, `High event rate: ${recentEvents.length} events in last minute`);
      }

      // Critical events check
      const criticalEvents = this.events.filter(e => 
        e.timestamp >= oneMinuteAgo && e.severity === 'critical'
      );
      if (criticalEvents.length >= this.config.alertThresholds.criticalEvents) {
        await this.triggerAlert(criticalEvents, stats, `Multiple critical events: ${criticalEvents.length} in last minute`);
      }

      // Unique sources per hour check
      const hourlyEvents = this.events.filter(e => e.timestamp >= oneHourAgo);
      const uniqueSources = new Set(hourlyEvents.map(e => e.source.ip)).size;
      if (uniqueSources >= this.config.alertThresholds.uniqueSourcesPerHour) {
        await this.triggerAlert(hourlyEvents, stats, `High source diversity: ${uniqueSources} unique IPs in last hour`);
      }

    } catch (error) {
      this.loggerInstance.error(
        `Failed to check alert thresholds: ${error instanceof Error ? error.message : String(error)}`,
        'intrusion-logger-alerts'
      );
    }
  }

  /**
   * Trigger security alert
   */
  private async triggerAlert(events: IntrusionEvent[], stats: IntrusionStats, reason: string): Promise<void> {
    this.loggerInstance.security(
      `SECURITY ALERT: ${reason}`,
      'intrusion-alert',
      {
        reason,
        eventCount: events.length,
        stats: {
          totalEvents: stats.totalEvents,
          last24Hours: stats.last24Hours,
          topSources: stats.topSources.slice(0, 3)
        }
      },
      {
        tags: ['security-alert', 'intrusion-threshold']
      }
    );

    // Notify callbacks
    for (const callback of this.alertCallbacks) {
      try {
        callback(events, stats);
      } catch (error) {
        this.loggerInstance.error(
          `Alert callback failed: ${error instanceof Error ? error.message : String(error)}`,
          'intrusion-alert'
        );
      }
    }
  }

  /**
   * Generate fingerprint for event
   */
  private generateFingerprint(eventData: Omit<IntrusionEvent, 'id' | 'timestamp' | 'fingerprint'>): { hash: string; components: string[] } {
    const components = [
      eventData.type,
      eventData.source.ip,
      eventData.target.endpoint,
      eventData.source.userAgent || '',
      JSON.stringify(eventData.details.patterns || [])
    ];

    const hash = require('crypto')
      .createHash('sha256')
      .update(components.join('|'))
      .digest('hex')
      .substring(0, 16);

    return { hash, components };
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Prune memory cache to keep only recent events
   */
  private pruneMemoryCache(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const beforeCount = this.events.length;
    this.events = this.events.filter(e => e.timestamp >= oneDayAgo);
    
    if (beforeCount !== this.events.length) {
      this.loggerInstance.info(
        `Pruned ${beforeCount - this.events.length} old events from memory cache`,
        'intrusion-logger-prune'
      );
    }
  }

  /**
   * Start periodic analysis
   */
  private startPeriodicAnalysis(): void {
    setInterval(async () => {
      await this.checkAlertThresholds();
      this.pruneMemoryCache();
    }, 60000); // Every minute

    this.loggerInstance.info('Started periodic intrusion analysis', 'intrusion-logger-init');
  }
}

// Singleton instance
export const intrusionLogger = new IntrusionLogger();

export default intrusionLogger;