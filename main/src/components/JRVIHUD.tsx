import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import MemoryPulse from './MemoryPulse';
import PluginMonitor from './PluginMonitor';
import ChatUI from './ChatUI';
import DrawingBoard from './DrawingBoard';
import { Users, TrendingUp, FileText, RotateCcw, Cpu, Settings as SettingsIcon } from 'lucide-react';

interface JRVIHUDProps {
  className?: string;
}

export default function JRVIHUD({ className }: JRVIHUDProps) {
  const [activeTab, setActiveTab] = useState('agents');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'agents':
        return <AgentsPanel />;
      case 'memory-pulse':
        return <MemoryPulse />;
      case 'forecasts':
        return <ForecastsPanel />;
      case 'sandbox-logs':
        return <SandboxLogsPanel />;
      case 'replay-editor':
        return <ReplayEditorPanel />;
      case 'kernels':
        return <KernelsPanel />;
      case 'plugins':
        return <PluginMonitor />;
      case 'drawing-board':
        return <DrawingBoard />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return <AgentsPanel />;
    }
  };

  return (
    <div className={`h-screen flex flex-col bg-background ${className}`}>
      {/* Top Bar */}
      <TopBar
        brandName="JRVI"
        personaName="Advanced AI Assistant"
        voiceEnabled={voiceEnabled}
        onVoiceToggle={setVoiceEnabled}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Primary Panel */}
          <div className="flex-1 overflow-auto p-6">
            {renderTabContent()}
          </div>

          {/* Chat Panel - Always visible on the right */}
          <div className="w-80 border-l border-border flex flex-col">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-lg">JRVI Chat</h3>
              <p className="text-sm text-muted-foreground">AI Assistant</p>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatUI />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Individual Panel Components
function AgentsPanel() {
  const agents = [
    { id: 'jrvi-main', name: 'JRVI Main', status: 'active', tasks: 23, uptime: '99.8%' },
    { id: 'memory-agent', name: 'Memory Agent', status: 'active', tasks: 15, uptime: '98.2%' },
    { id: 'logic-agent', name: 'Logic Agent', status: 'busy', tasks: 8, uptime: '97.5%' },
    { id: 'security-agent', name: 'Security Agent', status: 'idle', tasks: 2, uptime: '99.1%' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="h-6 w-6 text-primary" />
          <div>
            <h3 className="text-xl font-semibold">Agent Management</h3>
            <p className="text-sm text-muted-foreground">Monitor and control AI agents</p>
          </div>
        </div>
        <Button>Add Agent</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map((agent) => (
          <Card key={agent.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{agent.name}</CardTitle>
                <div className={`w-3 h-3 rounded-full ${
                  agent.status === 'active' ? 'bg-green-500' :
                  agent.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-400'
                }`} />
              </div>
              <CardDescription>Agent ID: {agent.id}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className="text-sm font-medium capitalize">{agent.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Active Tasks</span>
                  <span className="text-sm font-medium">{agent.tasks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Uptime</span>
                  <span className="text-sm font-medium">{agent.uptime}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ForecastsPanel() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <TrendingUp className="h-6 w-6 text-primary" />
        <div>
          <h3 className="text-xl font-semibold">Logic Forecasts</h3>
          <p className="text-sm text-muted-foreground">Predictive analytics and trends</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Load Prediction</CardTitle>
            <CardDescription>Next 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-40 bg-muted rounded flex items-center justify-center">
              <span className="text-muted-foreground">Forecast chart placeholder</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Memory Usage Forecast</CardTitle>
            <CardDescription>Projected memory consumption</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-40 bg-muted rounded flex items-center justify-center">
              <span className="text-muted-foreground">Memory forecast placeholder</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SandboxLogsPanel() {
  const logs = [
    { time: '14:32:15', level: 'INFO', message: 'Sandbox environment initialized' },
    { time: '14:32:10', level: 'WARN', message: 'High memory usage detected' },
    { time: '14:31:58', level: 'ERROR', message: 'Plugin timeout in security scanner' },
    { time: '14:31:45', level: 'INFO', message: 'User session started' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <FileText className="h-6 w-6 text-primary" />
        <div>
          <h3 className="text-xl font-semibold">Sandbox Logs</h3>
          <p className="text-sm text-muted-foreground">System execution logs and monitoring</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Log Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {logs.map((log, index) => (
              <div key={index} className="flex items-center space-x-4 p-2 rounded hover:bg-muted">
                <span className="text-xs text-muted-foreground w-16">{log.time}</span>
                <span className={`text-xs px-2 py-1 rounded font-medium ${
                  log.level === 'ERROR' ? 'bg-red-100 text-red-800' :
                  log.level === 'WARN' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {log.level}
                </span>
                <span className="text-sm flex-1">{log.message}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReplayEditorPanel() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <RotateCcw className="h-6 w-6 text-primary" />
        <div>
          <h3 className="text-xl font-semibold">Replay Editor</h3>
          <p className="text-sm text-muted-foreground">Review and replay system interactions</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <RotateCcw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="text-lg font-medium mb-2">Replay Editor</h4>
            <p className="text-muted-foreground mb-4">
              Review and replay past system interactions for debugging and analysis
            </p>
            <Button>Load Session</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KernelsPanel() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Cpu className="h-6 w-6 text-primary" />
        <div>
          <h3 className="text-xl font-semibold">Kernel Management</h3>
          <p className="text-sm text-muted-foreground">System kernels and processing units</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <Cpu className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="text-lg font-medium mb-2">Kernel Monitor</h4>
            <p className="text-muted-foreground mb-4">
              Monitor and manage system processing kernels
            </p>
            <Button>View Kernels</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsPanel() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <SettingsIcon className="h-6 w-6 text-primary" />
        <div>
          <h3 className="text-xl font-semibold">System Settings</h3>
          <p className="text-sm text-muted-foreground">Configure JRVI system preferences</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <SettingsIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="text-lg font-medium mb-2">Settings Panel</h4>
            <p className="text-muted-foreground mb-4">
              Configure system settings and preferences
            </p>
            <Button>Open Settings</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}