/**
 * HUD Enhancer
 * Provides enhanced functionality and visualization for the HUD system
 */

import { HUDPayload, HUDPayloadManager, hudPayloadManager } from './hudPayload';
import { swarmHive } from './swarmHive';

export interface EnhancedHUDState {
  payload: HUDPayload;
  visualizations: VisualizationData;
  interactions: InteractionState;
  customization: CustomizationSettings;
}

export interface VisualizationData {
  charts: ChartData[];
  graphs: GraphData[];
  tables: TableData[];
  alerts: AlertVisualization[];
}

export interface ChartData {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'heatmap' | 'scatter';
  title: string;
  data: any[];
  options: ChartOptions;
  timestamp: Date;
}

export interface ChartOptions {
  width?: number;
  height?: number;
  colors?: string[];
  animate?: boolean;
  showLegend?: boolean;
  showTooltips?: boolean;
  responsive?: boolean;
}

export interface GraphData {
  id: string;
  type: 'network' | 'tree' | 'flow';
  title: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  layout: GraphLayout;
}

export interface GraphNode {
  id: string;
  label: string;
  group?: string;
  size?: number;
  color?: string;
  metadata?: any;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight?: number;
  label?: string;
  color?: string;
}

export interface GraphLayout {
  type: 'force' | 'circle' | 'tree' | 'grid';
  spacing?: number;
  iterations?: number;
}

export interface TableData {
  id: string;
  title: string;
  columns: TableColumn[];
  rows: TableRow[];
  sortable?: boolean;
  filterable?: boolean;
  pagination?: TablePagination;
}

export interface TableColumn {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'status';
  sortable?: boolean;
  width?: number;
}

export interface TableRow {
  id: string;
  data: Record<string, any>;
  status?: 'normal' | 'warning' | 'error' | 'highlight';
}

export interface TablePagination {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
}

export interface AlertVisualization {
  id: string;
  type: 'toast' | 'banner' | 'modal' | 'sidebar';
  level: 'info' | 'success' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  actions?: AlertAction[];
  autoClose?: number;
  persistent?: boolean;
}

export interface AlertAction {
  label: string;
  action: string;
  style: 'primary' | 'secondary' | 'danger';
}

export interface InteractionState {
  selectedTab: string;
  selectedTimeRange: TimeRange;
  filters: FilterState;
  zoom: ZoomState;
  preferences: UserPreferences;
}

export interface TimeRange {
  start: Date;
  end: Date;
  preset?: 'last_hour' | 'last_24h' | 'last_7d' | 'last_30d' | 'custom';
}

export interface FilterState {
  categories: string[];
  levels: string[];
  tags: string[];
  search: string;
}

export interface ZoomState {
  level: number;
  center: { x: number; y: number };
  bounds?: { min: number; max: number };
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  layout: 'compact' | 'comfortable' | 'spacious';
  animations: boolean;
  notifications: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
}

export interface CustomizationSettings {
  dashboardLayout: DashboardLayout;
  widgetConfigs: WidgetConfig[];
  colorScheme: ColorScheme;
  chartDefaults: ChartOptions;
}

export interface DashboardLayout {
  columns: number;
  rows: number;
  widgets: WidgetPosition[];
  responsive: boolean;
}

export interface WidgetPosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
}

export interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  dataSource: string;
  refreshInterval: number;
  visible: boolean;
  collapsed: boolean;
  settings: Record<string, any>;
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  background: string;
  surface: string;
  text: string;
}

export class HUDEnhancer {
  private payloadManager: HUDPayloadManager;
  private enhancedState: EnhancedHUDState;
  private updateCallbacks: ((state: EnhancedHUDState) => void)[] = [];
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor(payloadManager: HUDPayloadManager = hudPayloadManager) {
    this.payloadManager = payloadManager;
    this.enhancedState = this.initializeState();
    this.startAutoRefresh();
  }

  /**
   * Get current enhanced HUD state
   */
  getEnhancedState(): EnhancedHUDState {
    return { ...this.enhancedState };
  }

