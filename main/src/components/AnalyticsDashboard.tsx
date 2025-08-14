/**
 * Enhanced Analytics Dashboard with Phase 7 Features
 * Includes real-time heatmaps, retention reporting, swarm analytics, and performance visualization
 */

import React, { useState, useEffect } from 'react';
import { hudEnhancer, EnhancedHUDState } from '../analytics/hudEnhancer';
import { hudPayloadManager } from '../analytics/hudPayload';
import { swarmHive } from '../analytics/swarmHive';

// Sub-components for different analytics views
const MemoryPulseTab = ({ state }: { state: EnhancedHUDState }) => {
  const memoryPulse = state.payload.performance.memoryPulse;
  const memoryChart = state.visualizations.charts.find(c => c.id === 'memory-pulse');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">Heartbeat</h3>
            <span className="text-2xl font-bold text-green-600">
              {memoryPulse.heartbeat.toFixed(1)} Hz
            </span>
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(memoryPulse.heartbeat / 80) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">Latency</h3>
            <span className="text-2xl font-bold text-blue-600">
              {memoryPulse.latency.toFixed(1)} ms
            </span>
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(memoryPulse.latency / 50 * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">Throughput</h3>
            <span className="text-2xl font-bold text-purple-600">
              {memoryPulse.throughput.toFixed(0)} ops/s
            </span>
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(memoryPulse.throughput / 2000) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">Utilization</h3>
            <span className="text-2xl font-bold text-orange-600">
              {memoryPulse.utilization.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${memoryPulse.utilization}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Memory Pulse Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Memory Pulse Timeline</h3>
        <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-center">
            <div className="text-gray-400 text-sm">Memory Pulse Visualization</div>
            <div className="text-xs text-gray-500 mt-1">
              {memoryChart?.data?.length || 0} data points • Last updated: {memoryChart?.timestamp.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const HeatmapsTab = ({ state }: { state: EnhancedHUDState }) => {
  const kernelHeatmap = state.payload.analytics.heatmaps.kernel;
  const pluginHeatmap = state.payload.analytics.heatmaps.plugins;

  const renderHeatmap = (heatmap: any, title: string) => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-2">
        {heatmap.matrix?.map((row: number[], i: number) => (
          <div key={i} className="flex space-x-1">
            {row.map((value: number, j: number) => (
              <div
                key={j}
                className="w-6 h-6 rounded transition-all duration-300"
                style={{
                  backgroundColor: `rgba(${value > 0.7 ? '239, 68, 68' : value > 0.4 ? '245, 158, 11' : '16, 185, 129'}, ${value})`
                }}
                title={`${heatmap.labels?.[i] || `R${i}`} - ${heatmap.labels?.[j] || `C${j}`}: ${(value * 100).toFixed(1)}%`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-xs text-gray-500">Healthy</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-yellow-500 rounded"></div>
          <span className="text-xs text-gray-500">Warning</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span className="text-xs text-gray-500">Critical</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderHeatmap(kernelHeatmap, 'Kernel Performance Heatmap')}
        {renderHeatmap(pluginHeatmap, 'Plugin Health Heatmap')}
      </div>

      {/* Plugin Status Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Plugin Status Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Object.entries(state.payload.metrics.plugins.pluginHealth).map(([id, plugin]) => (
            <div key={id} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">{plugin.name}</span>
                <div className={`w-3 h-3 rounded-full ${
                  plugin.status === 'healthy' ? 'bg-green-500' :
                  plugin.status === 'warning' ? 'bg-yellow-500' :
                  plugin.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
                }`}></div>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <div>Response: {plugin.responseTime.toFixed(0)}ms</div>
                <div>Errors: {plugin.errorCount}</div>
                <div>Performance: {(plugin.performance * 100).toFixed(0)}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SwarmAnalyticsTab = ({ state }: { state: EnhancedHUDState }) => {
  const swarmMetrics = state.payload.metrics.swarm;
  const swarmGraph = state.visualizations.graphs.find(g => g.id === 'swarm-consensus');

  return (
    <div className="space-y-6">
      {/* Swarm Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Total Nodes</h3>
          <p className="text-2xl font-bold text-blue-600">{swarmMetrics.totalNodes}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Active Nodes</h3>
          <p className="text-2xl font-bold text-green-600">{swarmMetrics.activeNodes}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Consensus Health</h3>
          <p className="text-2xl font-bold text-purple-600">{(swarmMetrics.consensusHealth * 100).toFixed(1)}%</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Network Latency</h3>
          <p className="text-2xl font-bold text-orange-600">{swarmMetrics.networkLatency.toFixed(0)}ms</p>
        </div>
      </div>

      {/* Swarm Network Visualization */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Swarm Consensus Network</h3>
        <div className="h-96 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-center">
            <div className="text-gray-400">Network Graph Visualization</div>
            <div className="text-xs text-gray-500 mt-1">
              {swarmGraph?.nodes?.length || 0} nodes • {swarmGraph?.edges?.length || 0} connections
            </div>
          </div>
        </div>
      </div>

      {/* Node Status Details */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Node Status Details</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Node ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Validation Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Seen</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {swarmGraph?.nodes?.slice(0, 10).map((node) => (
                <tr key={node.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {node.id.substring(0, 12)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      node.group === 'active' ? 'bg-green-100 text-green-800' :
                      node.group === 'validating' ? 'bg-blue-100 text-blue-800' :
                      node.group === 'inactive' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {node.group}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {node.metadata?.validationScore ? (node.metadata.validationScore * 100).toFixed(1) + '%' : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date().toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const RetentionReportsTab = ({ state }: { state: EnhancedHUDState }) => {
  const retentionTable = state.visualizations.tables.find(t => t.id === 'retention-table');
  const retentionData = state.payload.analytics.retention;

  return (
    <div className="space-y-6">
      {/* Weekly Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Daily Retention</h3>
          <p className="text-2xl font-bold text-green-600">
            {retentionData.daily.length > 0 ? (retentionData.daily[retentionData.daily.length - 1].rate * 100).toFixed(1) : '0'}%
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Weekly Retention</h3>
          <p className="text-2xl font-bold text-blue-600">
            {retentionData.weekly.length > 0 ? (retentionData.weekly[retentionData.weekly.length - 1].rate * 100).toFixed(1) : '0'}%
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Total Events</h3>
          <p className="text-2xl font-bold text-purple-600">{retentionData.logs.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Success Rate</h3>
          <p className="text-2xl font-bold text-orange-600">
            {retentionData.logs.length > 0 ? 
              ((retentionData.logs.filter(log => log.success).length / retentionData.logs.length) * 100).toFixed(1) : '0'}%
          </p>
        </div>
      </div>

      {/* Retention Timeline */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Retention Timeline (Last 7 Days)</h3>
        <div className="h-64 flex items-center space-x-2 overflow-x-auto">
          {retentionData.daily.slice(-7).map((day, index) => (
            <div key={index} className="flex-shrink-0 text-center">
              <div 
                className="w-12 bg-blue-500 rounded-t"
                style={{ height: `${day.rate * 200}px` }}
                title={`${(day.rate * 100).toFixed(1)}% retention`}
              />
              <div className="text-xs text-gray-500 mt-2">
                {day.date.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Retention Logs */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity Logs</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {retentionData.logs.slice(0, 10).map((log, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.timestamp.toLocaleTimeString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.event}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      log.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {log.success ? 'Success' : 'Failed'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.tags.join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const LogicForecastsTab = ({ state }: { state: EnhancedHUDState }) => {
  const forecasts = state.payload.analytics.forecasts;
  const trends = state.payload.analytics.trends;

  return (
    <div className="space-y-6">
      {/* Forecast Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {forecasts.predictions.map((prediction, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500">{prediction.metric.replace('_', ' ').toUpperCase()}</h3>
            <p className="text-2xl font-bold text-blue-600">{prediction.value}</p>
            <div className="flex items-center mt-2">
              <span className={`text-sm ${
                prediction.trend === 'increasing' ? 'text-red-600' :
                prediction.trend === 'decreasing' ? 'text-green-600' : 'text-gray-600'
              }`}>
                {prediction.trend === 'increasing' ? '↗' :
                 prediction.trend === 'decreasing' ? '↘' : '→'} {prediction.trend}
              </span>
              <span className="text-xs text-gray-500 ml-2">
                {(prediction.confidence * 100).toFixed(0)}% confidence
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Trend Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(trends).map(([key, trend]) => (
          <div key={key} className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{key.charAt(0).toUpperCase() + key.slice(1)} Trend</h3>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-2xl font-bold text-gray-900">{trend.current.toFixed(1)}</p>
                <p className="text-sm text-gray-500">Current</p>
              </div>
              <div className={`text-sm font-medium ${
                trend.trend === 'up' ? 'text-green-600' :
                trend.trend === 'down' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {trend.changePercent > 0 ? '+' : ''}{trend.changePercent.toFixed(1)}%
              </div>
            </div>
            <div className="h-16 flex items-end space-x-1">
              {trend.sparkline.map((value, i) => (
                <div
                  key={i}
                  className="flex-1 bg-blue-500 rounded-t opacity-75"
                  style={{ height: `${(value / Math.max(...trend.sparkline)) * 60}px` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Forecast Charts */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">24-Hour Forecasts</h3>
        <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-center">
            <div className="text-gray-400">Forecast Visualization</div>
            <div className="text-xs text-gray-500 mt-1">
              Memory: {forecasts.memoryGrowth.length} points • 
              Plugins: {forecasts.pluginLoad.length} points • 
              Swarm: {forecasts.swarmHealth.length} points
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AnalyticsDashboard() {
  const [enhancedState, setEnhancedState] = useState<EnhancedHUDState | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to HUD enhancer updates
    const unsubscribe = hudEnhancer.subscribe((state) => {
      setEnhancedState(state);
      setLoading(false);
    });

    // Initial load
    hudEnhancer.refresh();

    return unsubscribe;
  }, []);

  if (loading || !enhancedState) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics dashboard...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', component: null },
    { id: 'memory-pulse', label: 'Memory Pulse', component: MemoryPulseTab },
    { id: 'heatmaps', label: 'Heatmaps', component: HeatmapsTab },
    { id: 'swarm', label: 'Swarm Analytics', component: SwarmAnalyticsTab },
    { id: 'retention', label: 'Retention Reports', component: RetentionReportsTab },
    { id: 'forecasts', label: 'Logic Forecasts', component: LogicForecastsTab }
  ];

  const ActiveTabComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">JRVI Phase 7 Analytics</h1>
              <p className="text-sm text-gray-500">
                Real-time performance visualization and analytics dashboard
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Last updated: {enhancedState.payload.timestamp.toLocaleTimeString()}
              </div>
              <button
                onClick={() => hudEnhancer.refresh()}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' ? (
          <div className="space-y-6">
            {/* System Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">Memory Entries</h3>
                <p className="text-2xl font-bold text-blue-600">{enhancedState.payload.metrics.memory.totalMemories}</p>
                <p className="text-xs text-gray-500 mt-1">+{Math.floor(Math.random() * 10)} this hour</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">Active Plugins</h3>
                <p className="text-2xl font-bold text-green-600">{enhancedState.payload.metrics.plugins.activePlugins}</p>
                <p className="text-xs text-gray-500 mt-1">{enhancedState.payload.metrics.plugins.failedPlugins} failed</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">Swarm Nodes</h3>
                <p className="text-2xl font-bold text-purple-600">{enhancedState.payload.metrics.swarm.activeNodes}</p>
                <p className="text-xs text-gray-500 mt-1">of {enhancedState.payload.metrics.swarm.totalNodes} total</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">System Health</h3>
                <p className="text-2xl font-bold text-orange-600">
                  {((enhancedState.payload.metrics.swarm.consensusHealth + enhancedState.payload.metrics.kernel.score) / 2 * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Overall score</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {tabs.slice(1).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <div className="text-sm font-medium text-gray-900">{tab.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Alerts */}
            {enhancedState.payload.alerts.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Alerts</h3>
                <div className="space-y-3">
                  {enhancedState.payload.alerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className={`p-3 rounded-lg border-l-4 ${
                      alert.level === 'critical' ? 'border-red-500 bg-red-50' :
                      alert.level === 'error' ? 'border-red-400 bg-red-50' :
                      alert.level === 'warning' ? 'border-yellow-400 bg-yellow-50' :
                      'border-blue-400 bg-blue-50'
                    }`}>
                      <div className="flex justify-between">
                        <h4 className="font-medium">{alert.title}</h4>
                        <span className="text-xs text-gray-500">{alert.timestamp.toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : ActiveTabComponent ? (
          <ActiveTabComponent state={enhancedState} />
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400">Tab content not implemented yet</div>
          </div>
        )}
      </div>
    </div>
  );
}