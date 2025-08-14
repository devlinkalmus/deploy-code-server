/**
 * Plugin Management HUD Tab - Phase 13 Implementation
 * Provides comprehensive plugin health monitoring, manual controls, and audit visibility
 */

import React, { useState, useEffect } from 'react';
import { pluginRegistry } from '../plugins/registry';
import { PluginFallbackEvent } from '../plugins/registry';

interface PluginManagementTabProps {
  onPluginToggle?: (pluginId: string, enabled: boolean) => void;
  onAuditEvent?: (event: any) => void;
  refreshInterval?: number;
}

interface PluginHealthStatus {
  id: string;
  name: string;
  version: string;
  brand: string;
  persona: string;
  status: 'active' | 'disabled' | 'failed' | 'fallback';
  enabled: boolean;
  health: 'healthy' | 'warning' | 'failed';
  failureCount: number;
  fallbackCount: number;
  errorRate: number;
  executionCount: number;
  avgExecutionTime: number;
  lastActivity?: Date;
}

interface MetricsOverview {
  totalPlugins: number;
  enabledPlugins: number;
  healthyPlugins: number;
  failedPlugins: number;
  totalExecutions: number;
  totalFallbacks: number;
  averageErrorRate: number;
}

export default function PluginManagementTab({ 
  onPluginToggle, 
  onAuditEvent,
  refreshInterval = 5000 
}: PluginManagementTabProps) {
  const [plugins, setPlugins] = useState<PluginHealthStatus[]>([]);
  const [metrics, setMetrics] = useState<MetricsOverview>({
    totalPlugins: 0,
    enabledPlugins: 0,
    healthyPlugins: 0,
    failedPlugins: 0,
    totalExecutions: 0,
    totalFallbacks: 0,
    averageErrorRate: 0
  });
  const [fallbackEvents, setFallbackEvents] = useState<PluginFallbackEvent[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null);
  const [showFallbackDetails, setShowFallbackDetails] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'healthy' | 'warning' | 'failed'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'failures' | 'fallbacks'>('name');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPluginData();
    const interval = setInterval(loadPluginData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const loadPluginData = async () => {
    try {
      setLoading(true);
      
      // Get comprehensive plugin metrics
      const pluginMetrics = pluginRegistry.getPluginMetrics();
      
      setMetrics(pluginMetrics.overview);
      setPlugins(pluginMetrics.plugins);
      
      // Get recent fallback events
      const recentFallbacks = pluginRegistry.getFallbackEvents({ limit: 20 });
      setFallbackEvents(recentFallbacks);

    } catch (error) {
      console.error('Failed to load plugin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePluginToggle = async (pluginId: string, enabled: boolean) => {
    try {
      // For now, we'll simulate a user session
      const mockSession = { userId: 'admin', sessionId: 'admin-session' };
      
      const result = await pluginRegistry.setPluginEnabled(
        pluginId, 
        enabled, 
        mockSession as any,
        `Manual toggle via HUD by admin`
      );

      if (result.success) {
        // Refresh data
        await loadPluginData();
        
        // Notify parent
        onPluginToggle?.(pluginId, enabled);
        
        // Log audit event
        onAuditEvent?.({
          timestamp: new Date(),
          action: enabled ? 'plugin_enabled' : 'plugin_disabled',
          target: pluginId,
          operator: 'admin',
          source: 'plugin_management_hud'
        });
      } else {
        alert(`Failed to ${enabled ? 'enable' : 'disable'} plugin: ${result.error}`);
      }
    } catch (error) {
      console.error('Plugin toggle failed:', error);
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const getFilteredPlugins = () => {
    let filtered = plugins;
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(plugin => plugin.health === filterStatus);
    }

    // Sort plugins
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'failures':
          return b.failureCount - a.failureCount;
        case 'fallbacks':
          return b.fallbackCount - a.fallbackCount;
        default:
          return 0;
      }
    });

    return filtered;
  };

  const getStatusColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (health: string) => {
    switch (health) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'failed': return '❌';
      default: return '⭕';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="bg-white rounded-lg shadow border">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Plugin Management</h3>
            <p className="text-sm text-gray-600">
              Monitor plugin health, manage versions, and control fallback behavior
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {loading && (
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            )}
            <button
              onClick={loadPluginData}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 p-4 bg-gray-50">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{metrics.totalPlugins}</div>
          <div className="text-xs text-gray-600">Total Plugins</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{metrics.enabledPlugins}</div>
          <div className="text-xs text-gray-600">Enabled</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{metrics.healthyPlugins}</div>
          <div className="text-xs text-gray-600">Healthy</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{metrics.failedPlugins}</div>
          <div className="text-xs text-gray-600">Failed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{metrics.totalExecutions.toLocaleString()}</div>
          <div className="text-xs text-gray-600">Executions</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{metrics.totalFallbacks}</div>
          <div className="text-xs text-gray-600">Fallbacks</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-700">{formatPercentage(metrics.averageErrorRate)}</div>
          <div className="text-xs text-gray-600">Avg Error Rate</div>
        </div>
      </div>

      {/* Controls */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Filter:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="all">All Plugins</option>
                <option value="healthy">Healthy</option>
                <option value="warning">Warning</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="name">Name</option>
                <option value="status">Status</option>
                <option value="failures">Failures</option>
                <option value="fallbacks">Fallbacks</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFallbackDetails(!showFallbackDetails)}
              className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
            >
              {showFallbackDetails ? 'Hide' : 'Show'} Fallback Events
            </button>
          </div>
        </div>
      </div>

      {/* Plugin List */}
      <div className="max-h-96 overflow-y-auto">
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plugin</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Health</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Failures</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fallbacks</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performance</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {getFilteredPlugins().map((plugin) => (
              <tr key={plugin.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{plugin.name}</div>
                    <div className="text-xs text-gray-500">{plugin.brand} • {plugin.persona}</div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(plugin.health)}`}>
                    {getStatusIcon(plugin.health)} {plugin.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">{plugin.version}</td>
                <td className="px-4 py-3">
                  <div className="text-sm">
                    <div className="text-gray-900">{plugin.health}</div>
                    {plugin.lastActivity && (
                      <div className="text-xs text-gray-500">
                        Last: {plugin.lastActivity.toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm">
                    <div className="text-gray-900">{plugin.failureCount}</div>
                    <div className="text-xs text-gray-500">
                      {formatPercentage(plugin.errorRate)} error rate
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">{plugin.fallbackCount}</td>
                <td className="px-4 py-3">
                  <div className="text-sm">
                    <div className="text-gray-900">{plugin.executionCount} runs</div>
                    <div className="text-xs text-gray-500">
                      {formatDuration(plugin.avgExecutionTime)} avg
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePluginToggle(plugin.id, !plugin.enabled)}
                      className={`px-2 py-1 text-xs rounded ${
                        plugin.enabled
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {plugin.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => setSelectedPlugin(plugin.id === selectedPlugin ? null : plugin.id)}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      Details
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Plugin Details Panel */}
      {selectedPlugin && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="mb-2">
            <span className="text-sm font-medium text-gray-700">
              Details for: {plugins.find(p => p.id === selectedPlugin)?.name}
            </span>
            <button
              onClick={() => setSelectedPlugin(null)}
              className="float-right text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Plugin ID</div>
              <div className="font-medium">{selectedPlugin}</div>
            </div>
            {/* Add more plugin details here */}
          </div>
        </div>
      )}

      {/* Fallback Events Panel */}
      {showFallbackDetails && (
        <div className="border-t border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Fallback Events</h4>
          {fallbackEvents.length > 0 ? (
            <div className="max-h-48 overflow-y-auto">
              {fallbackEvents.map((event) => (
                <div key={event.id} className="flex justify-between items-start py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{event.pluginId}</div>
                    <div className="text-xs text-gray-600">{event.reason}</div>
                    <div className="text-xs text-gray-500">
                      {event.fromVersion} → {event.toVersion || 'fallback'} • {event.persona}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs ${event.success ? 'text-green-600' : 'text-red-600'}`}>
                      {event.success ? 'Success' : 'Failed'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {event.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 text-center py-4">
              No fallback events recorded
            </div>
          )}
        </div>
      )}
    </div>
  );
}