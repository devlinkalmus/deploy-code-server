/**
 * Dashboard Alert Hook - UI alert system for vault integrity and security events
 * Provides React components and hooks for displaying security alerts
 */

import React, { useState, useEffect, useCallback, useContext, createContext } from 'react';
import { DashboardAlert } from './boot-wiring';

export interface AlertContextType {
  alerts: DashboardAlert[];
  unacknowledgedCount: number;
  addAlert: (alert: Omit<DashboardAlert, 'id' | 'timestamp' | 'acknowledged'>) => void;
  acknowledgeAlert: (alertId: string) => void;
  clearAlert: (alertId: string) => void;
  clearAllAlerts: () => void;
}

// Alert Context
const AlertContext = createContext<AlertContextType | null>(null);

// Alert Provider Component
export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);

  const addAlert = useCallback((alertData: Omit<DashboardAlert, 'id' | 'timestamp' | 'acknowledged'>) => {
    const alert: DashboardAlert = {
      id: generateAlertId(),
      timestamp: new Date(),
      acknowledged: false,
      ...alertData
    };

    setAlerts(prev => [alert, ...prev]);
    
    // Auto-acknowledge info alerts after 5 seconds
    if (alert.severity === 'info') {
      setTimeout(() => {
        acknowledgeAlert(alert.id);
      }, 5000);
    }
  }, []);

  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  }, []);

  const clearAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);

  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const unacknowledgedCount = alerts.filter(alert => !alert.acknowledged).length;

  const contextValue: AlertContextType = {
    alerts,
    unacknowledgedCount,
    addAlert,
    acknowledgeAlert,
    clearAlert,
    clearAllAlerts
  };

  return (
    <AlertContext.Provider value={contextValue}>
      {children}
    </AlertContext.Provider>
  );
};

// Hook to use alerts
export const useAlerts = (): AlertContextType => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlerts must be used within an AlertProvider');
  }
  return context;
};

// Alert Badge Component
export const AlertBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { unacknowledgedCount } = useAlerts();

  if (unacknowledgedCount === 0) return null;

  return (
    <span className={`inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full ${className}`}>
      {unacknowledgedCount}
    </span>
  );
};

