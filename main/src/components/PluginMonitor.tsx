import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Puzzle, CheckCircle, AlertTriangle, XCircle, Settings, RefreshCw } from 'lucide-react';

interface Plugin {
  id: string;
  name: string;
  version: string;
  status: 'healthy' | 'warning' | 'error' | 'disabled';
  enabled: boolean;
  fallbackEnabled: boolean;
  description: string;
  lastUpdate: Date;
  errorCount: number;
  responseTime: number;
}

interface PluginMonitorProps {
  plugins?: Plugin[];
  onPluginToggle?: (pluginId: string, enabled: boolean) => void;
  onFallbackToggle?: (pluginId: string, enabled: boolean) => void;
}

export default function PluginMonitor({ 
  plugins: externalPlugins, 
  onPluginToggle, 
  onFallbackToggle 
}: PluginMonitorProps) {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock plugins if not provided
  const defaultPlugins: Plugin[] = [
    {
      id: 'memory-core',
      name: 'Memory Core',
      version: '2.1.3',
      status: 'healthy',
      enabled: true,
      fallbackEnabled: true,
      description: 'Core memory management system',
      lastUpdate: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      errorCount: 0,
      responseTime: 45
    },
    {
      id: 'logic-engine',
      name: 'Logic Engine',
      version: '1.8.2',
      status: 'healthy',
      enabled: true,
      fallbackEnabled: false,
      description: 'Advanced reasoning and logic processing',
      lastUpdate: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
      errorCount: 2,
      responseTime: 120
    },
    {
      id: 'nlp-processor',
      name: 'NLP Processor',
      version: '3.0.1',
      status: 'warning',
      enabled: true,
      fallbackEnabled: true,
      description: 'Natural language processing and understanding',
      lastUpdate: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
      errorCount: 8,
      responseTime: 230
    },
    {
      id: 'security-scanner',
      name: 'Security Scanner',
      version: '1.2.0',
      status: 'error',
      enabled: false,
      fallbackEnabled: true,
      description: 'Content security and threat detection',
      lastUpdate: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      errorCount: 15,
      responseTime: 500
    },
    {
      id: 'rag-system',
      name: 'RAG System',
      version: '2.3.1',
      status: 'healthy',
      enabled: true,
      fallbackEnabled: false,
      description: 'Retrieval-augmented generation system',
      lastUpdate: new Date(Date.now() - 1000 * 60 * 2), // 2 minutes ago
      errorCount: 1,
      responseTime: 89
    }
  ];

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setPlugins(externalPlugins || defaultPlugins);
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [externalPlugins]);

  const getStatusIcon = (status: Plugin['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'disabled':
        return <XCircle className="h-4 w-4 text-gray-400" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: Plugin['status']) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'disabled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePluginToggle = (plugin: Plugin) => {
    const newEnabled = !plugin.enabled;
    setPlugins(prev => 
      prev.map(p => 
        p.id === plugin.id 
          ? { ...p, enabled: newEnabled, status: newEnabled ? 'healthy' : 'disabled' }
          : p
      )
    );
    onPluginToggle?.(plugin.id, newEnabled);
  };

  const handleFallbackToggle = (plugin: Plugin) => {
    const newFallbackEnabled = !plugin.fallbackEnabled;
    setPlugins(prev => 
      prev.map(p => 
        p.id === plugin.id 
          ? { ...p, fallbackEnabled: newFallbackEnabled }
          : p
      )
    );
    onFallbackToggle?.(plugin.id, newFallbackEnabled);
  };

  const formatLastUpdate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const healthyCount = plugins.filter(p => p.status === 'healthy' && p.enabled).length;
  const totalEnabled = plugins.filter(p => p.enabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Puzzle className="h-6 w-6 text-primary" />
          <div>
            <h3 className="text-xl font-semibold">Plugin Monitor</h3>
            <p className="text-sm text-muted-foreground">
              System plugins health and configuration
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">
            {healthyCount}/{totalEnabled} Healthy
          </Badge>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Plugin Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {plugins.map((plugin) => (
          <Card key={plugin.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(plugin.status)}
                  <div>
                    <CardTitle className="text-lg">{plugin.name}</CardTitle>
                    <CardDescription>{plugin.description}</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={plugin.enabled}
                  onCheckedChange={() => handlePluginToggle(plugin)}
                />
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                {/* Status and Version */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(plugin.status)}>
                      {plugin.status.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-muted-foreground">v{plugin.version}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatLastUpdate(plugin.lastUpdate)}
                  </span>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Response Time</span>
                    <div className="font-medium">{plugin.responseTime}ms</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Error Count</span>
                    <div className="font-medium text-red-600">{plugin.errorCount}</div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={plugin.fallbackEnabled}
                      onCheckedChange={() => handleFallbackToggle(plugin)}
                      disabled={!plugin.enabled}
                    />
                    <span className="text-sm text-muted-foreground">Fallback Mode</span>
                  </div>
                  <Button variant="ghost" size="sm" disabled={!plugin.enabled}>
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{healthyCount}</div>
            <div className="text-sm text-muted-foreground">Healthy Plugins</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {plugins.filter(p => p.status === 'warning').length}
            </div>
            <div className="text-sm text-muted-foreground">Warning Status</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {plugins.filter(p => p.status === 'error').length}
            </div>
            <div className="text-sm text-muted-foreground">Error Status</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {plugins.filter(p => p.fallbackEnabled).length}
            </div>
            <div className="text-sm text-muted-foreground">Fallback Enabled</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}