/**
 * Device Orchestrator for JRVI Phase 11
 * Core kernel for managing multiple devices and routing logic/actions
 */

import {
  DeviceConfig,
  DeviceType,
  DeviceStatus,
  DeviceEvent,
  DeviceEventType,
  DeviceActionRequest,
  DeviceActionResult,
  DeviceOrchestrationStatus,
  RoutingRule,
  AuditInfo
} from './types';
import { deviceToneMonitor } from './toneMonitor';
import { personaRouter } from '../persona/router';
import { enforceKernel } from '../kernel';
import logger from '../logger';

export interface OrchestrationConfig {
  maxConcurrentActions: number;
  actionTimeout: number;
  retryAttempts: number;
  auditAllActions: boolean;
  toneMonitoringEnabled: boolean;
  complianceEnforcement: boolean;
}

export class DeviceOrchestrator {
  private devices: Map<string, DeviceConfig> = new Map();
  private actionQueue: DeviceActionRequest[] = [];
  private activeActions: Map<string, DeviceActionRequest> = new Map();
  private eventHistory: DeviceEvent[] = [];
  private routingRules: Map<string, RoutingRule[]> = new Map();
  private config: OrchestrationConfig;

  constructor(config: Partial<OrchestrationConfig> = {}) {
    this.config = {
      maxConcurrentActions: 10,
      actionTimeout: 30000, // 30 seconds
      retryAttempts: 3,
      auditAllActions: true,
      toneMonitoringEnabled: true,
      complianceEnforcement: true,
      ...config
    };

    this.initializeOrchestrator();
  }

  /**
   * Initialize the device orchestrator
   */
  private initializeOrchestrator(): void {
    try {
      logger.log('DeviceOrchestrator: Initializing orchestration kernel', { config: this.config });

      // Enforce kernel compliance
      enforceKernel({ persona: 'DEVICE_ORCHESTRATOR' });

      // Initialize default devices
      this.initializeDefaultDevices();

      // Start processing queue
      this.startActionProcessing();

      logger.log('DeviceOrchestrator: Initialization completed');

    } catch (error) {
      logger.error('DeviceOrchestrator: Failed to initialize', { error });
      throw error;
    }
  }