  /**
   * Subscribe to state updates
   */
  subscribe(callback: (state: EnhancedHUDState) => void): () => void {
    this.updateCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.updateCallbacks.indexOf(callback);
      if (index > -1) {
        this.updateCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Update interaction state
   */
  updateInteraction(updates: Partial<InteractionState>): void {
    this.enhancedState.interactions = {
      ...this.enhancedState.interactions,
      ...updates
    };
    this.notifySubscribers();
  }

  /**
   * Update customization settings
   */
  updateCustomization(updates: Partial<CustomizationSettings>): void {
    this.enhancedState.customization = {
      ...this.enhancedState.customization,
      ...updates
    };
    this.notifySubscribers();
  }

  /**
   * Generate memory pulse visualization
   */
  generateMemoryPulseVisualization(): ChartData {
    const payload = this.payloadManager.getCurrentPayload();
    if (!payload) {
      return this.createEmptyChart('memory-pulse', 'Memory Pulse');
    }

    const pulse = payload.performance.memoryPulse;
    const history = this.payloadManager.getPayloadHistory(50);
    
    const pulseData = history.map((p, index) => ({
      x: index,
      y: p.performance.memoryPulse.heartbeat,
      timestamp: p.timestamp,
      latency: p.performance.memoryPulse.latency,
      utilization: p.performance.memoryPulse.utilization
    }));

    return {
      id: 'memory-pulse',
      type: 'line',
      title: 'Memory Pulse',
      data: pulseData,
      options: {
        height: 200,
        colors: ['#10B981', '#3B82F6', '#F59E0B'],
        animate: true,
        showLegend: true,
        showTooltips: true,
        responsive: true
      },
      timestamp: new Date()
    };
  }

  /**
   * Generate kernel heatmap visualization
   */
  generateKernelHeatmap(): ChartData {
    const payload = this.payloadManager.getCurrentPayload();
    if (!payload) {
      return this.createEmptyChart('kernel-heatmap', 'Kernel Performance Heatmap');
    }

    const heatmapData = payload.analytics.heatmaps.kernel;
    
    return {
      id: 'kernel-heatmap',
      type: 'heatmap',
      title: 'Kernel Performance Heatmap',
      data: {
        matrix: heatmapData.matrix,
        labels: heatmapData.labels,
        maxValue: heatmapData.maxValue,
        minValue: heatmapData.minValue
      },
      options: {
        height: 300,
        colors: ['#EF4444', '#F59E0B', '#10B981'],
        showTooltips: true,
        responsive: true
      },
      timestamp: new Date()
    };
  }

  /**
   * Generate plugin health visualization
   */
  generatePluginHealthVisualization(): ChartData {
    const payload = this.payloadManager.getCurrentPayload();
    if (!payload) {
      return this.createEmptyChart('plugin-health', 'Plugin Health');
    }

    const pluginHealth = payload.metrics.plugins.pluginHealth;
    const healthData = Object.values(pluginHealth).map(plugin => ({
      name: plugin.name,
      performance: plugin.performance,
      status: plugin.status,
      responseTime: plugin.responseTime,
      errorCount: plugin.errorCount
    }));

    return {
      id: 'plugin-health',
      type: 'bar',
      title: 'Plugin Health Status',
      data: healthData,
      options: {
        height: 250,
        colors: ['#10B981', '#F59E0B', '#EF4444'],
        showLegend: true,
        showTooltips: true,
        responsive: true
      },
      timestamp: new Date()
    };
  }

  /**
   * Generate swarm consensus visualization
   */
  generateSwarmConsensusVisualization(): GraphData {
    const swarmState = swarmHive.exportSwarmState();
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Create nodes for swarm members
    swarmState.nodes.forEach(node => {
      nodes.push({
        id: node.id,
        label: `${node.nodeType}\n${node.id.substring(0, 8)}`,
        group: node.status,
        size: node.validationScore * 20 + 10,
        color: this.getNodeColor(node.status),
        metadata: {
          status: node.status,
          validationScore: node.validationScore,
          performance: node.metadata.performance
        }
      });
    });

    // Create edges for consensus relationships
    // Simplified: connect all active nodes to each other
    const activeNodes = swarmState.nodes.filter(n => n.status === 'active' || n.status === 'validating');
    for (let i = 0; i < activeNodes.length; i++) {
      for (let j = i + 1; j < activeNodes.length; j++) {
        edges.push({
          source: activeNodes[i].id,
          target: activeNodes[j].id,
          weight: Math.min(activeNodes[i].validationScore, activeNodes[j].validationScore),
          color: '#6B7280'
        });
      }
    }

    return {
      id: 'swarm-consensus',
      type: 'network',
      title: 'Swarm Consensus Network',
      nodes,
      edges,
      layout: {
        type: 'force',
        spacing: 100,
        iterations: 50
      }
    };
  }

  /**
   * Generate retention analytics table
   */
  generateRetentionTable(): TableData {
    const weeklyReport = this.payloadManager.generateWeeklyReport();
    
    const columns: TableColumn[] = [
      { key: 'date', label: 'Date', type: 'date', sortable: true },
      { key: 'retained', label: 'Retained', type: 'number', sortable: true },
      { key: 'total', label: 'Total', type: 'number', sortable: true },
      { key: 'rate', label: 'Rate', type: 'number', sortable: true },
      { key: 'status', label: 'Status', type: 'status', sortable: false }
    ];

    const rows: TableRow[] = weeklyReport.retention.dropoffPoints.map((point, index) => ({
      id: `retention-${index}`,
      data: {
        date: new Date(Date.now() - index * 24 * 60 * 60 * 1000),
        retained: Math.floor(Math.random() * 100),
        total: 100,
        rate: (80 + Math.random() * 20) / 100,
        status: Math.random() > 0.8 ? 'warning' : 'normal'
      },
      status: Math.random() > 0.8 ? 'warning' : 'normal'
    }));

    return {
      id: 'retention-table',
      title: 'Weekly Retention Analysis',
      columns,
      rows,
      sortable: true,
      filterable: true,
      pagination: {
        currentPage: 1,
        totalPages: Math.ceil(rows.length / 10),
        pageSize: 10,
        totalItems: rows.length
      }
    };
  }

  /**
   * Generate logic forecast visualization
   */
  generateLogicForecastVisualization(): ChartData {
    const payload = this.payloadManager.getCurrentPayload();
    if (!payload) {
      return this.createEmptyChart('logic-forecast', 'Logic Forecasts');
    }

    const forecasts = payload.analytics.forecasts;
    const forecastData = [
      ...forecasts.memoryGrowth.map(point => ({
        timestamp: point.timestamp,
        memory: point.value,
        confidence: point.confidence
      })),
      ...forecasts.pluginLoad.map(point => ({
        timestamp: point.timestamp,
        plugins: point.value,
        confidence: point.confidence
      }))
    ];

    return {
      id: 'logic-forecast',
      type: 'line',
      title: 'Logic Forecasts',
      data: forecastData,
      options: {
        height: 300,
        colors: ['#8B5CF6', '#06B6D4', '#F59E0B'],
        animate: true,
        showLegend: true,
        showTooltips: true,
        responsive: true
      },
      timestamp: new Date()
    };
  }

  /**
   * Refresh enhanced state with latest data
   */
  refresh(): void {
    const payload = this.payloadManager.generatePayload();
    
    this.enhancedState.payload = payload;
    this.enhancedState.visualizations = this.generateVisualizations(payload);
    
    this.notifySubscribers();
  }

  /**
   * Export current state for analysis
   */
  exportState(): {
    timestamp: Date;
    state: EnhancedHUDState;
    metadata: {
      version: string;
      session: string;
      userAgent?: string;
    };
  } {
    return {
      timestamp: new Date(),
      state: this.getEnhancedState(),
      metadata: {
        version: '1.0.0',
        session: this.enhancedState.payload.sessionId,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
      }
    };
  }

  /**
   * Start auto-refresh timer
   */
  startAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    const interval = this.enhancedState.interactions.preferences.refreshInterval || 5000;
    this.refreshTimer = setInterval(() => {
      if (this.enhancedState.interactions.preferences.autoRefresh) {
        this.refresh();
      }
    }, interval);
  }

  /**
   * Stop auto-refresh timer
   */
  stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private initializeState(): EnhancedHUDState {
    const payload = this.payloadManager.generatePayload();
    
    return {
      payload,
      visualizations: this.generateVisualizations(payload),
      interactions: {
        selectedTab: 'overview',
        selectedTimeRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000),
          end: new Date(),
          preset: 'last_24h'
        },
        filters: {
          categories: [],
          levels: [],
          tags: [],
          search: ''
        },
        zoom: {
          level: 1,
          center: { x: 0, y: 0 }
        },
        preferences: {
          theme: 'light',
          layout: 'comfortable',
          animations: true,
          notifications: true,
          autoRefresh: true,
          refreshInterval: 5000
        }
      },
      customization: {
        dashboardLayout: {
          columns: 12,
          rows: 8,
          widgets: [],
          responsive: true
        },
        widgetConfigs: [],
        colorScheme: {
          primary: '#3B82F6',
          secondary: '#6B7280',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#06B6D4',
          background: '#FFFFFF',
          surface: '#F9FAFB',
          text: '#1F2937'
        },
        chartDefaults: {
          responsive: true,
          animate: true,
          showLegend: true,
          showTooltips: true
        }
      }
    };
  }

  private generateVisualizations(payload: HUDPayload): VisualizationData {
    return {
      charts: [
        this.generateMemoryPulseVisualization(),
        this.generateKernelHeatmap(),
        this.generatePluginHealthVisualization(),
        this.generateLogicForecastVisualization()
      ],
      graphs: [
        this.generateSwarmConsensusVisualization()
      ],
      tables: [
        this.generateRetentionTable()
      ],
      alerts: this.generateAlertVisualizations(payload.alerts)
    };
  }

  private generateAlertVisualizations(alerts: any[]): AlertVisualization[] {
    return alerts.map(alert => ({
      id: alert.id,
      type: 'toast',
      level: alert.level,
      title: alert.title,
      message: alert.message,
      actions: [
        { label: 'Acknowledge', action: 'acknowledge', style: 'primary' },
        { label: 'Dismiss', action: 'dismiss', style: 'secondary' }
      ],
      autoClose: alert.level === 'info' ? 5000 : undefined,
      persistent: alert.level === 'critical'
    }));
  }

  private createEmptyChart(id: string, title: string): ChartData {
    return {
      id,
      type: 'line',
      title,
      data: [],
      options: {
        height: 200,
        colors: ['#6B7280'],
        responsive: true
      },
      timestamp: new Date()
    };
  }

  private getNodeColor(status: string): string {
    switch (status) {
      case 'active': return '#10B981';
      case 'validating': return '#3B82F6';
      case 'joining': return '#F59E0B';
      case 'inactive': return '#6B7280';
      case 'failed': return '#EF4444';
      default: return '#6B7280';
    }
  }

  private notifySubscribers(): void {
    this.updateCallbacks.forEach(callback => {
      try {
        callback(this.enhancedState);
      } catch (error) {
        console.error('Error in HUD enhancer callback:', error);
      }
    });
  }
}

// Singleton instance
export const hudEnhancer = new HUDEnhancer();