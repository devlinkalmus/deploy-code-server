/**
 * Swap Monitor Tab Component
 * Real-time visualization of kernel and component swap status
 * Part of Phase 12 implementation for JRVI
 */

import React, { useState, useEffect, useCallback } from 'react';
import { swapMonitor, SwapEvent, KernelStatus, ComponentStatus } from '../kernel/swap-monitor';
import SwapHistoryExport from './SwapHistoryExport';

interface SwapMonitorTabProps {
  onSwapInitiated?: (eventId: string) => void;
  onApprovalRequired?: (event: SwapEvent) => void;
  isVisible: boolean;
}

interface SwapApprovalModalProps {
  event: SwapEvent | null;
  onApprove: (reason: string) => void;
  onReject: (reason: string) => void;
  onClose: () => void;
}

function SwapApprovalModal({ event, onApprove, onReject, onClose }: SwapApprovalModalProps) {
  const [reason, setReason] = useState('');
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);

  if (!event) return null;

  const handleSubmit = () => {
    if (!decision || !reason.trim()) return;
    
    if (decision === 'approve') {
      onApprove(reason);
    } else {
      onReject(reason);
    }
    setReason('');
    setDecision(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Swap Approval Required
        </h3>
        
        <div className="space-y-4 mb-6">
          <div>
            <span className="text-sm text-gray-500">Type:</span>
            <span className="ml-2 font-medium">{event.type}</span>
          </div>
          <div>
            <span className="text-sm text-gray-500">Entity:</span>
            <span className="ml-2 font-medium">{event.source.id}</span>
          </div>
          <div>
            <span className="text-sm text-gray-500">Version:</span>
            <span className="ml-2">{event.source.version} → {event.target.version}</span>
          </div>
          <div>
            <span className="text-sm text-gray-500">Rationale:</span>
            <p className="mt-1 text-sm text-gray-800 bg-gray-50 p-2 rounded">
              {event.rationale}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Constitutional Check:</span>
            <span className={`ml-2 font-medium ${
              event.constitutional_check ? 'text-green-600' : 'text-red-600'
            }`}>
              {event.constitutional_check ? '✓ Passed' : '✗ Failed'}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex space-x-4">
            <button
              onClick={() => setDecision('approve')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                decision === 'approve'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              Approve
            </button>
            <button
              onClick={() => setDecision('reject')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                decision === 'reject'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              Reject
            </button>
          </div>
          
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter approval/rejection reason..."
            className="w-full p-3 border border-gray-300 rounded-md text-sm"
            rows={3}
          />
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!decision || !reason.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit {decision === 'approve' ? 'Approval' : 'Rejection'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SwapMonitorTab({ onSwapInitiated, onApprovalRequired, isVisible }: SwapMonitorTabProps) {
  const [systemStatus, setSystemStatus] = useState({
    kernels: [] as KernelStatus[],
    components: [] as ComponentStatus[],
    activeSwaps: [] as SwapEvent[],
    recentHistory: [] as SwapEvent[]
  });
  const [selectedKernel, setSelectedKernel] = useState<string | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [showManualSwap, setShowManualSwap] = useState(false);
  const [showHistoryExport, setShowHistoryExport] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<SwapEvent | null>(null);
  const [swapForm, setSwapForm] = useState({
    type: 'component' as 'kernel' | 'component',
    entityId: '',
    targetVersion: '',
    rationale: ''
  });

  // Update system status every 5 seconds
  useEffect(() => {
    if (!isVisible) return;

    const updateStatus = async () => {
      try {
        // Fetch real data from backend
        const response = await fetch('/api/swap/status');
        const result = await response.json();
        
        if (result.success) {
          setSystemStatus(result.data);
          
          // Check for pending approvals
          const pendingSwap = result.data.activeSwaps.find((swap: SwapEvent) => 
            swap.status === 'pending' && swap.initiator.type === 'user'
          );
          if (pendingSwap && !pendingApproval) {
            setPendingApproval(pendingSwap);
            onApprovalRequired?.(pendingSwap);
          }
        } else {
          console.error('Failed to fetch swap status:', result.error);
          // Fallback to mock data
          const status = swapMonitor.getSystemStatus();
          setSystemStatus(status);
        }
      } catch (error) {
        console.error('Error fetching swap status:', error);
        // Fallback to mock data
        const status = swapMonitor.getSystemStatus();
        setSystemStatus(status);
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000);
    return () => clearInterval(interval);
  }, [isVisible, pendingApproval, onApprovalRequired]);

  const handleManualSwap = async () => {
    if (!swapForm.entityId || !swapForm.targetVersion || !swapForm.rationale) {
      alert('Please fill in all fields');
      return;
    }

    try {
      // Submit to backend API
      const response = await fetch('/api/swap/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: swapForm.type,
          entityId: swapForm.entityId,
          targetVersion: swapForm.targetVersion,
          rationale: swapForm.rationale
        })
      });

      const result = await response.json();

      if (result.success) {
        onSwapInitiated?.(result.data.eventId);
        setShowManualSwap(false);
        setSwapForm({
          type: 'component',
          entityId: '',
          targetVersion: '',
          rationale: ''
        });
        alert(`Swap initiated successfully. Event ID: ${result.data.eventId}`);
      } else {
        alert('Failed to initiate swap: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to initiate swap:', error);
      alert('Failed to initiate swap: ' + (error as Error).message);
    }
  };

  const handleApproval = async (reason: string) => {
    if (!pendingApproval) return;
    
    try {
      // Submit approval to backend API
      const response = await fetch('/api/swap/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: pendingApproval.id,
          reason
        })
      });

      const result = await response.json();

      if (result.success) {
        setPendingApproval(null);
        alert(`Swap approved successfully. ${result.data.message}`);
      } else {
        alert('Failed to approve swap: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to approve swap:', error);
      alert('Failed to approve swap: ' + (error as Error).message);
    }
  };

  const handleRejection = async (reason: string) => {
    if (!pendingApproval) return;
    
    // In a real implementation, this would reject the swap
    console.log('Swap rejected:', reason);
    setPendingApproval(null);
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'swapping': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'maintenance': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSwapStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'approved': return 'text-blue-600 bg-blue-100';
      case 'active': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Swap Monitor</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowHistoryExport(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
          >
            Export History
          </button>
          <button
            onClick={() => setShowManualSwap(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Initiate Manual Swap
          </button>
        </div>
      </div>

      {/* Active Swaps Alert */}
      {systemStatus.activeSwaps.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Active Swaps ({systemStatus.activeSwaps.length})
          </h3>
          <div className="space-y-2">
            {systemStatus.activeSwaps.map(swap => (
              <div key={swap.id} className="flex items-center justify-between bg-white p-3 rounded border">
                <div>
                  <span className="font-medium">{swap.type}: {swap.source.id}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    {swap.source.version} → {swap.target.version}
                  </span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSwapStatusColor(swap.status)}`}>
                  {swap.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kernel Status */}
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Kernel Status</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {systemStatus.kernels.map(kernel => (
                <div
                  key={kernel.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedKernel === kernel.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedKernel(selectedKernel === kernel.id ? null : kernel.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{kernel.name}</h4>
                      <p className="text-sm text-gray-500">v{kernel.version} | {kernel.persona}</p>
                    </div>
                    <div className="flex space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(kernel.status)}`}>
                        {kernel.status}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getHealthColor(kernel.health)}`}>
                        {kernel.health}
                      </span>
                    </div>
                  </div>
                  
                  {selectedKernel === kernel.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Uptime:</span>
                          <span className="ml-1 font-medium">{kernel.metrics.uptime}%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Memory:</span>
                          <span className="ml-1 font-medium">{kernel.metrics.memoryUsage.toFixed(1)}%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Swaps:</span>
                          <span className="ml-1 font-medium">{kernel.metrics.swapCount}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Failure Rate:</span>
                          <span className="ml-1 font-medium">{kernel.metrics.failureRate}%</span>
                        </div>
                      </div>
                      {kernel.lastSwap && (
                        <div className="mt-2 text-sm text-gray-500">
                          Last Swap: {kernel.lastSwap.toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Component Status */}
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Component Status</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {systemStatus.components.map(component => (
                <div
                  key={component.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedComponent === component.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedComponent(selectedComponent === component.id ? null : component.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{component.name}</h4>
                      <p className="text-sm text-gray-500">v{component.version} | {component.persona}</p>
                    </div>
                    <div className="flex space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(component.status)}`}>
                        {component.status}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getHealthColor(component.health)}`}>
                        {component.health}
                      </span>
                    </div>
                  </div>
                  
                  {selectedComponent === component.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Uptime:</span>
                          <span className="ml-1 font-medium">{component.metrics.uptime}%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Swaps:</span>
                          <span className="ml-1 font-medium">{component.metrics.swapCount}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Failure Rate:</span>
                          <span className="ml-1 font-medium">{component.metrics.failureRate}%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Dependencies:</span>
                          <span className="ml-1 font-medium">{component.dependencies.length}</span>
                        </div>
                      </div>
                      {component.lastSwap && (
                        <div className="mt-2 text-sm text-gray-500">
                          Last Swap: {component.lastSwap.toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Swap History */}
      <div className="mt-6 bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Swap History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Initiator
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trace ID
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {systemStatus.recentHistory.map(event => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {event.timestamp.toLocaleTimeString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {event.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {event.source.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSwapStatusColor(event.status)}`}>
                      {event.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {event.initiator.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {event.traceId.substring(0, 12)}...
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Swap Modal */}
      {showManualSwap && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Initiate Manual Swap
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={swapForm.type}
                  onChange={(e) => setSwapForm(prev => ({ ...prev, type: e.target.value as 'kernel' | 'component' }))}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="component">Component</option>
                  <option value="kernel">Kernel</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entity ID
                </label>
                <select
                  value={swapForm.entityId}
                  onChange={(e) => setSwapForm(prev => ({ ...prev, entityId: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Select entity...</option>
                  {swapForm.type === 'kernel' 
                    ? systemStatus.kernels.map(k => (
                        <option key={k.id} value={k.id}>{k.name}</option>
                      ))
                    : systemStatus.components.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))
                  }
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Version
                </label>
                <input
                  type="text"
                  value={swapForm.targetVersion}
                  onChange={(e) => setSwapForm(prev => ({ ...prev, targetVersion: e.target.value }))}
                  placeholder="e.g., 1.1.0"
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rationale (Required)
                </label>
                <textarea
                  value={swapForm.rationale}
                  onChange={(e) => setSwapForm(prev => ({ ...prev, rationale: e.target.value }))}
                  placeholder="Explain the reason for this swap..."
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowManualSwap(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleManualSwap}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                Initiate Swap
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      <SwapApprovalModal
        event={pendingApproval}
        onApprove={handleApproval}
        onReject={handleRejection}
        onClose={() => setPendingApproval(null)}
      />

      {/* History Export Modal */}
      <SwapHistoryExport
        isVisible={showHistoryExport}
        onClose={() => setShowHistoryExport(false)}
      />
    </div>
  );
}