  /**
   * Initialize default devices for JRVI system
   */
  private initializeDefaultDevices(): void {
    const defaultDevices: DeviceConfig[] = [
      {
        id: 'hud-display-01',
        name: 'Primary HUD Display',
        type: DeviceType.DISPLAY,
        status: DeviceStatus.ONLINE,
        capabilities: [
          { name: 'render_ui', type: 'output', dataType: 'ui_component', enabled: true },
          { name: 'user_interaction', type: 'input', dataType: 'user_event', enabled: true }
        ],
        persona: 'JRVI',
        routing: {
          priority: 1,
          routingRules: [
            {
              condition: 'ui_update_required',
              action: 'render_component',
              parameters: { refreshRate: 60 },
              persona: 'JRVI',
              triggerContext: ['dashboard', 'hud']
            }
          ],
          loadBalancing: false,
          maxConcurrentActions: 5
        },
        toneMonitoring: {
          enabled: true,
          sensitivity: 0.7,
          emotionDetection: true,
          contextAnalysis: true,
          realTimeSync: true,
          alertThresholds: [
            { emotion: 'frustrated', intensity: 0.8, action: 'alert', targetPersona: 'JRVI' }
          ]
        },
        metadata: {
          manufacturer: 'JRVI Systems',
          model: 'HUD-Display-v1',
          version: '1.0.0',
          firmware: '1.0.0',
          lastUpdate: new Date(),
          securityLevel: 'internal',
          compliance: {
            jrviPrinciples: true,
            constitutionCompliant: true,
            auditRequired: true,
            certifications: ['JRVI-CERT-001']
          }
        }
      },
      {
        id: 'tone-sensor-01',
        name: 'Primary Tone Sensor',
        type: DeviceType.SENSOR,
        status: DeviceStatus.ONLINE,
        capabilities: [
          { name: 'emotion_detection', type: 'input', dataType: 'emotion_data', enabled: true },
          { name: 'tone_analysis', type: 'input', dataType: 'tone_data', enabled: true }
        ],
        persona: 'JRVI',
        routing: {
          priority: 2,
          routingRules: [
            {
              condition: 'emotion_detected',
              action: 'analyze_tone',
              parameters: { threshold: 0.7 },
              persona: 'JRVI',
              triggerContext: ['emotion', 'tone']
            }
          ],
          loadBalancing: false,
          maxConcurrentActions: 3
        },
        toneMonitoring: {
          enabled: true,
          sensitivity: 0.9,
          emotionDetection: true,
          contextAnalysis: true,
          realTimeSync: true,
          alertThresholds: [
            { emotion: 'negative', intensity: 0.8, action: 'escalate', targetPersona: 'JRVI' }
          ]
        },
        metadata: {
          manufacturer: 'JRVI Systems',
          model: 'Tone-Sensor-v1',
          version: '1.0.0',
          firmware: '1.0.0',
          lastUpdate: new Date(),
          securityLevel: 'internal',
          compliance: {
            jrviPrinciples: true,
            constitutionCompliant: true,
            auditRequired: true,
            certifications: ['JRVI-CERT-002']
          }
        }
      },
      {
        id: 'comms-hub-01',
        name: 'Communication Hub',
        type: DeviceType.COMMUNICATION,
        status: DeviceStatus.ONLINE,
        capabilities: [
          { name: 'send_message', type: 'output', dataType: 'message', enabled: true },
          { name: 'receive_message', type: 'input', dataType: 'message', enabled: true },
          { name: 'route_communication', type: 'bidirectional', dataType: 'routing_data', enabled: true }
        ],
        persona: 'JRVI',
        routing: {
          priority: 3,
          routingRules: [
            {
              condition: 'communication_required',
              action: 'route_message',
              parameters: { protocol: 'secure' },
              persona: 'JRVI',
              triggerContext: ['communication', 'messaging']
            }
          ],
          loadBalancing: true,
          maxConcurrentActions: 10
        },
        toneMonitoring: {
          enabled: false,
          sensitivity: 0.5,
          emotionDetection: false,
          contextAnalysis: false,
          realTimeSync: false,
          alertThresholds: []
        },
        metadata: {
          manufacturer: 'JRVI Systems',
          model: 'Comm-Hub-v1',
          version: '1.0.0',
          firmware: '1.0.0',
          lastUpdate: new Date(),
          securityLevel: 'confidential',
          compliance: {
            jrviPrinciples: true,
            constitutionCompliant: true,
            auditRequired: true,
            certifications: ['JRVI-CERT-003']
          }
        }
      }
    ];

    // Register all default devices
    for (const device of defaultDevices) {
      this.registerDevice(device);
    }
  }

  /**
   * Register a new device
   */
  registerDevice(device: DeviceConfig): void {
    try {
      // Enforce kernel compliance
      enforceKernel({ persona: device.persona });

      // Validate device configuration
      this.validateDeviceConfig(device);

      // Store device
      this.devices.set(device.id, device);

      // Set up routing rules
      this.routingRules.set(device.id, device.routing.routingRules);

      // Start tone monitoring if enabled
      if (this.config.toneMonitoringEnabled && device.toneMonitoring.enabled) {
        deviceToneMonitor.startDeviceMonitoring(device.id, device.persona);
      }

      // Log device registration event
      this.logDeviceEvent(device.id, DeviceEventType.STATUS_CHANGE, 'device_registered', device.persona, {
        deviceType: device.type,
        capabilities: device.capabilities.length,
        toneMonitoring: device.toneMonitoring.enabled
      });

      logger.log('DeviceOrchestrator: Device registered successfully', {
        deviceId: device.id,
        deviceType: device.type,
        persona: device.persona
      });

    } catch (error) {
      logger.error('DeviceOrchestrator: Failed to register device', {
        deviceId: device.id,
        error
      });
      throw error;
    }
  }

