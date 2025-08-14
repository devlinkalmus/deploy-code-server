/**
 * Device System Types and Interfaces for JRVI Phase 11
 * Defines device orchestration, tone monitoring, and emotion context types
 */

export interface DeviceConfig {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  capabilities: DeviceCapability[];
  persona: string;
  routing: DeviceRoutingConfig;
  toneMonitoring: ToneMonitoringConfig;
  metadata: DeviceMetadata;
}

export enum DeviceType {
  SENSOR = 'sensor',
  ACTUATOR = 'actuator',
  DISPLAY = 'display',
  AUDIO = 'audio',
  COMMUNICATION = 'communication',
  PROCESSING = 'processing',
  HYBRID = 'hybrid'
}

export enum DeviceStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  MAINTENANCE = 'maintenance',
  ERROR = 'error',
  INITIALIZING = 'initializing',
  UPDATING = 'updating'
}

export interface DeviceCapability {
  name: string;
  type: 'input' | 'output' | 'bidirectional';
  dataType: string;
  enabled: boolean;
  parameters?: Record<string, any>;
}

export interface DeviceRoutingConfig {
  priority: number;
  routingRules: RoutingRule[];
  fallbackDevice?: string;
  loadBalancing: boolean;
  maxConcurrentActions: number;
}

export interface RoutingRule {
  condition: string;
  action: string;
  parameters: Record<string, any>;
  persona: string;
  triggerContext: string[];
}

export interface ToneMonitoringConfig {
  enabled: boolean;
  sensitivity: number;
  emotionDetection: boolean;
  contextAnalysis: boolean;
  realTimeSync: boolean;
  alertThresholds: ToneThreshold[];
}

export interface ToneThreshold {
  emotion: EmotionType;
  intensity: number;
  action: 'log' | 'alert' | 'escalate' | 'route';
  targetPersona?: string;
}

export enum EmotionType {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral',
  EXCITED = 'excited',
  STRESSED = 'stressed',
  FOCUSED = 'focused',
  CONFUSED = 'confused',
  SATISFIED = 'satisfied',
  FRUSTRATED = 'frustrated'
}

export interface DeviceMetadata {
  manufacturer: string;
  model: string;
  version: string;
  firmware: string;
  lastUpdate: Date;
  securityLevel: SecurityLevel;
  compliance: ComplianceInfo;
}

export enum SecurityLevel {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted'
}

export interface ComplianceInfo {
  jrviPrinciples: boolean;
  constitutionCompliant: boolean;
  auditRequired: boolean;
  certifications: string[];
}

export interface DeviceEvent {
  id: string;
  deviceId: string;
  eventType: DeviceEventType;
  timestamp: Date;
  traceId: string;
  persona: string;
  action: string;
  data: any;
  context: EventContext;
  audit: AuditInfo;
}

export enum DeviceEventType {
  ACTION = 'action',
  STATUS_CHANGE = 'status_change',
  TONE_DETECTED = 'tone_detected',
  ROUTING = 'routing',
  ERROR = 'error',
  MAINTENANCE = 'maintenance',
  COMPLIANCE = 'compliance'
}

export interface EventContext {
  source: string;
  destination?: string;
  relatedEvents: string[];
  environmentalFactors: Record<string, any>;
  userContext?: UserContext;
}

export interface UserContext {
  userId?: string;
  sessionId: string;
  preferences: Record<string, any>;
  currentBrand: string;
}

export interface AuditInfo {
  persona: string;
  traceId: string;
  timestamp: Date;
  compliance: boolean;
  reviewRequired: boolean;
  tags: string[];
}

export interface ToneAnalysis {
  deviceId: string;
  timestamp: Date;
  traceId: string;
  persona: string;
  emotions: EmotionReading[];
  context: ToneContext;
  confidence: number;
  recommendations: ToneRecommendation[];
}

export interface EmotionReading {
  emotion: EmotionType;
  intensity: number;
  confidence: number;
  duration: number;
  triggers: string[];
}

export interface ToneContext {
  environment: string;
  interactions: number;
  previousTone?: EmotionType;
  brandContext: string;
  deviceContext: string[];
}

export interface ToneRecommendation {
  action: string;
  persona: string;
  priority: number;
  parameters: Record<string, any>;
  reasoning: string;
}

export interface DeviceOrchestrationStatus {
  totalDevices: number;
  onlineDevices: number;
  activeRoutes: number;
  queuedActions: number;
  toneMonitoringActive: boolean;
  lastUpdate: Date;
  systemHealth: 'healthy' | 'warning' | 'error';
  complianceStatus: boolean;
}

export interface DeviceActionRequest {
  id: string;
  deviceId: string;
  action: string;
  parameters: Record<string, any>;
  persona: string;
  traceId: string;
  priority: number;
  timeout: number;
  retryAttempts: number;
  compliance: boolean;
}

export interface DeviceActionResult {
  requestId: string;
  deviceId: string;
  status: 'success' | 'failure' | 'timeout' | 'retrying';
  result?: any;
  error?: string;
  executionTime: number;
  traceId: string;
  persona: string;
  auditEntry: AuditInfo;
}