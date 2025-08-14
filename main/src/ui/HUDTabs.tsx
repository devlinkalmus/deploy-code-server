/**
 * HUD Tabs Component

 */

import React, { useState, useEffect } from 'react';
import { personaRouter } from '../persona/router';
import { cltmCore } from '../memory/cltm_core';
import { ragCore } from '../rag/rag_core';
import { mcpRegistry } from '../mcps/registry';
import MCPManagement from './MCPManagement';


interface HUDTabsProps {
  onBrandChange?: (brandId: string) => void;
  onAuditEvent?: (event: AuditEvent) => void;

  showEnforcementStatus?: boolean;
  showForecastControls?: boolean;
  compactMode?: boolean;
}

interface AuditEvent {
  timestamp: Date;
  action: string;
  brandId: string;
  userId?: string;
  details: any;
}

interface BrandStatus {
  id: string;
  name: string;
  enabled: boolean;
  active: boolean;
  health: 'healthy' | 'warning' | 'error';
  lastActivity?: Date;
}

interface SystemMetrics {
  memoryUsage: number;
  ragQueries: number;
  auditEvents: number;
  activeBrands: number;

}

export default function HUDTabs({ 
  onBrandChange, 
  onAuditEvent,

  showEnforcementStatus = true,
  showForecastControls = true,
  compactMode = false 
}: HUDTabsProps) {
  const [currentBrand, setCurrentBrand] = useState('JRVI');
  const [brandStatuses, setBrandStatuses] = useState<BrandStatus[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    memoryUsage: 0,
    ragQueries: 0,
    auditEvents: 0,


  useEffect(() => {
    initializeHUD();
    const interval = setInterval(updateMetrics, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const initializeHUD = async () => {
    try {
      // Initialize brand statuses
      const availableBrands = personaRouter.getAvailableBrands();
      const statuses = availableBrands.map(brand => ({
        id: brand.id,
        name: brand.name,
        enabled: brand.enabled,
        active: brand.id === currentBrand,
        health: 'healthy' as const,
        lastActivity: new Date()
      }));

      setBrandStatuses(statuses);
      updateMetrics();
    } catch (error) {
      console.error('Failed to initialize HUD:', error);
      setEnforcementStatus('warning');
    }
  };

  const updateMetrics = async () => {
    try {
      // Get memory metrics
      const memoryStats = cltmCore.getMemoryStats();
      
      // Get RAG metrics
      const ragMetrics = ragCore.getPerformanceMetrics();
      
      // Get audit trail
      const audit = personaRouter.getAuditTrail();

      // Get token kernel stats
      const tokenStats = tokenKernel.getStats();

      // Get enforcement stats
      const enforcementStats = enforcementCore.getEnforcementStats();
      
      // Get device metrics
      const deviceStatus = deviceOrchestrator.getOrchestrationStatus();
      const toneStatus = deviceToneMonitor.getMonitoringStatus();
      
      // Get swap status
      const swapStatus = swapMonitor.getSystemStatus();
      
      // Get MCP metrics
      const mcpStats = mcpRegistry.getRegistryStats();
      
      setSystemMetrics({
        memoryUsage: memoryStats.totalMemories,
        ragQueries: ragMetrics.totalQueries,
        auditEvents: audit.length,
        activeBrands: brandStatuses.filter(b => b.enabled).length,

      });

      setAuditTrail(audit.slice(-10).map(entry => ({
        timestamp: entry.timestamp,
        action: entry.action,
        brandId: entry.brand,
        details: entry.context
      })));


      }

    } catch (error) {
      console.error('Failed to update metrics:', error);
      setEnforcementStatus('warning');
    }
  };

  const handleSwapInitiated = (eventId: string) => {
    console.log('Swap initiated:', eventId);
    // Update metrics to reflect new swap
    updateMetrics();
  };

  const handleSwapApprovalRequired = (event: SwapEvent) => {
    onSwapEvent?.(event);
    // Add to notifications if not already present
    if (!swapNotifications.find(n => n.id === event.id)) {
      setSwapNotifications(prev => [...prev, event]);
    }
  };

  const handleBrandSwitch = (brandId: string) => {
    try {
      const success = personaRouter.switchBrand(brandId);
      
      if (success) {
        setCurrentBrand(brandId);
        setBrandStatuses(prev => 
          prev.map(brand => ({
            ...brand,
            active: brand.id === brandId,
            lastActivity: brand.id === brandId ? new Date() : brand.lastActivity
          }))
        );

        // Notify parent component
        onBrandChange?.(brandId);

        // Log audit event
        const auditEvent: AuditEvent = {
          timestamp: new Date(),
          action: 'brand_switch',
          brandId,
          details: { previousBrand: currentBrand, success: true }
        };
        
        onAuditEvent?.(auditEvent);
        logAuditEvent(auditEvent);
      }
    } catch (error) {
      console.error('Brand switch failed:', error);
      setEnforcementStatus('warning');
    }
  };

  const handleBrandToggle = (brandId: string, enabled: boolean) => {
    try {
      personaRouter.setBrandEnabled(brandId, enabled);
      
      setBrandStatuses(prev =>
        prev.map(brand =>
          brand.id === brandId 
            ? { ...brand, enabled, health: enabled ? 'healthy' : 'warning' }
            : brand
        )
      );

      const auditEvent: AuditEvent = {
        timestamp: new Date(),
        action: enabled ? 'brand_enabled' : 'brand_disabled',
        brandId,
        details: { enabled }
      };

      onAuditEvent?.(auditEvent);
      logAuditEvent(auditEvent);

    } catch (error) {
      console.error('Brand toggle failed:', error);
      setEnforcementStatus('warning');
    }
  };

  const handleForecastControlChange = (control: string, value: any) => {
    setForecastControls(prev => ({
      ...prev,
      [control]: value
    }));

    // Log the change
    const auditEvent: AuditEvent = {
      timestamp: new Date(),
      action: 'forecast_control_changed',
      brandId: currentBrand,
      details: { control, value, previousValue: forecastControls[control as keyof typeof forecastControls] }
    };

    onAuditEvent?.(auditEvent);
    logAuditEvent(auditEvent);
  };

  const generateQuickForecast = async () => {
    try {
      const testInput = {
        message: "Quick forecast for current system state and performance trends"
      };
      
      // This would use the forecast engine
      const forecast = await forecastEngine.generateForecast(testInput, []);
      
      if (forecast) {
        onForecastUpdate?.(forecast);
        
        // Update forecast metrics
        setForecastMetrics(prev => ({
          ...prev,
          lastConfidence: forecast.confidence,
          averageImpact: forecast.expectedImpact,
          totalForecasts: prev.totalForecasts + 1
        }));

        const auditEvent: AuditEvent = {
          timestamp: new Date(),
          action: 'quick_forecast_generated',
          brandId: currentBrand,
          details: { 
            confidence: forecast.confidence,
            impact: forecast.expectedImpact,
            riskFactors: forecast.riskFactors.length
          }
        };

        onAuditEvent?.(auditEvent);
        logAuditEvent(auditEvent);
      }
    } catch (error) {
      console.error('Quick forecast failed:', error);
    }
  };

  const logAuditEvent = (event: AuditEvent) => {
    setAuditTrail(prev => [event, ...prev.slice(0, 9)]);
  };

  const getBrandStatusColor = (brand: BrandStatus) => {
    if (!brand.enabled) return 'bg-gray-400';
    if (brand.active) return 'bg-blue-500';
    switch (brand.health) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getEnforcementStatusColor = () => {
    switch (enforcementStatus) {
      case 'active': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'inactive': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (compactMode) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-white rounded-lg shadow-lg border p-2">
          <div className="flex items-center space-x-2">
            {/* Compact brand indicators */}
            <div className="flex space-x-1">
              {brandStatuses.map(brand => (
                <button
                  key={brand.id}
                  onClick={() => handleBrandSwitch(brand.id)}
                  className={`w-3 h-3 rounded-full ${getBrandStatusColor(brand)} ${
                    brand.active ? 'ring-2 ring-blue-300' : ''
                  }`}
                  title={`${brand.name} - ${brand.enabled ? 'Enabled' : 'Disabled'}`}
                />
              ))}
            </div>
            
            {/* Enforcement status indicator */}
            {showEnforcementStatus && (
              <div className={`w-2 h-2 rounded-full ${
                enforcementStatus === 'active' ? 'bg-green-500' : 
                enforcementStatus === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
              }`} title={`Enforcement: ${enforcementStatus}`} />
            )}


          </div>
        </div>
        
        {/* Compact Plugin Panel */}
        {showPluginPanel && (
          <div className="absolute top-12 right-0 w-80 bg-white rounded-lg shadow-lg border z-10">
            <PluginManagementTab 
              onPluginToggle={(pluginId, enabled) => {
                onAuditEvent?.({
                  timestamp: new Date(),
                  action: enabled ? 'plugin_enabled' : 'plugin_disabled',
                  brandId: currentBrand,
                  details: { pluginId, enabled }
                });
              }}
              onAuditEvent={onAuditEvent}
              refreshInterval={10000}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Tab Navigation */}
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1 text-sm font-medium rounded-md ${
                activeTab === 'overview'
                  ? 'bg-blue-100 text-blue-800'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('plugins')}
              className={`px-3 py-1 text-sm font-medium rounded-md ${
                activeTab === 'plugins'
                  ? 'bg-blue-100 text-blue-800'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Plugin Management
            </button>
          </div>
          
          {/* Current Brand Display */}
          <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 rounded-md border border-blue-200">
            <span className="text-xs text-blue-600 font-medium">ACTIVE:</span>
            <span className="text-sm font-bold text-blue-800">{currentBrand}</span>
          </div>
        </div>


                    </div>
                  )}
                </div>

                {/* Audit Trail */}
                <div className="relative">
                  <button
                    onClick={() => setShowAuditPanel(!showAuditPanel)}
                    className="flex items-center space-x-2 px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-sm"
                  >
                    <span>📋</span>
                    <span className="hidden sm:inline">Audit</span>
                    {auditTrail.length > 0 && (
                      <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {auditTrail.length}
                      </span>
                    )}
                  </button>
                  
                  {showAuditPanel && (
                    <div className="absolute right-0 top-8 w-80 bg-white rounded-lg shadow-lg border p-4 z-10 max-h-64 overflow-y-auto">
                      <h4 className="font-medium text-gray-900 mb-3">Recent Audit Events</h4>
                      <div className="space-y-2">
                        {auditTrail.length > 0 ? (
                          auditTrail.map((event, index) => (
                            <div key={index} className="text-xs border-b border-gray-100 pb-2">
                              <div className="flex justify-between items-start">
                                <span className="font-medium text-gray-800">{event.action}</span>
                                <span className="text-gray-500">
                                  {event.timestamp.toLocaleTimeString()}
                                </span>
                              </div>
                              <div className="text-gray-600 mt-1">
                                Brand: <span className="font-medium">{event.brandId}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-500 text-center py-4">
                            No recent audit events
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Enforcement Status */}
                {showEnforcementStatus && (
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <div className={`w-2 h-2 rounded-full ${
                        enforcementStatus === 'active' ? 'bg-green-500' : 
                        enforcementStatus === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      <span className={`text-xs font-medium ${getEnforcementStatusColor()}`}>
                        {enforcementStatus.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">Enforcement</span>
                  </div>
                )}
              </div>
            </div>

            {/* Extended Information Bar (when panels are open) */}
            {(showAuditPanel || showMetricsPanel) && (
              <div className="border-t border-gray-100 py-2 mt-3">
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>
                    Last Updated: {new Date().toLocaleTimeString()}
                  </span>
                  <span>
                    System: Operational | Memory: {systemMetrics.memoryUsage} entries | 
                    Enforcement: {enforcementStatus}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}



          </div>
        )}
      </div>

      {/* Click outside to close panels */}

        <div 
          className="fixed inset-0 z-0" 
          onClick={() => {
            setShowAuditPanel(false);
            setShowMetricsPanel(false);

        </div>
      )}
    </div>
  );
}