  /**
   * Execute action on device
   */
  async executeDeviceAction(request: DeviceActionRequest): Promise<DeviceActionResult> {
    try {
      // Enforce kernel compliance
      enforceKernel({ persona: request.persona });

      // Validate compliance
      if (this.config.complianceEnforcement && !request.compliance) {
        throw new Error('Action requires compliance flag for execution');
      }

      // Check if device exists and is online
      const device = this.devices.get(request.deviceId);
      if (!device) {
        throw new Error(`Device ${request.deviceId} not found`);
      }
      if (device.status !== DeviceStatus.ONLINE) {
        throw new Error(`Device ${request.deviceId} is not online (status: ${device.status})`);
      }

      // Add to action queue
      this.actionQueue.push(request);

      // Log action request
      this.logDeviceEvent(request.deviceId, DeviceEventType.ACTION, 'action_requested', request.persona, {
        action: request.action,
        priority: request.priority,
        queuePosition: this.actionQueue.length
      });

      logger.log('DeviceOrchestrator: Device action queued', {
        requestId: request.id,
        deviceId: request.deviceId,
        action: request.action,
        persona: request.persona
      });

      // Return promise that will be resolved when action is processed
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          // Check if action has been completed (this is a simplified implementation)
          // In real implementation, this would be event-driven
          const mockResult: DeviceActionResult = {
            requestId: request.id,
            deviceId: request.deviceId,
            status: 'success',
            result: { message: 'Action executed successfully' },
            executionTime: 1000,
            traceId: request.traceId,
            persona: request.persona,
            auditEntry: {
              persona: request.persona,
              traceId: request.traceId,
              timestamp: new Date(),
              compliance: request.compliance,
              reviewRequired: false,
              tags: ['device_action', request.action]
            }
          };

          clearInterval(checkInterval);
          resolve(mockResult);
        }, 1000);