// Alert Icon Component
export const AlertIcon: React.FC<{ type: DashboardAlert['type']; severity: DashboardAlert['severity']; className?: string }> = ({ 
  type, 
  severity, 
  className = '' 
}) => {
  const getIcon = () => {
    switch (type) {
      case 'vault_integrity':
        return '🔒';
      case 'boot_failure':
        return '⚠️';
      case 'security_warning':
        return '🛡️';
      case 'system_error':
        return '🔧';
      default:
        return '📢';
    }
  };

  const getSeverityColor = () => {
    switch (severity) {
      case 'critical':
        return 'text-red-500';
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-500';
      case 'info':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <span className={`text-lg ${getSeverityColor()} ${className}`}>
      {getIcon()}
    </span>
  );
};

// Alert Item Component
export const AlertItem: React.FC<{ 
  alert: DashboardAlert; 
  onAcknowledge?: (alertId: string) => void;
  onClear?: (alertId: string) => void;
  compact?: boolean;
}> = ({ alert, onAcknowledge, onClear, compact = false }) => {
  const getSeverityStyles = () => {
    switch (alert.severity) {
      case 'critical':
        return 'border-l-red-500 bg-red-50 text-red-800';
      case 'error':
        return 'border-l-red-400 bg-red-50 text-red-700';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50 text-yellow-800';
      case 'info':
        return 'border-l-blue-500 bg-blue-50 text-blue-800';
      default:
        return 'border-l-gray-500 bg-gray-50 text-gray-800';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString();
  };

  if (compact) {
    return (
      <div className={`border-l-4 p-3 mb-2 ${getSeverityStyles()} ${alert.acknowledged ? 'opacity-60' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertIcon type={alert.type} severity={alert.severity} />
            <span className="font-medium text-sm">{alert.title}</span>
            <span className="text-xs opacity-75">{formatTime(alert.timestamp)}</span>
          </div>
          {!alert.acknowledged && onAcknowledge && (
            <button
              onClick={() => onAcknowledge(alert.id)}
              className="text-xs px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              ✓
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`border-l-4 p-4 mb-4 rounded-r-lg ${getSeverityStyles()} ${alert.acknowledged ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <AlertIcon type={alert.type} severity={alert.severity} />
            <h4 className="font-semibold">{alert.title}</h4>
            <span className="text-xs opacity-75">{formatTime(alert.timestamp)}</span>
          </div>
          
          <p className="text-sm mb-2">{alert.message}</p>
          
          <div className="text-xs opacity-75">
            <span>Source: {alert.source}</span>
            {alert.acknowledged && <span className="ml-2">• Acknowledged</span>}
          </div>

          {alert.details && (
            <details className="mt-2">
              <summary className="text-xs cursor-pointer hover:underline">Show Details</summary>
              <pre className="text-xs mt-1 p-2 bg-white bg-opacity-50 rounded overflow-x-auto">
                {JSON.stringify(alert.details, null, 2)}
              </pre>
            </details>
          )}
        </div>

        <div className="flex space-x-2 ml-4">
          {!alert.acknowledged && onAcknowledge && (
            <button
              onClick={() => onAcknowledge(alert.id)}
              className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Acknowledge
            </button>
          )}
          {onClear && (
            <button
              onClick={() => onClear(alert.id)}
              className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 text-red-600"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Alert Panel Component
export const AlertPanel: React.FC<{ 
  maxAlerts?: number;
  showAcknowledged?: boolean;
  compact?: boolean;
  className?: string;
}> = ({ 
  maxAlerts = 10, 
  showAcknowledged = true, 
  compact = false,
  className = '' 
}) => {
  const { alerts, acknowledgeAlert, clearAlert } = useAlerts();

  const filteredAlerts = alerts
    .filter(alert => showAcknowledged || !alert.acknowledged)
    .slice(0, maxAlerts);

  if (filteredAlerts.length === 0) {
    return (
      <div className={`p-4 text-center text-gray-500 ${className}`}>
        <div className="text-2xl mb-2">✅</div>
        <p>No alerts</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {filteredAlerts.map(alert => (
        <AlertItem
          key={alert.id}
          alert={alert}
          onAcknowledge={acknowledgeAlert}
          onClear={clearAlert}
          compact={compact}
        />
      ))}
    </div>
  );
};

// Floating Alert Component
export const FloatingAlert: React.FC = () => {
  const { alerts, acknowledgeAlert } = useAlerts();
  const [visible, setVisible] = useState(false);

  const criticalAlerts = alerts.filter(alert => 
    !alert.acknowledged && (alert.severity === 'critical' || alert.severity === 'error')
  );

  useEffect(() => {
    setVisible(criticalAlerts.length > 0);
  }, [criticalAlerts.length]);

  if (!visible || criticalAlerts.length === 0) return null;

  const latestAlert = criticalAlerts[0];

  return (
    <div className="fixed top-4 right-4 z-50 animate-pulse">
      <div className="bg-red-600 text-white p-4 rounded-lg shadow-lg max-w-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <AlertIcon type={latestAlert.type} severity={latestAlert.severity} className="text-white" />
              <h4 className="font-semibold text-sm">{latestAlert.title}</h4>
            </div>
            <p className="text-sm opacity-90">{latestAlert.message}</p>
            {criticalAlerts.length > 1 && (
              <p className="text-xs opacity-75 mt-1">
                +{criticalAlerts.length - 1} more alerts
              </p>
            )}
          </div>
          <button
            onClick={() => {
              acknowledgeAlert(latestAlert.id);
              if (criticalAlerts.length === 1) {
                setVisible(false);
              }
            }}
            className="ml-2 text-white hover:bg-red-700 p-1 rounded"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

// Alert Dashboard Widget
export const AlertDashboardWidget: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { alerts, unacknowledgedCount } = useAlerts();
  
  const stats = {
    total: alerts.length,
    unacknowledged: unacknowledgedCount,
    critical: alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length,
    vault: alerts.filter(a => a.type === 'vault_integrity' && !a.acknowledged).length
  };

  return (
    <div className={`bg-gray-800 p-6 rounded-lg ${className}`}>
      <h3 className="text-xl font-semibold text-white mb-4">Security Alerts</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">{stats.total}</div>
          <div className="text-sm text-gray-400">Total Alerts</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-400">{stats.unacknowledged}</div>
          <div className="text-sm text-gray-400">Unacknowledged</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-400">{stats.critical}</div>
          <div className="text-sm text-gray-400">Critical</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-400">{stats.vault}</div>
          <div className="text-sm text-gray-400">Vault Issues</div>
        </div>
      </div>

      <AlertPanel maxAlerts={5} compact={true} showAcknowledged={false} />
    </div>
  );
};

// Hook for vault-specific alerts
export const useVaultAlerts = () => {
  const { addAlert } = useAlerts();

  const triggerVaultIntegrityAlert = useCallback((details: any) => {
    addAlert({
      type: 'vault_integrity',
      severity: 'critical',
      title: 'Vault Integrity Compromised',
      message: `Vault integrity check failed. ${details.corruptedEntries?.length || 0} entries corrupted.`,
      source: 'vault-monitor',
      details
    });
  }, [addAlert]);

  const triggerVaultAccessAlert = useCallback((vaultKey: string, source: string) => {
    addAlert({
      type: 'vault_integrity',
      severity: 'warning',
      title: 'Unauthorized Vault Access',
      message: `Unauthorized access attempt to vault key: ${vaultKey}`,
      source: 'vault-monitor',
      details: { vaultKey, source, timestamp: new Date() }
    });
  }, [addAlert]);

  return {
    triggerVaultIntegrityAlert,
    triggerVaultAccessAlert
  };
};

// Utility function to generate alert ID
function generateAlertId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Export hook for integrating with boot wiring
export const useBootWiringIntegration = () => {
  const { addAlert } = useAlerts();

  useEffect(() => {
    // Integrate with boot wiring system if available
    if (typeof window !== 'undefined' && (window as any).bootWiring) {
      const bootWiring = (window as any).bootWiring;
      
      bootWiring.onDashboardAlert((alert: DashboardAlert) => {
        addAlert({
          type: alert.type,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          source: alert.source,
          details: alert.details
        });
      });
    }
  }, [addAlert]);
};

export default {
  AlertProvider,
  useAlerts,
  AlertBadge,
  AlertIcon,
  AlertItem,
  AlertPanel,
  FloatingAlert,
  AlertDashboardWidget,
  useVaultAlerts,
  useBootWiringIntegration
};