/**
 * MCP Management UI Component
 * Provides visual management interface for Modular Compute Pods with drag/drop, enable/disable, and status monitoring
 */

import React, { useState, useEffect, useCallback } from 'react';
import { mcpRegistry, MCPMetadata, MCPAuditEntry, createMCPCallContext } from '../mcps/registry';
import { securityMiddleware, UserSession } from '../security/middleware';

interface MCPManagementProps {
  session: UserSession;
  onMCPAction?: (action: string, mcpId: string, success: boolean) => void;
  compactMode?: boolean;
}

interface MCPInstallFormData {
  id: string;
  name: string;
  version: string;
  description: string;
  type: 'external_api' | 'internal_api' | 'logic_agent' | 'function_wrapper';
  apiEndpoint: string;
  authRequired: boolean;
  capabilities: string[];
  brandAffinity: string[];
  persona: string;
  githubRepositoryUrl: string;
  autoUpdate: boolean;
}

interface DraggedMCP {
  mcpId: string;
  enabled: boolean;
}

export default function MCPManagement({ session, onMCPAction, compactMode = false }: MCPManagementProps) {
  const [mcps, setMCPs] = useState<MCPMetadata[]>([]);
  const [stats, setStats] = useState({
    totalMCPs: 0,
    activeMCPs: 0,
    healthyMCPs: 0,
    failedMCPs: 0,
    healthChecksActive: 0,
    totalAuditEntries: 0
  });
  const [auditTrail, setAuditTrail] = useState<MCPAuditEntry[]>([]);
  const [selectedMCP, setSelectedMCP] = useState<string | null>(null);
  const [showInstallForm, setShowInstallForm] = useState(false);
  const [showAuditPanel, setShowAuditPanel] = useState(false);
  const [draggedMCP, setDraggedMCP] = useState<DraggedMCP | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [installForm, setInstallForm] = useState<MCPInstallFormData>({
    id: '',
    name: '',
    version: '1.0.0',
    description: '',
    type: 'external_api',
    apiEndpoint: '',
    authRequired: true,
    capabilities: [],
    brandAffinity: ['JRVI'],
    persona: 'default',
    githubRepositoryUrl: '',
    autoUpdate: false
  });

  // Load MCP data
  const loadMCPData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get all MCPs
      const allMCPs = Object.values(mcpRegistry.getRegistry().mcps);
      setMCPs(allMCPs);
      
      // Get statistics
      const registryStats = mcpRegistry.getRegistryStats();
      setStats(registryStats);
      
      // Get recent audit trail
      const trail = mcpRegistry.getAuditTrail(undefined, 50);
      setAuditTrail(trail);
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load MCP data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMCPData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(loadMCPData, 30000);
    return () => clearInterval(interval);
  }, [loadMCPData]);

  // Handle MCP enable/disable
  const handleMCPToggle = async (mcpId: string, enabled: boolean, rationale: string) => {
    try {
      setLoading(true);
      
      let success: boolean;
      if (enabled) {
        success = await mcpRegistry.enableMCP(mcpId, session, rationale);
      } else {
        success = await mcpRegistry.disableMCP(mcpId, session, rationale);
      }
      
      if (success) {
        setSuccess(`MCP ${enabled ? 'enabled' : 'disabled'} successfully`);
        onMCPAction?.(enabled ? 'enable' : 'disable', mcpId, true);
        await loadMCPData();
      } else {
        setError(`Failed to ${enabled ? 'enable' : 'disable'} MCP`);
        onMCPAction?.(enabled ? 'enable' : 'disable', mcpId, false);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      onMCPAction?.(enabled ? 'enable' : 'disable', mcpId, false);
    } finally {
      setLoading(false);
    }
  };

  // Handle MCP installation
  const handleMCPInstall = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!installForm.id || !installForm.name || !installForm.version) {
      setError('Please fill in all required fields');
      return;
    }
    
    try {
      setLoading(true);
      
      const result = await mcpRegistry.installMCP(
        {
          id: installForm.id,
          name: installForm.name,
          version: installForm.version,
          description: installForm.description,
          type: installForm.type,
          apiEndpoint: installForm.apiEndpoint || undefined,
          authRequired: installForm.authRequired,
          capabilities: installForm.capabilities,
          brandAffinity: installForm.brandAffinity,
          persona: installForm.persona,
          githubIntegration: {
            repositoryUrl: installForm.githubRepositoryUrl,
            autoUpdate: installForm.autoUpdate,
            updateBranch: 'main',
            lastSync: new Date().toISOString()
          }
        },
        session,
        {
          rationale: `Manual installation by ${session.userId}`,
          persona: installForm.persona,
          brandContext: installForm.brandAffinity
        }
      );
      
      if (result.success) {
        setSuccess(`MCP "${installForm.name}" installed successfully`);
        setShowInstallForm(false);
        setInstallForm({
          id: '',
          name: '',
          version: '1.0.0',
          description: '',
          type: 'external_api',
          apiEndpoint: '',
          authRequired: true,
          capabilities: [],
          brandAffinity: ['JRVI'],
          persona: 'default',
          githubRepositoryUrl: '',
          autoUpdate: false
        });
        onMCPAction?.('install', result.mcpId!, true);
        await loadMCPData();
      } else {
        setError(result.error || 'Installation failed');
        onMCPAction?.('install', installForm.id, false);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Installation failed';
      setError(errorMsg);
      onMCPAction?.('install', installForm.id, false);
    } finally {
      setLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, mcp: MCPMetadata) => {
    setDraggedMCP({ mcpId: mcp.id, enabled: mcp.enabled });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetZone: 'enabled' | 'disabled') => {
    e.preventDefault();
    
    if (!draggedMCP) return;
    
    const shouldEnable = targetZone === 'enabled';
    if (draggedMCP.enabled !== shouldEnable) {
      await handleMCPToggle(
        draggedMCP.mcpId, 
        shouldEnable,
        `Drag and drop ${shouldEnable ? 'enable' : 'disable'} by ${session.userId}`
      );
    }
    
    setDraggedMCP(null);
  };

  // Helper functions
  const getHealthStatusColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'inactive': return 'bg-gray-500';
      case 'maintenance': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  // Auto-clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(clearMessages, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  if (compactMode) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-white rounded-lg shadow-lg border p-3 max-w-sm">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900">MCPs</h4>
            <span className="text-xs text-gray-500">{stats.activeMCPs}/{stats.totalMCPs}</span>
          </div>
          
          <div className="grid grid-cols-4 gap-1">
            {mcps.slice(0, 8).map(mcp => (
              <div
                key={mcp.id}
                className={`w-6 h-6 rounded-sm ${getStatusColor(mcp.status)} ${
                  mcp.enabled ? 'opacity-100' : 'opacity-50'
                }`}
                title={`${mcp.name} - ${mcp.status} (${mcp.health})`}
              />
            ))}
          </div>
          
          {stats.failedMCPs > 0 && (
            <div className="mt-1 text-xs text-red-600">
              {stats.failedMCPs} failed
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">MCP Management</h3>
            <p className="text-sm text-gray-500">Modular Compute Pods - API Wrappers & Logic Agents</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAuditPanel(!showAuditPanel)}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              📋 Audit ({auditTrail.length})
            </button>
            
            <button
              onClick={() => setShowInstallForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
              disabled={loading}
            >
              + Install MCP
            </button>
            
            <button
              onClick={loadMCPData}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
              disabled={loading}
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.totalMCPs}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.activeMCPs}</div>
            <div className="text-xs text-gray-500">Active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.healthyMCPs}</div>
            <div className="text-xs text-gray-500">Healthy</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.failedMCPs}</div>
            <div className="text-xs text-gray-500">Failed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.healthChecksActive}</div>
            <div className="text-xs text-gray-500">Monitoring</div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {(error || success) && (
        <div className="p-4 border-b border-gray-200">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-2">
              <div className="flex items-center">
                <span className="text-red-600">❌</span>
                <span className="ml-2 text-sm text-red-700">{error}</span>
                <button
                  onClick={clearMessages}
                  className="ml-auto text-red-600 hover:text-red-800"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex items-center">
                <span className="text-green-600">✅</span>
                <span className="ml-2 text-sm text-green-700">{success}</span>
                <button
                  onClick={clearMessages}
                  className="ml-auto text-green-600 hover:text-green-800"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="p-4">
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Loading MCPs...</p>
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Enabled MCPs */}
            <div
              className="border-2 border-dashed border-green-300 rounded-lg p-4 min-h-64"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'enabled')}
            >
              <h4 className="font-medium text-green-700 mb-3 flex items-center">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                Enabled MCPs ({mcps.filter(m => m.enabled).length})
              </h4>
              
              <div className="space-y-2">
                {mcps.filter(m => m.enabled).map(mcp => (
                  <div
                    key={mcp.id}
                    className="bg-white border border-gray-200 rounded-lg p-3 cursor-move hover:shadow-sm"
                    draggable
                    onDragStart={(e) => handleDragStart(e, mcp)}
                    onClick={() => setSelectedMCP(selectedMCP === mcp.id ? null : mcp.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(mcp.status)}`} />
                        <span className="font-medium text-gray-900">{mcp.name}</span>
                        <span className="text-xs text-gray-500">v{mcp.version}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getHealthStatusColor(mcp.health)}`}>
                          {mcp.health}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMCPToggle(mcp.id, false, `Manual disable by ${session.userId}`);
                          }}
                          className="text-xs text-red-600 hover:text-red-800"
                          title="Disable MCP"
                        >
                          ⏸️
                        </button>
                        <span className="text-xs text-gray-400">⋮⋮</span>
                      </div>
                    </div>
                    
                    {selectedMCP === mcp.id && (
                      <div className="mt-3 pt-3 border-t border-gray-100 text-xs space-y-1">
                        <div><strong>Type:</strong> {mcp.type}</div>
                        <div><strong>Persona:</strong> {mcp.persona}</div>
                        <div><strong>Brand Affinity:</strong> {mcp.brandAffinity.join(', ')}</div>
                        <div><strong>Capabilities:</strong> {mcp.capabilities.join(', ')}</div>
                        <div><strong>Last Health Check:</strong> {mcp.lastHealthCheck ? new Date(mcp.lastHealthCheck).toLocaleString() : 'Never'}</div>
                        <div><strong>Failures:</strong> {mcp.failureCount}/{mcp.maxFailures}</div>
                        {mcp.githubIntegration.repositoryUrl && (
                          <div>
                            <strong>GitHub:</strong> 
                            <a href={mcp.githubIntegration.repositoryUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                              {mcp.githubIntegration.repositoryUrl}
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                
                {mcps.filter(m => m.enabled).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No enabled MCPs</p>
                    <p className="text-xs mt-1">Drag MCPs here to enable them</p>
                  </div>
                )}
              </div>
            </div>

            {/* Disabled MCPs */}
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-64"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'disabled')}
            >
              <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                <span className="w-3 h-3 bg-gray-500 rounded-full mr-2"></span>
                Disabled MCPs ({mcps.filter(m => !m.enabled).length})
              </h4>
              
              <div className="space-y-2">
                {mcps.filter(m => !m.enabled).map(mcp => (
                  <div
                    key={mcp.id}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-3 cursor-move hover:shadow-sm opacity-75"
                    draggable
                    onDragStart={(e) => handleDragStart(e, mcp)}
                    onClick={() => setSelectedMCP(selectedMCP === mcp.id ? null : mcp.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(mcp.status)}`} />
                        <span className="font-medium text-gray-700">{mcp.name}</span>
                        <span className="text-xs text-gray-500">v{mcp.version}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getHealthStatusColor(mcp.health)}`}>
                          {mcp.health}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMCPToggle(mcp.id, true, `Manual enable by ${session.userId}`);
                          }}
                          className="text-xs text-green-600 hover:text-green-800"
                          title="Enable MCP"
                        >
                          ▶️
                        </button>
                        <span className="text-xs text-gray-400">⋮⋮</span>
                      </div>
                    </div>
                    
                    {selectedMCP === mcp.id && (
                      <div className="mt-3 pt-3 border-t border-gray-100 text-xs space-y-1">
                        <div><strong>Reason:</strong> {mcp.status === 'failed' ? `Auto-disabled (${mcp.failureCount} failures)` : 'Manually disabled'}</div>
                        <div><strong>Type:</strong> {mcp.type}</div>
                        <div><strong>Persona:</strong> {mcp.persona}</div>
                        <div><strong>Brand Affinity:</strong> {mcp.brandAffinity.join(', ')}</div>
                      </div>
                    )}
                  </div>
                ))}
                
                {mcps.filter(m => !m.enabled).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No disabled MCPs</p>
                    <p className="text-xs mt-1">Drag MCPs here to disable them</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Audit Panel */}
      {showAuditPanel && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-gray-200 shadow-lg z-50 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">MCP Audit Trail</h4>
              <button
                onClick={() => setShowAuditPanel(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Last {auditTrail.length} actions</p>
          </div>
          
          <div className="p-4 space-y-3">
            {auditTrail.map(entry => (
              <div key={entry.id} className="border border-gray-200 rounded-lg p-3 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-medium ${entry.success ? 'text-green-600' : 'text-red-600'}`}>
                    {entry.action}
                  </span>
                  <span className="text-gray-500">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                
                <div className="space-y-1 text-gray-600">
                  <div><strong>Trace ID:</strong> {entry.traceId}</div>
                  <div><strong>Persona:</strong> {entry.persona}</div>
                  <div><strong>Brand:</strong> {entry.brandContext.join(', ')}</div>
                  <div><strong>Rationale:</strong> {entry.rationale}</div>
                  {entry.error && (
                    <div className="text-red-600"><strong>Error:</strong> {entry.error}</div>
                  )}
                </div>
              </div>
            ))}
            
            {auditTrail.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No audit entries found
              </div>
            )}
          </div>
        </div>
      )}

      {/* Install Form Modal */}
      {showInstallForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Install New MCP</h3>
                <button
                  onClick={() => setShowInstallForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={handleMCPInstall} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      MCP ID*
                    </label>
                    <input
                      type="text"
                      value={installForm.id}
                      onChange={(e) => setInstallForm({...installForm, id: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="e.g., openai_api"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name*
                    </label>
                    <input
                      type="text"
                      value={installForm.name}
                      onChange={(e) => setInstallForm({...installForm, name: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="e.g., OpenAI API Wrapper"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Version*
                    </label>
                    <input
                      type="text"
                      value={installForm.version}
                      onChange={(e) => setInstallForm({...installForm, version: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="1.0.0"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      value={installForm.type}
                      onChange={(e) => setInstallForm({...installForm, type: e.target.value as any})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="external_api">External API</option>
                      <option value="internal_api">Internal API</option>
                      <option value="logic_agent">Logic Agent</option>
                      <option value="function_wrapper">Function Wrapper</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={installForm.description}
                    onChange={(e) => setInstallForm({...installForm, description: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    rows={3}
                    placeholder="Describe the MCP's functionality..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Endpoint
                  </label>
                  <input
                    type="url"
                    value={installForm.apiEndpoint}
                    onChange={(e) => setInstallForm({...installForm, apiEndpoint: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="https://api.example.com/v1"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Persona
                    </label>
                    <input
                      type="text"
                      value={installForm.persona}
                      onChange={(e) => setInstallForm({...installForm, persona: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="default"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Brand Affinity
                    </label>
                    <input
                      type="text"
                      value={installForm.brandAffinity.join(', ')}
                      onChange={(e) => setInstallForm({
                        ...installForm, 
                        brandAffinity: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                      })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="JRVI, NKTA"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Capabilities
                  </label>
                  <input
                    type="text"
                    value={installForm.capabilities.join(', ')}
                    onChange={(e) => setInstallForm({
                      ...installForm, 
                      capabilities: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                    })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="text_generation, api_calls, data_processing"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GitHub Repository URL
                  </label>
                  <input
                    type="url"
                    value={installForm.githubRepositoryUrl}
                    onChange={(e) => setInstallForm({...installForm, githubRepositoryUrl: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="https://github.com/owner/repo"
                  />
                </div>
                
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={installForm.authRequired}
                      onChange={(e) => setInstallForm({...installForm, authRequired: e.target.checked})}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Requires Authentication</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={installForm.autoUpdate}
                      onChange={(e) => setInstallForm({...installForm, autoUpdate: e.target.checked})}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Auto-Update from GitHub</span>
                  </label>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowInstallForm(false)}
                    className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Installing...' : 'Install MCP'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close audit panel */}
      {showAuditPanel && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowAuditPanel(false)}
        />
      )}
    </div>
  );
}