        // Timeout handling
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('Action execution timeout'));
        }, request.timeout);
      });

    } catch (error) {
      logger.error('DeviceOrchestrator: Failed to execute device action', {
        requestId: request.id,
        deviceId: request.deviceId,
        error
      });

      return {
        requestId: request.id,
        deviceId: request.deviceId,
        status: 'failure',
        error: error.message,
        executionTime: 0,
        traceId: request.traceId,
        persona: request.persona,
        auditEntry: {
          persona: request.persona,
          traceId: request.traceId,
          timestamp: new Date(),
          compliance: false,
          reviewRequired: true,
          tags: ['device_action', 'failure', request.action]
        }
      };
    }
  }

  /**
   * Route action to appropriate device
   */
  routeAction(action: string, context: any, persona: string): string | null {
    try {
      // Find devices that can handle this action
      const candidateDevices = Array.from(this.devices.values()).filter(device => {
        return device.status === DeviceStatus.ONLINE &&
               device.persona === persona &&
               this.canDeviceHandleAction(device, action, context);
      });

      if (candidateDevices.length === 0) {
        return null;
      }

      // Sort by priority and load
      candidateDevices.sort((a, b) => {
        const aLoad = this.getDeviceLoad(a.id);
        const bLoad = this.getDeviceLoad(b.id);
        return a.routing.priority - b.routing.priority || aLoad - bLoad;
      });

      const selectedDevice = candidateDevices[0];

      // Log routing decision
      this.logDeviceEvent(selectedDevice.id, DeviceEventType.ROUTING, 'action_routed', persona, {
        action,
        context,
        candidateCount: candidateDevices.length,
        routingReason: 'priority_and_load'
      });

      logger.log('DeviceOrchestrator: Action routed to device', {
        action,
        deviceId: selectedDevice.id,
        persona,
        candidateCount: candidateDevices.length
      });

      return selectedDevice.id;

    } catch (error) {
      logger.error('DeviceOrchestrator: Failed to route action', { action, persona, error });
      return null;
    }
  }

  /**
   * Handle device tone event (integration with tone monitor)
   */
  async handleDeviceTone(deviceId: string, toneData: any, persona: string): Promise<void> {
    try {
      const device = this.devices.get(deviceId);
      if (!device || !device.toneMonitoring.enabled) {
        return;
      }

      const traceId = `tone_${Date.now()}_${deviceId}`;
      const analysis = await deviceToneMonitor.handleDeviceTone(deviceId, toneData, persona, traceId);

      // Log tone detection event
      this.logDeviceEvent(deviceId, DeviceEventType.TONE_DETECTED, 'tone_analyzed', persona, {
        emotions: analysis.emotions.map(e => e.emotion),
        confidence: analysis.confidence,
        recommendationCount: analysis.recommendations.length
      });

      // Process high-priority recommendations
      for (const recommendation of analysis.recommendations) {
        if (recommendation.priority <= 2) {
          await this.processRecommendation(deviceId, recommendation, persona, traceId);
        }
      }

    } catch (error) {
      logger.error('DeviceOrchestrator: Failed to handle device tone', { deviceId, persona, error });
    }
  }

  /**
   * Get orchestration status
   */
  getOrchestrationStatus(): DeviceOrchestrationStatus {
    const totalDevices = this.devices.size;
    const onlineDevices = Array.from(this.devices.values()).filter(d => d.status === DeviceStatus.ONLINE).length;
    const activeRoutes = Array.from(this.routingRules.values()).reduce((sum, rules) => sum + rules.length, 0);
    const queuedActions = this.actionQueue.length;

    return {
      totalDevices,
      onlineDevices,
      activeRoutes,
      queuedActions,
      toneMonitoringActive: this.config.toneMonitoringEnabled,
      lastUpdate: new Date(),
      systemHealth: this.calculateSystemHealth(),
      complianceStatus: this.checkComplianceStatus()
    };
  }

  /**
   * Get device configuration
   */
  getDevice(deviceId: string): DeviceConfig | undefined {
    return this.devices.get(deviceId);
  }

  /**
   * Get all devices
   */
  getAllDevices(): DeviceConfig[] {
    return Array.from(this.devices.values());
  }

  /**
   * Get device events (for dashboard and audit)
   */
  getDeviceEvents(deviceId?: string, limit: number = 100): DeviceEvent[] {
    let events = this.eventHistory;
    
    if (deviceId) {
      events = events.filter(event => event.deviceId === deviceId);
    }

    return events.slice(-limit);
  }

  /**
   * Update device status
   */
  updateDeviceStatus(deviceId: string, status: DeviceStatus, persona: string): void {
    const device = this.devices.get(deviceId);
    if (device) {
      const previousStatus = device.status;
      device.status = status;

      this.logDeviceEvent(deviceId, DeviceEventType.STATUS_CHANGE, 'status_updated', persona, {
        previousStatus,
        newStatus: status
      });

      logger.log('DeviceOrchestrator: Device status updated', {
        deviceId,
        previousStatus,
        newStatus: status,
        persona
      });
    }
  }

  /**
   * Validate device configuration
   */
  private validateDeviceConfig(device: DeviceConfig): void {
    if (!device.id || !device.name || !device.type) {
      throw new Error('Device must have id, name, and type');
    }

    if (!device.persona) {
      throw new Error('Device must have associated persona');
    }

    if (!device.metadata.compliance.jrviPrinciples) {
      throw new Error('Device must comply with JRVI Core Principles');
    }

    if (!device.metadata.compliance.constitutionCompliant) {
      throw new Error('Device must be constitution compliant');
    }
  }

  /**
   * Check if device can handle action
   */
  private canDeviceHandleAction(device: DeviceConfig, action: string, context: any): boolean {
    // Check routing rules
    for (const rule of device.routing.routingRules) {
      if (rule.action === action || rule.triggerContext.some(ctx => context[ctx])) {
        return true;
      }
    }

    // Check capabilities
    return device.capabilities.some(cap => 
      cap.enabled && (cap.name === action || action.includes(cap.name))
    );
  }

  /**
   * Get device load (number of active actions)
   */
  private getDeviceLoad(deviceId: string): number {
    return Array.from(this.activeActions.values()).filter(action => action.deviceId === deviceId).length;
  }

  /**
   * Process recommendation from tone analysis
   */
  private async processRecommendation(deviceId: string, recommendation: any, persona: string, traceId: string): Promise<void> {
    try {
      const actionRequest: DeviceActionRequest = {
        id: `rec_${Date.now()}_${deviceId}`,
        deviceId,
        action: recommendation.action,
        parameters: recommendation.parameters,
        persona: recommendation.persona,
        traceId,
        priority: recommendation.priority,
        timeout: this.config.actionTimeout,
        retryAttempts: this.config.retryAttempts,
        compliance: true
      };

      await this.executeDeviceAction(actionRequest);

    } catch (error) {
      logger.error('DeviceOrchestrator: Failed to process recommendation', {
        deviceId,
        recommendation,
        error
      });
    }
  }

  /**
   * Start action processing queue
   */
  private startActionProcessing(): void {
    setInterval(() => {
      this.processActionQueue();
    }, 1000);
  }

  /**
   * Process action queue
   */
  private processActionQueue(): void {
    while (this.actionQueue.length > 0 && this.activeActions.size < this.config.maxConcurrentActions) {
      const action = this.actionQueue.shift();
      if (action) {
        this.activeActions.set(action.id, action);
        // Action processing happens in executeDeviceAction
      }
    }
  }

  /**
   * Calculate system health
   */
  private calculateSystemHealth(): 'healthy' | 'warning' | 'error' {
    const onlineDevices = Array.from(this.devices.values()).filter(d => d.status === DeviceStatus.ONLINE).length;
    const totalDevices = this.devices.size;
    const healthRatio = totalDevices > 0 ? onlineDevices / totalDevices : 0;

    if (healthRatio >= 0.9) return 'healthy';
    if (healthRatio >= 0.7) return 'warning';
    return 'error';
  }

  /**
   * Check compliance status
   */
  private checkComplianceStatus(): boolean {
    return Array.from(this.devices.values()).every(device => 
      device.metadata.compliance.jrviPrinciples && 
      device.metadata.compliance.constitutionCompliant
    );
  }

  /**
   * Log device event with full audit trail
   */
  private logDeviceEvent(
    deviceId: string, 
    eventType: DeviceEventType, 
    action: string, 
    persona: string, 
    data: any
  ): void {
    const event: DeviceEvent = {
      id: `event_${Date.now()}_${deviceId}`,
      deviceId,
      eventType,
      timestamp: new Date(),
      traceId: `trace_${Date.now()}_${deviceId}`,
      persona,
      action,
      data,
      context: {
        source: 'device_orchestrator',
        relatedEvents: [],
        environmentalFactors: {},
        userContext: {
          sessionId: `session_${Date.now()}`,
          preferences: {},
          currentBrand: persona
        }
      },
      audit: {
        persona,
        traceId: `audit_${Date.now()}_${deviceId}`,
        timestamp: new Date(),
        compliance: true,
        reviewRequired: eventType === DeviceEventType.ERROR,
        tags: ['device_event', eventType, action]
      }
    };

    this.eventHistory.push(event);

    // Maintain history size
    if (this.eventHistory.length > 10000) {
      this.eventHistory = this.eventHistory.slice(-5000);
    }

    // Log for audit purposes
    if (this.config.auditAllActions) {
      logger.log('DeviceOrchestrator: Device event logged', {
        eventId: event.id,
        deviceId,
        eventType,
        action,
        persona
      });
    }
  }
}

// Export singleton instance
export const deviceOrchestrator = new DeviceOrchestrator();